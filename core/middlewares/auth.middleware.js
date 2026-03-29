const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// Middleware para verificar el token JWT
const verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];

    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    if (!token) {
        return res.status(403).json({ success: false, message: 'Se requiere un token para autenticación' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, role, ... }
        return next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
};

// Middleware para validar el rol (niveles de acceso)
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'No tienes los permisos necesarios para realizar esta acción' });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    requireRole
};
