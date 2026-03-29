const MedicalRecord = require('../data/MedicalRecord.model');
const User = require('../../auth/data/User.model');

// @desc    Crear un nuevo registro médico
// @route   POST /api/historial
// @access  Privado (Médico)
const createMedicalRecord = async (req, res) => {
    try {
        const { pacienteId, citaId, motivoConsulta, diagnostico, tratamiento, notasEvolutivas } = req.body;

        // Verificar que el paciente exista
        const paciente = await User.findById(pacienteId);
        if (!paciente || paciente.role !== 'Paciente') {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }

        // Verificar si se subió algún archivo
        let archivosAdjuntos = [];
        if (req.file) {
            archivosAdjuntos.push({
                nombreArchivo: req.file.originalname,
                fileUrl: `/uploads/${req.file.filename}`, // Guardamos la URL relativa para descargar
                tipoDocumento: 'Otro'
            });
        }

        const newRecord = await MedicalRecord.create({
            pacienteId,
            medicoId: req.user.id,
            citaId,
            motivoConsulta,
            diagnostico,
            tratamiento,
            notasEvolutivas,
            archivosAdjuntos
        });

        // Poblamos los datos del médico para que React los pinte inmediatamente sin tener que recargar
        const populatedRecord = await MedicalRecord.findById(newRecord._id).populate('medicoId', 'nombre apellido especialidad');

        res.status(201).json({ success: true, data: populatedRecord });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Obtener el historial completo de un paciente
// @route   GET /api/historial/paciente/:id
// @access  Privado (Médico asignado o el mismo Paciente)
const getPatientHistory = async (req, res) => {
    try {
        const pacienteId = req.params.id;

        // Seguridad: Si soy paciente, solo puedo ver MI historial
        if (req.user.role === 'Paciente' && String(req.user.id) !== pacienteId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado a historiales ajenos' });
        }

        const historiales = await MedicalRecord.find({ pacienteId })
            .populate('medicoId', 'nombre apellido especialidad')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: historiales.length, data: historiales });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createMedicalRecord,
    getPatientHistory
};
