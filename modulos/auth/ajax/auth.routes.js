const express = require('express');
const router = express.Router();
const { register, login, getProfile, getMedicos } = require('./auth.controller');
const { verifyToken, requireRole } = require('../../../core/middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.get('/medicos', verifyToken, getMedicos);

// Ejemplo de ruta solo para administradores
router.get('/admin-dashboard', verifyToken, requireRole('Administrador'), (req, res) => {
    res.json({ success: true, message: 'Bienvenido al panel del administrador' });
});

module.exports = router;
