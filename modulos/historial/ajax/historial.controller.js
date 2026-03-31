const MedicalRecord = require('../data/MedicalRecord.model');
const User = require('../../auth/data/User.model');
const Appointment = require('../../citas/data/Appointment.model');

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

        if (req.user.role === 'Medico') {
            const tuvoCita = await Appointment.exists({
                medico: req.user.id,
                paciente: pacienteId
            });
            const tieneRegistro = await MedicalRecord.exists({
                medicoId: req.user.id,
                pacienteId
            });
            if (!tuvoCita && !tieneRegistro) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes historial compartido con este paciente'
                });
            }
        }

        const historiales = await MedicalRecord.find({ pacienteId })
            .populate('medicoId', 'nombre apellido especialidad')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: historiales.length, data: historiales });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** Pacientes con cita completada o registro clínico creado por este médico */
const listPacientesAtendidosMedico = async (req, res) => {
    try {
        if (req.user.role !== 'Medico') {
            return res.status(403).json({ success: false, message: 'Solo médicos pueden consultar este listado' });
        }

        const medicoId = req.user.id;

        const idsCitas = await Appointment.distinct('paciente', {
            medico: medicoId,
            estado: 'Completada'
        });

        const idsHistorial = await MedicalRecord.distinct('pacienteId', {
            medicoId
        });

        const idSet = new Set([...idsCitas.map(String), ...idsHistorial.map(String)].filter(Boolean));

        if (idSet.size === 0) {
            return res.json({ success: true, count: 0, data: [] });
        }

        const pacientes = await User.find({
            _id: { $in: [...idSet] },
            role: 'Paciente'
        })
            .select('nombre apellido email telefono')
            .sort({ apellido: 1, nombre: 1 })
            .lean();

        res.json({ success: true, count: pacientes.length, data: pacientes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createMedicalRecord,
    getPatientHistory,
    listPacientesAtendidosMedico
};
