const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const User = require('../../modulos/auth/data/User.model');

const verifyToken = async (req, res, next) => {
    let token = req.headers['authorization'];

    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length).trim();
    }

    if (!token) {
        return res.status(403).json({ success: false, message: 'Se requiere un token para autenticación' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const id = decoded.id != null ? String(decoded.id) : null;
        let role = decoded.role;

        if ((!role || String(role).trim() === '') && id) {
            const u = await User.findById(id).select('role').lean();
            if (u?.role) role = u.role;
        }
        if (!role || String(role).trim() === '') {
            role = 'Paciente';
        }

        req.user = { ...decoded, id, role: String(role).trim() };
        return next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token inválido' });
        }
        return next(err);
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        const userRole = (req.user?.role || '').trim();
        if (!req.user || !roles.includes(userRole)) {
            return res.status(403).json({ success: false, message: 'No tienes los permisos necesarios para realizar esta acción' });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    requireRole
};
