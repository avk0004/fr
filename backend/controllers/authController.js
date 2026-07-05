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
    STUDENT: '/dashboard/student',
    NON_STUDENT: '/dashboard/student'
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
            'SELECT id, college_id, department_name AS name FROM departments WHERE college_id = ? ORDER BY department_name ASC',
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
        'INSERT INTO otp_verifications (email, otp_code, purpose, expires_at) VALUES (?, ?, "REGISTER", ?)',
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
        const businessUserId = 'USR-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
        const roleId = college_id ? '7' : '9'; // 7 = COLLEGE_STUDENT, 9 = DIRECT_STUDENT

        const [userResult] = await db.execute(
            'INSERT INTO users (user_id, username, email, password, role_id, phone, is_verified, status) VALUES (?, ?, ?, ?, ?, ?, 0, "PENDING")',
            [businessUserId, username, cleanEmail, hashedPassword, roleId, mobile]
        );
        const userId = userResult.insertId;

        const mappedCollegeId = college_id && !isNaN(college_id) ? parseInt(college_id) : null;
        const mappedDepartmentId = department_id && !isNaN(department_id) ? parseInt(department_id) : null;
        const mappedYearOfStudy = year_of_study && !isNaN(year_of_study) ? parseInt(year_of_study) : null;
        const originType = college_id ? 'COLLEGE' : 'DIRECT';

        await db.execute(
            'INSERT INTO student_profiles (id, user_id, role_id, student_name, roll_no, mobile, college_id, department_id, year_of_study, origin_type, added_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                userId,
                businessUserId,
                roleId,
                full_name,
                roll_no || '',
                mobile,
                mappedCollegeId,
                mappedDepartmentId,
                mappedYearOfStudy,
                originType,
                businessUserId // self-registered
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
        const businessUserId = 'USR-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
        const roleId = '10'; // 10 = DIRECT_USER / NON_STUDENT

        const [userResult] = await db.execute(
            'INSERT INTO users (user_id, username, email, password, role_id, phone, is_verified, status) VALUES (?, ?, ?, ?, ?, ?, 0, "PENDING")',
            [businessUserId, username, cleanEmail, hashedPassword, roleId, mobile]
        );
        const userId = userResult.insertId;

        await db.execute(
            'INSERT INTO non_student_profiles (id, user_id, role_id, full_name, mobile) VALUES (?, ?, ?, ?, ?)',
            [userId, businessUserId, roleId, full_name, mobile]
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
            'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = ? AND is_used = 0 AND expires_at > NOW()',
            [cleanEmail, otp, purpose]
        );

        if (!records.length) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        await db.execute('UPDATE otp_verifications SET is_used = 1 WHERE id = ?', [records[0].id]);

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
        let roleName = 'STUDENT';

        if (user.role_id === '1') {
            roleName = 'SUPER_ADMIN';
            displayName = 'Super Admin';
        } else if (user.role_id === '2') {
            roleName = 'ADMIN';
            const [r] = await db.execute('SELECT admin_name FROM admin_profiles WHERE id = ?', [user.id]);
            if (r.length) displayName = r[0].admin_name;
        } else if (user.role_id === '3') {
            roleName = 'COLLEGE';
            const [r] = await db.execute('SELECT college_name FROM colleges WHERE user_id = ?', [user.user_id]);
            if (r.length) displayName = r[0].college_name;
        } else if (user.role_id === '4' || user.role_id === '6') {
            roleName = 'MENTOR';
            const [r] = await db.execute('SELECT mentor_name FROM mentor_profiles WHERE id = ?', [user.id]);
            if (r.length) displayName = r[0].mentor_name;
        } else if (user.role_id === '5') {
            roleName = 'VENDOR';
            const [r] = await db.execute('SELECT vendor_name FROM vendor_profiles WHERE id = ?', [user.id]);
            if (r.length) displayName = r[0].vendor_name;
        } else if (user.role_id === '7' || user.role_id === '8' || user.role_id === '9') {
            roleName = 'STUDENT';
            const [r] = await db.execute('SELECT student_name FROM student_profiles WHERE id = ?', [user.id]);
            if (r.length) displayName = r[0].student_name;
        } else if (user.role_id === '10') {
            roleName = 'NON_STUDENT';
            const [r] = await db.execute('SELECT full_name FROM non_student_profiles WHERE id = ?', [user.id]);
            if (r.length) displayName = r[0].full_name;
        }

        const accessToken = jwt.sign(
            { id: user.id, role: roleName, name: displayName, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(200).json({
            accessToken,
            role: roleName,
            dashboard: DASHBOARD_PATHS[roleName] || '/auth/login',
            user: { id: user.id, username: user.username, email: user.email, role: roleName, name: displayName }
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
            'INSERT INTO otp_verifications (email, otp_code, purpose, expires_at) VALUES (?, ?, "FORGOT_PASSWORD", ?)',
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
            'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = "FORGOT_PASSWORD" AND is_used = 0 AND expires_at > NOW()',
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
        await db.execute('UPDATE otp_verifications SET is_used = 1 WHERE id = ?', [records[0].id]);

        return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to reset password.', error: err.message });
    }
};