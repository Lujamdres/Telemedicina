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
    },
    /** Tras elegir "seguir esperando" en videollamada: hasta cuándo se pospone marcar la cita como perdida (máx. 30 min desde la API). */
    esperaExtendidaHasta: {
        type: Date
    },
    /** Momento en que ambas partes ya estaban en la sala (segundo en unirse). */
    videollamadaInicioAt: {
        type: Date
    },
    /** Momento en que la cita pasó a Completada. */
    videollamadaFinAt: {
        type: Date
    }
}, { timestamps: true });

appointmentSchema.methods.syncVideollamadaInicioIfBothJoined = function syncVideollamadaInicioIfBothJoined() {
    if (this.videollamadaInicioAt) return;
    if (this.pacienteJoinedAt && this.medicoJoinedAt) {
        const t = Math.max(
            new Date(this.pacienteJoinedAt).getTime(),
            new Date(this.medicoJoinedAt).getTime()
        );
        this.videollamadaInicioAt = new Date(t);
    }
};

appointmentSchema.methods.markVideollamadaFinIfCompleted = function markVideollamadaFinIfCompleted() {
    this.syncVideollamadaInicioIfBothJoined();
    if (this.estado === 'Completada' && !this.videollamadaFinAt) {
        this.videollamadaFinAt = new Date();
    }
};

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
