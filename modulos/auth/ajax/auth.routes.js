const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { register, login, getProfile, updateProfile, uploadProfilePhoto, getMedicos } = require('./auth.controller');
const { verifyToken, requireRole } = require('../../../core/middlewares/auth.middleware');

const avatarsDir = path.join(__dirname, '../../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const e = allowed.includes(ext) ? ext : '.jpg';
        cb(null, `user-${req.user.id}-${Date.now()}${e}`);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            cb(new Error('Solo se permiten imágenes'));
            return;
        }
        cb(null, true);
    }
});

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/profile/photo', verifyToken, (req, res, next) => {
    uploadAvatar.single('foto')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message || 'Error al subir la imagen' });
        }
        next();
    });
}, uploadProfilePhoto);
router.get('/medicos', verifyToken, getMedicos);

// Ejemplo de ruta solo para administradores
router.get('/admin-dashboard', verifyToken, requireRole('Administrador'), (req, res) => {
    res.json({ success: true, message: 'Bienvenido al panel del administrador' });
});

module.exports = router;
