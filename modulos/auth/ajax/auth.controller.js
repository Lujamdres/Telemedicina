const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('../data/User.model');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../../core/config');

// Helper para generar el token
const generateToken = (user) => {
    const id = user._id != null ? user._id.toString() : String(user.id);
    const role = user.role || 'Paciente';
    return jwt.sign({ id, role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

// Registro de usuarios
const register = async (req, res) => {
    try {
        const { nombre, apellido, email, password, role, especialidad, telefono } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'El usuario ya existe' });
        }

        const user = await User.create({
            nombre,
            apellido,
            email,
            password,
            role: role || 'Paciente',
            especialidad: role === 'Medico' ? especialidad : undefined,
            telefono
        });

        if (user) {
            res.status(201).json({
                success: true,
                _id: user._id,
                email: user.email,
                role: user.role,
                token: generateToken(user)
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Autenticación (Login)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                _id: user._id,
                nombre: user.nombre,
                email: user.email,
                role: user.role,
                token: generateToken(user),
            });
        } else {
            res.status(401).json({ success: false, message: 'Email o contraseña inválidos' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Obtener perfil actual
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user) {
            res.json({ success: true, data: user });
        } else {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { nombre, apellido, telefono, especialidad, passwordActual, passwordNueva } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        if (nombre != null && String(nombre).trim()) user.nombre = String(nombre).trim();
        if (apellido != null && String(apellido).trim()) user.apellido = String(apellido).trim();
        if (telefono !== undefined) user.telefono = telefono ? String(telefono).trim() : undefined;

        if (user.role === 'Medico' && especialidad !== undefined) {
            user.especialidad = especialidad ? String(especialidad).trim() : undefined;
        }

        if (passwordNueva != null && String(passwordNueva).length > 0) {
            if (String(passwordNueva).length < 6) {
                return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
            }
            if (!passwordActual) {
                return res.status(400).json({ success: false, message: 'Indica tu contraseña actual para cambiarla' });
            }
            const ok = await user.matchPassword(passwordActual);
            if (!ok) {
                return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
            }
            user.password = passwordNueva;
        }

        await user.save();
        const fresh = await User.findById(user._id).select('-password');
        res.json({ success: true, data: fresh });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se envió ninguna imagen' });
        }
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        const publicPath = `/uploads/avatars/${req.file.filename}`;
        const oldPath = user.fotoPerfil;
        user.fotoPerfil = publicPath;
        await user.save();

        if (oldPath && oldPath.startsWith('/uploads/avatars/')) {
            const oldFile = path.join(__dirname, '../../../uploads/avatars', path.basename(oldPath));
            try {
                if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
            } catch {
                /* ignore */
            }
        }

        const fresh = await User.findById(user._id).select('-password');
        res.json({ success: true, data: fresh });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Obtener lista de médicos
const getMedicos = async (req, res) => {
    try {
        const medicos = await User.find({ role: 'Medico' }).select('nombre apellido especialidad email');
        res.json({ success: true, count: medicos.length, data: medicos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    uploadProfilePhoto,
    getMedicos
};
