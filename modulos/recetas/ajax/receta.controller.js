const Receta = require('../data/Receta.model');
const Appointment = require('../../citas/data/Appointment.model');

const ESTADOS_CITA_RECETA = ['Agendada', 'Programada', 'Completada'];

const createReceta = async (req, res) => {
    try {
        const { appointmentId, contenido } = req.body;
        if (!appointmentId || !contenido || String(contenido).trim().length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Indica la cita y un texto de receta válido (mínimo 8 caracteres)'
            });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Cita no encontrada' });
        }
        if (String(appointment.medico) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Solo el médico asignado puede emitir recetas en esta cita' });
        }
        if (!ESTADOS_CITA_RECETA.includes(appointment.estado)) {
            return res.status(400).json({
                success: false,
                message: 'No se pueden emitir recetas en el estado actual de la cita'
            });
        }

        const receta = await Receta.create({
            paciente: appointment.paciente,
            medico: appointment.medico,
            cita: appointment._id,
            contenido: String(contenido).trim()
        });

        const populated = await Receta.findById(receta._id)
            .populate('medico', 'nombre apellido especialidad')
            .populate('paciente', 'nombre apellido')
            .lean();

        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const listMisRecetas = async (req, res) => {
    try {
        const list = await Receta.find({ paciente: req.user.id })
            .populate('medico', 'nombre apellido especialidad email')
            .sort({ fechaEmision: -1 })
            .lean();

        res.json({ success: true, count: list.length, data: list });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createReceta,
    listMisRecetas
};
