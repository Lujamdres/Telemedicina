const express = require('express');
const router = express.Router();
const { createReceta, listMisRecetas } = require('./receta.controller');
const { verifyToken, requireRole } = require('../../../core/middlewares/auth.middleware');

router.use(verifyToken);

router.post('/', requireRole('Medico'), createReceta);
router.get('/mis-recetas', requireRole('Paciente'), listMisRecetas);

module.exports = router;
