const Appointment = require('../data/Appointment.model');
const crypto = require('crypto');

function notifyCitasRefresh(req, userIds) {
    const io = req.app.get('io');
    if (!io || !userIds?.length) return;
    const seen = new Set();
    userIds.forEach((id) => {
        if (id == null) return;
        const s = String(id);
        if (seen.has(s)) return;
        seen.add(s);
        io.to(`user:${s}`).emit('citas-refresh');
    });
}

async function markAsPerdidaIfNeeded(appointment) {
    if (!appointment) return false;
    if (appointment.estado === 'Programada') {
        appointment.estado = 'Agendada';
        await appointment.save();
    }
    if (appointment.estado !== 'Agendada') return false;
    const now = Date.now();
    if (appointment.esperaExtendidaHasta) {
        const ext = new Date(appointment.esperaExtendidaHasta).getTime();
        if (!Number.isNaN(ext) && now < ext) {
            return false;
        }
    }
    const citaMs = new Date(appointment.fechaHora).getTime();
    if (Number.isNaN(citaMs) || now <= citaMs + 5 * 60 * 1000) return false;

    const pacienteJoined = appointment.pacienteJoinedAt ? new Date(appointment.pacienteJoinedAt).getTime() : null;
    const medicoJoined = appointment.medicoJoinedAt ? new Date(appointment.medicoJoinedAt).getTime() : null;

    if (!pacienteJoined && !medicoJoined) {
        appointment.estado = 'Perdida';
        appointment.perdidaPorAusenciaDe = 'Ambos';
        await appointment.save();
        return true;
    }

    /** 6 min: margen tras el aviso al usuario a los 5 min en videollamada (modal + posible ampliación). */
    const umbralEsperaOtraParte = 6 * 60 * 1000;
    if (pacienteJoined && !medicoJoined && now > pacienteJoined + umbralEsperaOtraParte) {
        appointment.estado = 'Perdida';
        appointment.perdidaPorAusenciaDe = 'Medico';
        await appointment.save();
        return true;
    }

    if (medicoJoined && !pacienteJoined && now > medicoJoined + umbralEsperaOtraParte) {
        appointment.estado = 'Perdida';
        appointment.perdidaPorAusenciaDe = 'Paciente';
        await appointment.save();
        return true;
    }

    return false;
}

function canAccessAppointment(user, appointment) {
    if (!user || !appointment) return false;
    if (user.role === 'Administrador') return true;
    if (user.role === 'Paciente') return String(appointment.paciente) === String(user.id);
    if (user.role === 'Medico') return String(appointment.medico) === String(user.id);
    return false;
}

/** Límites del mismo minuto calendario que fechaHora (alineado con datetime-local). */
function slotMinuteBounds(input) {
    const t = new Date(input);
    if (Number.isNaN(t.getTime())) return null;
    const start = new Date(t);
    start.setSeconds(0, 0);
    const end = new Date(t);
    end.setSeconds(59, 999);
    return { start, end };
}

/**
 * Otra cita del mismo médico ya confirmada (Agendada/Programada) en ese minuto.
 * @param {string|undefined} excludeId - excluir esta cita (p. ej. al confirmar)
 */
async function findMedicoSlotConflict(medicoId, fechaHora, excludeId) {
    const bounds = slotMinuteBounds(fechaHora);
    if (!bounds) return null;
    const query = {
        medico: medicoId,
        estado: { $in: ['Agendada', 'Programada'] },
        fechaHora: { $gte: bounds.start, $lte: bounds.end }
    };
    if (excludeId) query._id = { $ne: excludeId };
    return Appointment.findOne(query).lean();
}

const MSG_SLOT_OCUPADO =
    'El médico ya tiene una cita confirmada en esa fecha y hora. Elige otro horario.';

