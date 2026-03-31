const mongoose = require('mongoose');

const recetaSchema = new mongoose.Schema(
    {
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
        cita: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: true
        },
        contenido: {
            type: String,
            required: true,
            trim: true
        },
        fechaEmision: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

recetaSchema.index({ paciente: 1, fechaEmision: -1 });

const Receta = mongoose.model('Receta', recetaSchema);
module.exports = Receta;
