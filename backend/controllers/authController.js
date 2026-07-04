const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendMail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_secret_key';
const JWT_EXPIRES = '24h';

const generateNumericOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Synchronized Routing Map to cleanly resolve dashboards matching frontend specifications
const DASHBOARD_PATHS = {
    SUPER_ADMIN: '/dashboard/super-admin',
    ADMIN: '/dashboard/admin',
    VENDOR: '/dashboard/vendor',
    COLLEGE: '/dashboard/college',
    MENTOR: '/dashboard/mentor',
    STUDENT: '/dashboard/student'
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/colleges (Public — used to populate Register.jsx dropdown)
// ─────────────────────────────────────────────────────────────
exports.listActiveColleges = async (req, res) => {
    try {
        const [colleges] = await db.execute(
            "SELECT id, college_name, college_code FROM colleges ORDER BY college_name ASC"
        );
        return res.status(200).json({ colleges });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch colleges.', error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/departments?college_id= (Public — used to populate Register.jsx
// department dropdown once a college has been selected)
// ─────────────────────────────────────────────────────────────
exports.listDepartments = async (req, res) => {
    const { college_id } = req.query;

    if (!college_id || isNaN(college_id)) {
        return res.status(400).json({ message: 'A valid college_id query parameter is required.' });
    }

    try {
        const [departments] = await db.execute(
            'SELECT id, college_id, name FROM departments WHERE college_id = ? ORDER BY name ASC',
            [parseInt(college_id)]
        );
        return res.status(200).json({ departments });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch departments.', error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// Shared OTP dispatch helper — used by both Student and Non-Student
// registration so the verification behaviour is identical for both.
// ─────────────────────────────────────────────────────────────
const dispatchRegistrationOtp = async (cleanEmail, displayName) => {
    const otp = generateNumericOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await db.execute(
        'INSERT INTO otp_verification (email, otp, purpose, expiry) VALUES (?, ?, "REGISTER", ?)',
        [cleanEmail, otp, expiry]
    );

    try {
        await sendMail(
            cleanEmail,
            "Verify your LMS Account",
            `<p>Hello ${displayName},</p><h3>Your Verification OTP code is: ${otp}</h3><p>This code expires in 5 minutes.</p>`
        );
    } catch (mailError) {
        console.log(`[Email Service Offline fallback] Verification OTP Code: ${otp}`);
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register (Unified Registration Dispatcher)
// Branches on req.body.role, which Register.jsx sends as
// 'STUDENT' | 'NON_STUDENT'. Kept as a thin dispatcher so the
// login/OTP/dashboard behaviour downstream is unaffected.
// ─────────────────────────────────────────────────────────────
exports.registerUser = async (req, res) => {
    const role = (req.body.role || '').toUpperCase();

    if (role === 'NON_STUDENT') {
        return exports.registerNonStudent(req, res);
    }

    // Default / STUDENT path preserves existing behaviour
    return exports.registerStudent(req, res);
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register (Student Self-Registration)
//
// FIXED: field names now match what Register.jsx actually sends
// (full_name, mobile, college_id, degree, department_id,
// year_of_study, semester, roll_no) instead of the old
// (studentName, college, course, year, semester) shape.
//
// NOTE: The legacy course_id / year_id / semester_id mapping logic
// below is left exactly as it was — untouched — per explicit
// instruction, since course_id is used elsewhere in the app and
// must not be reassigned without a separate review. It has simply
// been rewired to read from the corrected incoming field names so
// it no longer silently receives undefined values.
//
// ADDED: basic required-field validation up front. Previously, a
// missing/empty email or password would throw inside email.trim()
// or bcrypt.hash() and surface as an opaque 500. Now it returns a
// clean 400 with a helpful message instead of crashing.
// ─────────────────────────────────────────────────────────────
exports.registerStudent = async (req, res) => {
    const {
        email,
        password,
        full_name,
        mobile,
        college_id,
        department_id,
        degree,
        year_of_study,
        semester,
        roll_no
    } = req.body;

    if (!email || !password || !full_name || !mobile) {
        return res.status(400).json({ message: 'Email, password, full name and mobile are required.' });
    }

    try {
        const cleanEmail = email.trim().toLowerCase();
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length) {
            return res.status(400).json({ message: 'This email address is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const username = cleanEmail.split('@')[0];

        const [userResult] = await db.execute(
            'INSERT INTO users (username, email, password, role, is_verified, status) VALUES (?, ?, ?, "STUDENT", 0, "PENDING")',
            [username, cleanEmail, hashedPassword]
        );
        const userId = userResult.insertId;

        // ── LEGACY MAPPING LOGIC (UNTOUCHED) ──────────────────────────
        // Preserved exactly as it existed before, only re-sourced from
        // the corrected field names above (college_id, degree,
        // year_of_study, semester) instead of the old (college, course,
        // year, semester) names, since those old names no longer exist
        // in the incoming payload.
        const mappedCollegeId = isNaN(college_id) ? 1 : parseInt(college_id);
        const mappedYearId = isNaN(year_of_study) ? 1 : parseInt(year_of_study);
        const mappedSemesterId = isNaN(semester) ? 1 : parseInt(semester);

        let mappedCourseId = 1;
        if (degree === 'mca') mappedCourseId = 1;
        if (degree === 'be') mappedCourseId = 2;
        // ── END LEGACY MAPPING LOGIC ───────────────────────────────────

        const mappedDepartmentId = department_id && !isNaN(department_id)
            ? parseInt(department_id)
            : null;

        await db.execute(
            'INSERT INTO students (user_id, roll_no, student_name, mobile, college_profile_id, course_id, year_id, semester_id, degree, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                userId,
                roll_no || null,
                full_name,
                mobile,
                mappedCollegeId,
                mappedCourseId,
                mappedYearId,
                mappedSemesterId,
                degree || null,
                mappedDepartmentId
            ]
        );

        await dispatchRegistrationOtp(cleanEmail, full_name);

        return res.status(201).json({ message: 'Registration initiated! An OTP code has been sent to your email.' });
    } catch (err) {
        console.error("--- REGISTRATION CRASH LOG ---", err);
        return res.status(500).json({ message: `Server Error: ${err.message}` });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register (Non-Student Self-Registration)
// New path — supports Faculty / Staff / Alumni / Guest / Researcher /
// Industry Professional / Public User etc. Writes only the fields
// that exist on non_students: full_name, mobile.
//
// ADDED: required-field validation up front, matching registerStudent,
// so a missing email/password/full_name/mobile returns a clean 400
// instead of throwing inside email.trim() or bcrypt.hash() and
// surfacing as an opaque 500 / "Bind parameters must not contain
// undefined" error.
// ─────────────────────────────────────────────────────────────
exports.registerNonStudent = async (req, res) => {
    const { email, password, full_name, mobile } = req.body;

    if (!email || !password || !full_name || !mobile) {
        return res.status(400).json({ message: 'Email, password, full name and mobile are required.' });
    }

    try {
        const cleanEmail = email.trim().toLowerCase();
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length) {
            return res.status(400).json({ message: 'This email address is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const username = cleanEmail.split('@')[0];

        const [userResult] = await db.execute(
            'INSERT INTO users (username, email, password, role, is_verified, status) VALUES (?, ?, ?, "NON_STUDENT", 0, "PENDING")',
            [username, cleanEmail, hashedPassword]
        );
        const userId = userResult.insertId;

        await db.execute(
            'INSERT INTO non_students (user_id, full_name, mobile) VALUES (?, ?, ?)',
            [userId, full_name, mobile]
        );

        await dispatchRegistrationOtp(cleanEmail, full_name);

        return res.status(201).json({ message: 'Registration initiated! An OTP code has been sent to your email.' });
    } catch (err) {
        console.error("--- NON-STUDENT REGISTRATION CRASH LOG ---", err);
        return res.status(500).json({ message: `Server Error: ${err.message}` });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp (OTP Code Verification Handler)
// ─────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
    const { email, otp, purpose } = req.body;

    if (!email || !otp || !purpose) {
        return res.status(400).json({ message: 'Email, OTP and purpose are required.' });
    }

    try {
        const cleanEmail = email.trim().toLowerCase();
        const [records] = await db.execute(
            'SELECT * FROM otp_verification WHERE email = ? AND otp = ? AND purpose = ? AND is_used = 0 AND expiry > NOW()',
            [cleanEmail, otp, purpose]
        );

        if (!records.length) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        await db.execute('UPDATE otp_verification SET is_used = 1 WHERE id = ?', [records[0].id]);

        if (purpose === 'REGISTER') {
            await db.execute('UPDATE users SET is_verified = 1, status = "ACTIVE" WHERE email = ?', [cleanEmail]);
        }

        return res.status(200).json({ message: 'Email verified successfully!' });
    } catch (err) {
        return res.status(500).json({ message: 'An error occurred during verification.', error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login (Unified Core Authentication Gateway)
// ─────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const identity = req.body.identity || req.body.usernameOrEmail || req.body.email;
    const { password } = req.body;

    if (!identity || !password) {
        return res.status(400).json({ message: 'Username/Email and password are required.' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ? OR username = ?', [identity, identity]);
        if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

        const user = rows[0];

        if (user.status === 'DISABLED') {
            return res.status(403).json({ message: 'This account has been deactivated. Contact your administrator.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        if (!user.is_verified) {
            return res.status(403).json({ message: 'Please verify your email address to log in.', unverified: true });
        }

        let displayName = user.email;
        if (user.role === 'SUPER_ADMIN') {
            displayName = 'Super Admin';
        } else if (user.role === 'ADMIN') {
            const [r] = await db.execute('SELECT admin_name FROM admins WHERE user_id = ?', [user.id]);
            if (r.length) displayName = r[0].admin_name;
        } else if (user.role === 'VENDOR') {
            const [r] = await db.execute('SELECT vendor_name FROM vendors WHERE user_id = ?', [user.id]);
            if (r.length) displayName = r[0].vendor_name;
        } else if (user.role === 'COLLEGE') {
            const [r] = await db.execute('SELECT college_name FROM colleges WHERE user_id = ?', [user.id]);
            if (r.length) displayName = r[0].college_name;
        } else if (user.role === 'MENTOR') {
            const [r] = await db.execute('SELECT mentor_name FROM mentors WHERE user_id = ?', [user.id]);
            if (r.length) displayName = r[0].mentor_name;
        } else if (user.role === 'STUDENT') {
            const [r] = await db.execute('SELECT student_name FROM students WHERE user_id = ?', [user.id]);
            if (r.length) displayName = r[0].student_name;
        } else if (user.role === 'NON_STUDENT') {
            const [r] = await db.execute('SELECT full_name FROM non_students WHERE user_id = ?', [user.id]);
            if (r.length) displayName = r[0].full_name;
        }

        const accessToken = jwt.sign(
            { id: user.id, role: user.role.toUpperCase(), name: displayName, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(200).json({
            accessToken,
            role: user.role.toUpperCase(),
            dashboard: DASHBOARD_PATHS[user.role.toUpperCase()] || '/auth/login',
            user: { id: user.id, username: user.username, email: user.email, role: user.role.toUpperCase(), name: displayName }
        });
    } catch (err) {
        return res.status(500).json({ message: 'An internal server error occurred during login.', error: err.message });
    }
};

exports.logout = (req, res) => {
    return res.status(200).json({ message: 'Logged out successfully.' });
};

exports.getCurrentUser = async (req, res) => {
    return res.status(200).json({ user: req.user });
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    try {
        const cleanEmail = email.trim().toLowerCase();
        const [users] = await db.execute('SELECT id, email, status FROM users WHERE email = ?', [cleanEmail]);

        if (!users.length) {
            return res.status(200).json({ message: 'If an account exists for this email, a reset code has been sent.' });
        }

        const user = users[0];
        if (user.status === 'DISABLED') {
            return res.status(403).json({ message: 'This account has been deactivated. Contact your administrator.' });
        }

        const otp = generateNumericOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        await db.execute(
            'INSERT INTO otp_verification (email, otp, purpose, expiry) VALUES (?, ?, "FORGOT_PASSWORD", ?)',
            [cleanEmail, otp, expiry]
        );

        try {
            await sendMail(
                cleanEmail,
                'Reset your LMS Password',
                `<p>Hello,</p><h3>Your password reset code is: ${otp}</h3><p>This code expires in 5 minutes.</p>`
            );
        } catch (mailError) {
            console.log(`[Email Service Offline fallback] Forgot-Password OTP Code: ${otp}`);
        }

        return res.status(200).json({ message: 'If an account exists for this email, a reset code has been sent.' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to process forgot-password request.', error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Email, OTP and newPassword are required.' });
    }

    try {
        const cleanEmail = email.trim().toLowerCase();
        const [records] = await db.execute(
            'SELECT * FROM otp_verification WHERE email = ? AND otp = ? AND purpose = "FORGOT_PASSWORD" AND is_used = 0 AND expiry > NOW()',
            [cleanEmail, otp]
        );
        if (!records.length) {
            return res.status(400).json({ message: 'Invalid or expired reset code.' });
        }

        const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (!users.length) {
            return res.status(404).json({ message: 'No account found for this email.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.execute(
            'UPDATE users SET password = ?, status = "ACTIVE" WHERE id = ?',
            [hashedPassword, users[0].id]
        );
        await db.execute('UPDATE otp_verification SET is_used = 1 WHERE id = ?', [records[0].id]);

        return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to reset password.', error: err.message });
    }
};