const createAppointment = async (req, res) => {
    try {
        const { medicoId, fechaHora, motivoConsulta } = req.body;
        const pacienteId = req.user.role === 'Paciente' ? req.user.id : req.body.pacienteId;
        if (!medicoId || !fechaHora) {
            return res.status(400).json({ success: false, message: 'medicoId y fechaHora son obligatorios' });
        }
        const bounds = slotMinuteBounds(fechaHora);
        if (!bounds) {
            return res.status(400).json({ success: false, message: 'fechaHora no es válida' });
        }

        const conflict = await findMedicoSlotConflict(medicoId, fechaHora);
        if (conflict) {
            return res.status(409).json({ success: false, message: MSG_SLOT_OCUPADO });
        }

        const roomHash = crypto.randomBytes(16).toString('hex');

        const newAppointment = await Appointment.create({
            paciente: pacienteId,
            medico: medicoId,
            fechaHora,
            motivoConsulta,
            estado: 'Pendiente',
            enlaceVideollamada: roomHash
        });

        notifyCitasRefresh(req, [medicoId, pacienteId]);
        res.status(201).json({ success: true, data: newAppointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyAppointments = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'Paciente') {
            filter.paciente = req.user.id;
        } else if (req.user.role === 'Medico') {
            filter.medico = req.user.id;
        }

        const appointments = await Appointment.find(filter)
            .populate('paciente', 'nombre apellido email role')
            .populate('medico', 'nombre apellido email especialidad role')
            .sort({ fechaHora: 1 });

        let changed = false;
        for (const appt of appointments) {
            const didChange = await markAsPerdidaIfNeeded(appt);
            changed = changed || didChange;
        }
        if (changed && appointments.length) {
            notifyCitasRefresh(req, appointments.flatMap((a) => [a.medico?._id || a.medico, a.paciente?._id || a.paciente]));
        }

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const acceptAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada' });

        if (req.user.role === 'Medico' && String(appointment.medico) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'No puedes confirmar una cita asignada a otro médico' });
        }
        if (appointment.estado !== 'Pendiente') {
            return res.status(400).json({ success: false, message: 'Solo se pueden confirmar citas pendientes' });
        }

        const conflict = await findMedicoSlotConflict(appointment.medico, appointment.fechaHora, appointment._id);
        if (conflict) {
            return res.status(409).json({
                success: false,
                message:
                    'Ya existe otra cita confirmada en ese horario para este médico. No se puede confirmar esta solicitud.'
            });
        }

        appointment.estado = 'Agendada';
        await appointment.save();
        notifyCitasRefresh(req, [appointment.medico, appointment.paciente]);
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada' });

        if (req.user.role === 'Medico' && String(appointment.medico) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'No puedes completar una cita asignada a otro médico' });
        }
        if (appointment.estado !== 'Agendada') {
            return res.status(400).json({ success: false, message: 'Solo se pueden completar citas agendadas' });
        }

        appointment.estado = 'Completada';
        await appointment.save();
        notifyCitasRefresh(req, [appointment.medico, appointment.paciente]);
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivoCancelacion } = req.body;
        if (!motivoCancelacion || String(motivoCancelacion).trim().length < 4) {
            return res.status(400).json({ success: false, message: 'Debes adjuntar un motivo de cancelación' });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
        if (!canAccessAppointment(req.user, appointment)) {
            return res.status(403).json({ success: false, message: 'No puedes cancelar esta cita' });
        }
        if (['Completada', 'Perdida'].includes(appointment.estado)) {
            return res.status(400).json({ success: false, message: 'La cita ya no puede ser cancelada' });
        }

        appointment.estado = 'Cancelada';
        appointment.canceladaPorRole = req.user.role;
        appointment.motivoCancelacion = String(motivoCancelacion).trim();
        await appointment.save();

        notifyCitasRefresh(req, [appointment.medico, appointment.paciente]);
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const EXTEND_WAIT_MS = 30 * 60 * 1000;

const extendVideoWait = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
        if (!canAccessAppointment(req.user, appointment)) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }
        if (!['Agendada', 'Programada'].includes(appointment.estado)) {
            return res.status(400).json({ success: false, message: 'Solo aplica a citas confirmadas' });
        }
        if (req.user.role !== 'Paciente' && req.user.role !== 'Medico') {
            return res.status(403).json({ success: false, message: 'Solo paciente o médico' });
        }
        const isPaciente = String(appointment.paciente) === String(req.user.id);
        const isMedico = String(appointment.medico) === String(req.user.id);
        if (!isPaciente && !isMedico) {
            return res.status(403).json({ success: false, message: 'No eres parte de esta cita' });
        }
        const myJoinedAt = isPaciente ? appointment.pacienteJoinedAt : appointment.medicoJoinedAt;
        if (!myJoinedAt) {
            return res.status(400).json({
                success: false,
                message: 'Debes haber entrado a la videollamada para ampliar la espera'
            });
        }

        appointment.esperaExtendidaHasta = new Date(Date.now() + EXTEND_WAIT_MS);
        await appointment.save();
        notifyCitasRefresh(req, [appointment.medico, appointment.paciente]);
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAppointmentByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const appointment = await Appointment.findOne({ enlaceVideollamada: roomId })
            .populate('paciente', 'nombre apellido email role')
            .populate('medico', 'nombre apellido email especialidad role');
        if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
        if (!canAccessAppointment(req.user, appointment)) {
            return res.status(403).json({ success: false, message: 'No autorizado para ver esta cita' });
        }

        const changed = await markAsPerdidaIfNeeded(appointment);
        if (changed) notifyCitasRefresh(req, [appointment.medico, appointment.paciente]);
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createAppointment,
    getMyAppointments,
    acceptAppointment,
    completeAppointment,
    cancelAppointment,
    extendVideoWait,
    getAppointmentByRoom,
    markAsPerdidaIfNeeded
};
