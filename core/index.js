const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./db');
const { PORT } = require('./config');

const authRoutes = require('../modulos/auth/ajax/auth.routes');
const appointmentRoutes = require('../modulos/citas/ajax/appointment.routes');
const historialRoutes = require('../modulos/historial/ajax/historial.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // En producción limitar esto
        methods: ['GET', 'POST']
    }
});

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

// Configuración de WebRTC / Señalización con Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        // Notificar a los demás en la sala
        socket.to(roomId).emit('user-joined', socket.id);
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
