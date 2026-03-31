const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fechaHora: {
        type: Date,
        required: true
    },
    estado: {
        type: String,
        enum: ['Pendiente', 'Agendada', 'Programada', 'Completada', 'Cancelada', 'Perdida'],
        default: 'Pendiente'
    },
    canceladaPorRole: {
        type: String,
        enum: ['Paciente', 'Medico', 'Administrador']
    },
    motivoCancelacion: {
        type: String
    },
    perdidaPorAusenciaDe: {
        type: String,
        enum: ['Paciente', 'Medico', 'Ambos']
    },
    pacienteJoinedAt: {
        type: Date
    },
    medicoJoinedAt: {
        type: Date
    },
    motivoConsulta: {
        type: String,
        required: true
    },
    enlaceVideollamada: {
        type: String // Se puede generar un hash único para la sala
    }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
