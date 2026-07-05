const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Authentication Middleware
 * Decodes the Bearer token, checks if the user exists in the DB, and validates active status
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. Access Token Missing.' });
    }

    try {
        // Aligned with the secret key string definition utilized within your AuthController login sequence
const jwtSecret = process.env.JWT_ACCESS_SECRET || 'fallback_secret_key';
        const decoded = jwt.verify(token, jwtSecret);
        
        // Query the database to ensure the user is still valid and active
        const [user] = await db.execute(
            `SELECT u.id, u.user_id, u.email, r.role_name AS db_role, u.status 
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.id = ?`,
            [decoded.id]
        );
        
        if (!user.length) {
            return res.status(401).json({ success: false, message: 'User account no longer exists.' });
        }

        if (user[0].status !== 'ACTIVE') {
            return res.status(403).json({ success: false, message: 'User account is restricted or completely invalid.' });
        }

        const mapDbRoleToAppRole = (dbRoleName) => {
            switch (dbRoleName) {
                case 'SUPER_ADMIN': return 'SUPER_ADMIN';
                case 'ADMIN': return 'ADMIN';
                case 'COLLEGE': return 'COLLEGE';
                case 'COLLEGE_MENTOR':
                case 'VENDOR_MENTOR':
                    return 'MENTOR';
                case 'VENDOR': return 'VENDOR';
                case 'COLLEGE_STUDENT':
                case 'VENDOR_STUDENT':
                case 'DIRECT_STUDENT':
                    return 'STUDENT';
                case 'DIRECT_USER':
                    return 'NON_STUDENT';
                default: return dbRoleName;
            }
        };

        // Attach the fully validated database user object to the request context
        req.user = {
            id: user[0].id,
            user_id: user[0].user_id,
            email: user[0].email,
            role: mapDbRoleToAppRole(user[0].db_role),
            status: user[0].status
        };
        next();
    } catch (err) {
        // Explicitly handle token expirations gracefully for your frontend interceptors
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
        }
        return res.status(403).json({ success: false, message: 'Invalid or Expired Web Session Token.' });
    }
};

/**
 * Role-Based Access Control Guard (RBAC)
 * Aligned with route patterns: checkRole(['COLLEGE', 'SUPER_ADMIN'])
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        
        const userRole = req.user.role.toUpperCase();
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Forbidden: Access restricted. Requires one of: [${allowedRoles.join(', ')}]` 
            });
        }
        
        next();
    };
};

// Export the precise naming keys required by mentorRoutes.js and other app gateways
module.exports = { verifyToken, checkRole };