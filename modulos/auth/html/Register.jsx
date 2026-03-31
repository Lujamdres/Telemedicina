import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
};

const IconEyeOpen = () => (
    <svg {...svgProps}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconEyeClosed = () => (
    <svg {...svgProps}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre: '', apellido: '', email: '', password: '', confirmPassword: '', role: 'Paciente', especialidad: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { nombre, apellido, email, password, confirmPassword, role, especialidad } = formData;

        try {
            if (password !== confirmPassword) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Las contraseñas no coinciden', confirmButtonColor: '#e74c3c' });
                return;
            }

            const res = await axios.post('/api/auth/register', { nombre, apellido, email, password, role, especialidad });
            localStorage.setItem('token', res.data.token);

            Swal.fire({
                icon: 'success',
                title: 'Cuenta creada',
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
                        <label htmlFor="register-password">Contraseña</label>
                        <div className="password-input-wrap">
                            <input
                                id="register-password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                aria-pressed={showPassword}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowPassword((v) => !v);
                                }}
                            >
                                {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="register-confirm-password">Confirmar contraseña</label>
                        <div className="password-input-wrap">
                            <input
                                id="register-confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                aria-pressed={showConfirmPassword}
                                aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowConfirmPassword((v) => !v);
                                }}
                            >
                                {showConfirmPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                            </button>
                        </div>
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
