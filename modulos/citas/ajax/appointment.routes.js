const express = require('express');
const router = express.Router();
const {
    createAppointment,
    getMyAppointments,
    getHistorialCompletadas,
    acceptAppointment,
    completeAppointment,
    cancelAppointment,
    extendVideoWait,
    getAppointmentByRoom
} = require('./appointment.controller');
const { verifyToken, requireRole } = require('../../../core/middlewares/auth.middleware');

// Todas las rutas requieren estar logueado
router.use(verifyToken);

// Crear cita (Solo pacientes o administradores)
router.post('/', requireRole('Paciente', 'Administrador'), createAppointment);

// Ver mis citas (Paciente o Médico)
router.get('/', getMyAppointments);

router.get('/historial-completadas', getHistorialCompletadas);

router.get('/room/:roomId', getAppointmentByRoom);
router.put('/:id/accept', requireRole('Medico', 'Administrador'), acceptAppointment);
router.put('/:id/complete', requireRole('Medico', 'Administrador'), completeAppointment);
router.put('/:id/extend-wait', requireRole('Paciente', 'Medico'), extendVideoWait);
router.put('/:id/cancel', requireRole('Paciente', 'Medico', 'Administrador'), cancelAppointment);

module.exports = router;
