const express = require('express');
const router = express.Router();
const { createAppointment, getMyAppointments, updateAppointmentStatus } = require('./appointment.controller');
const { verifyToken, requireRole } = require('../../../core/middlewares/auth.middleware');

// Todas las rutas requieren estar logueado
router.use(verifyToken);

// Crear cita (Solo pacientes o administradores)
router.post('/', requireRole('Paciente', 'Administrador'), createAppointment);

// Ver mis citas (Paciente o Médico)
router.get('/', getMyAppointments);

// Actualizar estado de cita (Médicos o Administradores)
router.put('/:id/status', requireRole('Medico', 'Administrador'), updateAppointmentStatus);

module.exports = router;
