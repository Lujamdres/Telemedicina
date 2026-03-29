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
        enum: ['Programada', 'Completada', 'Cancelada'],
        default: 'Programada'
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
