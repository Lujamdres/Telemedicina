const Appointment = require('../data/Appointment.model');
const crypto = require('crypto');

// Crear una nueva cita
const createAppointment = async (req, res) => {
    try {
        const { medicoId, fechaHora, motivoConsulta } = req.body;
        // El id del paciente viene del token
        const pacienteId = req.user.role === 'Paciente' ? req.user.id : req.body.pacienteId;

        // Generar un ID único para la sala de videoconferencia
        const roomHash = crypto.randomBytes(16).toString('hex');

        const newAppointment = await Appointment.create({
            paciente: pacienteId,
            medico: medicoId,
            fechaHora,
            motivoConsulta,
            enlaceVideollamada: roomHash
        });

        res.status(201).json({ success: true, data: newAppointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Obtener las citas del usuario actual
const getMyAppointments = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'Paciente') {
            filter.paciente = req.user.id;
        } else if (req.user.role === 'Medico') {
            filter.medico = req.user.id;
        }

        const appointments = await Appointment.find(filter)
            .populate('paciente', 'nombre apellido email')
            .populate('medico', 'nombre apellido email especialidad');

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Actualizar el estado de una cita
const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Cita no encontrada' });
        }

        appointment.estado = estado;
        await appointment.save();

        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createAppointment,
    getMyAppointments,
    updateAppointmentStatus
};
