const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./db');
const { PORT, JWT_SECRET } = require('./config');

const authRoutes = require('../modulos/auth/ajax/auth.routes');
const appointmentRoutes = require('../modulos/citas/ajax/appointment.routes');
const historialRoutes = require('../modulos/historial/ajax/historial.routes');
const recetaRoutes = require('../modulos/recetas/ajax/receta.routes');
const Appointment = require('../modulos/citas/data/Appointment.model');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
app.set('io', io);

// Middlewares Globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta de 'uploads' estáticamente para descargar recetas/laboratorios
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Inicializar Base de datos
connectDB();

// Endpoints Base
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Telemedicina API is running' });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/recetas', recetaRoutes);

// Configuración de WebRTC / Señalización con Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    socket.on('dashboard-join', (payload) => {
        try {
            const token = typeof payload === 'string' ? payload : payload?.token;
            if (!token) return;
            const decoded = jwt.verify(token, JWT_SECRET);
            const uid = decoded.id != null ? String(decoded.id) : null;
            if (!uid) return;
            socket.join(`user:${uid}`);
        } catch {
        }
    });

    socket.on('join-room', async (payload) => {
        let roomId = payload;
        let token = null;
        if (typeof payload === 'object' && payload !== null) {
            roomId = payload.roomId;
            token = payload.token || null;
        }
        if (!roomId) return;

        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);

        try {
            if (!token) return;
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id != null ? String(decoded.id) : null;
            const role = decoded.role ? String(decoded.role) : '';
            if (!userId || !role) return;

            const appointment = await Appointment.findOne({ enlaceVideollamada: roomId });
            if (!appointment) return;
            const isPaciente = String(appointment.paciente) === userId;
            const isMedico = String(appointment.medico) === userId;
            if (!isPaciente && !isMedico) return;

            const now = new Date();
            if (isPaciente && !appointment.pacienteJoinedAt) appointment.pacienteJoinedAt = now;
            if (isMedico && !appointment.medicoJoinedAt) appointment.medicoJoinedAt = now;
            appointment.syncVideollamadaInicioIfBothJoined();
            await appointment.save();

            const updated = await Appointment.findById(appointment._id);
            if (
                updated &&
                updated.pacienteJoinedAt &&
                updated.medicoJoinedAt &&
                updated.esperaExtendidaHasta &&
                ['Agendada', 'Programada'].includes(updated.estado)
            ) {
                const extMs = new Date(updated.esperaExtendidaHasta).getTime();
                if (!Number.isNaN(extMs) && Date.now() <= extMs) {
                    updated.estado = 'Completada';
                    updated.markVideollamadaFinIfCompleted();
                    await updated.save();
                    io.to(roomId).emit('appointment-completed', { estado: 'Completada' });
                }
            }

            io.to(`user:${String(appointment.paciente)}`).emit('citas-refresh');
            io.to(`user:${String(appointment.medico)}`).emit('citas-refresh');
        } catch {
        }
    });

    socket.on('offer', (offer, roomId) => {
        socket.to(roomId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, roomId) => {
        socket.to(roomId).emit('answer', answer, socket.id);
    });

    socket.on('ice-candidate', (candidate, roomId) => {
        socket.to(roomId).emit('ice-candidate', candidate, socket.id);
    });

    // --- Chat en vivo de Videollamadas ---
    socket.on('chat-message', (data, roomId) => {
        // Reenviar mensaje al otro participante
        socket.to(roomId).emit('chat-message', data);
    });

    socket.on('disconnecting', () => {
        // Notificar a las salas cuando un usuario se va
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.to(room).emit('user-disconnected', socket.id);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Arranque
server.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
