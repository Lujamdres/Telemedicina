const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    pacienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medicoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    citaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment' // Opcional, para vincular el registro a una visita específica
    },
    motivoConsulta: {
        type: String,
        required: true
    },
    diagnostico: {
        type: String,
        required: true
    },
    tratamiento: {
        type: String,
        required: true
    },
    notasEvolutivas: {
        type: String
    },
    // Preparando el terreno para los laboratorios y recetas en GridFS
    archivosAdjuntos: [{
        nombreArchivo: String,
        fileGridFsId: mongoose.Schema.Types.ObjectId, // ID del archivo guardado en el storage
        tipoDocumento: { type: String, enum: ['Receta', 'Laboratorio', 'Imagen', 'Otro'] },
        fechaSubida: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = MedicalRecord;
