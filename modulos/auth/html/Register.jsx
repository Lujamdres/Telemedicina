import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre: '', apellido: '', email: '', password: '', confirmPassword: '', role: 'Paciente', especialidad: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { nombre, apellido, email: correo, password, confirmPassword, role, especialidad } = formData;

        try {
            if (password !== confirmPassword) {
                Swal.fire({ icon: 'error', title: 'Oops...', text: 'Las contraseñas no coinciden', confirmButtonColor: '#e74c3c' });
                return;
            }

            const res = await axios.post('/api/auth/register', { nombre, apellido, correo, password, role, especialidad });
            localStorage.setItem('token', res.data.token);

            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: 'Tu cuenta ha sido creada exitosamente.',
                confirmButtonColor: '#4f46e5',
                background: '#f8fafc',
                customClass: { popup: 'glass-panel' }
            }).then(() => {
                navigate('/dashboard');
            });

        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Registro',
                text: err.response?.data?.message || 'Hubo un problema al crear la cuenta',
                confirmButtonColor: '#e74c3c'
            });
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Registro de Usuario</h2>
                {error && <p className="error-msg">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nombre</label>
                        <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Apellido</label>
                        <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Contraseña</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Rol</label>
                        <select name="role" value={formData.role} onChange={handleChange}>
                            <option value="Paciente">Paciente</option>
                            <option value="Medico">Médico</option>
                        </select>
                    </div>
                    {formData.role === 'Medico' && (
                        <div className="form-group">
                            <label>Especialidad</label>
                            <input type="text" name="especialidad" value={formData.especialidad} onChange={handleChange} required />
                        </div>
                    )}
                    <button type="submit" className="btn">Registrarse</button>
                </form>
                <Link to="/login" className="auth-link">¿Ya tienes cuenta? Inicia sesión</Link>
            </div>
        </div>
    );
};

export default Register;
