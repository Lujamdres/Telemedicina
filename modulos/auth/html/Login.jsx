import React, { useState } from 'react';
import LoadingView from '../../../assets/js/LoadingView.jsx';
import MedConnectLogo from '../../../assets/js/MedConnectLogo.jsx';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { setToken } from '../../../assets/js/authSession';
import Swal from 'sweetalert2';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const response = await axios.post('/api/auth/login', credentials);
            if (response.data.success) {
                setToken(response.data.token);
                navigate('/dashboard');
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: err.response?.data?.message || 'Error de credenciales',
                confirmButtonColor: '#e74c3c'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-container">
            {submitting && <LoadingView variant="overlay" message="Iniciando sesión…" />}
            <div className="auth-layout">
                <aside className="auth-brand-panel">
                    <MedConnectLogo variant="hero" />
                    <p className="auth-tagline">Conectamos pacientes y especialistas con seguridad.</p>
                </aside>
                <div className="auth-box auth-box--form glass-panel">
                    <h2>Iniciar Sesión</h2>
                    {error && <p className="error-msg">{error}</p>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value={credentials.email} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Contraseña</label>
                            <input type="password" name="password" value={credentials.password} onChange={handleChange} required />
                        </div>
                        <button type="submit" className="btn">Entrar</button>
                    </form>
                    <Link to="/register" className="auth-link">¿No tienes cuenta? Regístrate aquí</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
