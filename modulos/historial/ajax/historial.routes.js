const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createMedicalRecord, getPatientHistory } = require('./historial.controller');
const { verifyToken, requireRole } = require('../../../core/middlewares/auth.middleware');

// Configuración de almacenamiento local para los PDF o Imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../../../lui/uploads/'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
    }
});
const upload = multer({ storage: storage });

// Rutas de Historial Médico (La ruta POST usa Multer para analizar los datos pesados y el archivo)
router.post('/', verifyToken, requireRole('Medico'), upload.single('archivo'), createMedicalRecord);
router.get('/paciente/:id', verifyToken, getPatientHistory);

module.exports = router;
