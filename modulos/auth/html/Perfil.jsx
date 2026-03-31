import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { getToken, removeToken } from '../../../assets/js/authSession';
import LoadingView from '../../../assets/js/LoadingView.jsx';
import MedicoSidebar from '../../citas/html/MedicoSidebar.jsx';
import PacienteSidebar from '../../citas/html/PacienteSidebar.jsx';
import '../../../assets/css/global.css';
import '../../citas/assets/css/medico-layout.css';
import '../assets/css/perfil.css';

function avatarSrc(fotoPerfil) {
    if (!fotoPerfil) return null;
    if (fotoPerfil.startsWith('http')) return fotoPerfil;
    return fotoPerfil;
}

const Perfil = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        telefono: '',
        especialidad: '',
        passwordActual: '',
        passwordNueva: ''
    });

    const load = useCallback(async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const res = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const u = res.data.data;
            setUser(u);
            setForm((f) => ({
                ...f,
                nombre: u.nombre || '',
                apellido: u.apellido || '',
                telefono: u.telefono || '',
                especialidad: u.especialidad || ''
            }));
        } catch {
            removeToken();
            navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        load();
    }, [load]);

    const handleLogout = () => {
        removeToken();
        navigate('/login');
    };

    const handlePhoto = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const token = getToken();
        if (!token) return;
        const fd = new FormData();
        fd.append('foto', file);
        try {
            const res = await axios.post('/api/auth/profile/photo', fd, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.data);
            Swal.fire({ icon: 'success', title: 'Foto actualizada', timer: 1600, showConfirmButton: false });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo subir la imagen',
                text: err.response?.data?.message || 'Intenta con otra imagen (máx. 2 MB)'
            });
        }
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const token = getToken();
        if (!token) return;
        setSaving(true);
        try {
            const payload = {
                nombre: form.nombre,
                apellido: form.apellido,
                telefono: form.telefono || undefined
            };
            if (user?.role === 'Medico') {
                payload.especialidad = form.especialidad || undefined;
            }
            if (form.passwordNueva && form.passwordNueva.length > 0) {
                payload.passwordActual = form.passwordActual;
                payload.passwordNueva = form.passwordNueva;
            }
            const res = await axios.put('/api/auth/profile', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.data);
            setForm((f) => ({ ...f, passwordActual: '', passwordNueva: '' }));
            Swal.fire({ icon: 'success', title: 'Perfil guardado', timer: 1600, showConfirmButton: false });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo guardar',
                text: err.response?.data?.message || 'Revisa los datos'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingView message="Cargando perfil…" />;
    }

    if (!user) {
        return null;
    }

    const initials = `${(user.nombre || '?')[0] || ''}${(user.apellido || '')[0] || ''}`.toUpperCase();
    const imgUrl = user.fotoPerfil ? avatarSrc(user.fotoPerfil) : null;

    const main = (
        <div className="container perfil-page">
            <header className="header-flex">
                <div>
                    <h1 className="title-primary">Mi perfil</h1>
                    <p className="text-muted-mb">Actualiza tus datos y tu foto. El correo no se puede cambiar desde aquí.</p>
                </div>
                {user.role === 'Administrador' && (
                    <button type="button" className="btn btn-danger btn-sm-auto" onClick={handleLogout}>
                        Cerrar sesión
                    </button>
                )}
            </header>

            <div className="glass-panel" style={{ padding: '1.25rem', maxWidth: '640px' }}>
                <div className="perfil-avatar-block">
                    {imgUrl ? (
                        <img className="perfil-avatar" src={imgUrl} alt="" />
                    ) : (
                        <div className="perfil-avatar perfil-avatar--placeholder" aria-hidden>
                            {initials}
                        </div>
                    )}
                    <div>
                        <label className="btn btn-secondary btn-sm-auto" style={{ cursor: 'pointer' }}>
                            Elegir foto
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                        </label>
                        <p className="perfil-hint">JPG, PNG o WebP. Máximo 2 MB.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="perfil-form-grid">
                        <label>
                            Correo
                            <input type="email" value={user.email || ''} disabled />
                        </label>
                        <label>
                            Nombre
                            <input
                                required
                                value={form.nombre}
                                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                            />
                        </label>
                        <label>
                            Apellido
                            <input
                                required
                                value={form.apellido}
                                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                            />
                        </label>
                        <label>
                            Teléfono
                            <input
                                value={form.telefono}
                                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                                placeholder="Opcional"
                            />
                        </label>
                        {user.role === 'Medico' && (
                            <label>
                                Especialidad
                                <input
                                    value={form.especialidad}
                                    onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))}
                                />
                            </label>
                        )}
                        <label>
                            Contraseña actual
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={form.passwordActual}
                                onChange={(e) => setForm((f) => ({ ...f, passwordActual: e.target.value }))}
                                placeholder="Solo si cambias contraseña"
                            />
                        </label>
                        <label>
                            Nueva contraseña
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form.passwordNueva}
                                onChange={(e) => setForm((f) => ({ ...f, passwordNueva: e.target.value }))}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </label>
                    </div>
                    <div className="perfil-actions">
                        <button type="submit" className="btn btn-sm-auto" disabled={saving}>
                            {saving ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    if (user.role === 'Medico') {
        return (
            <div className="medico-app-layout">
                <MedicoSidebar />
                <div className="medico-app-main">{main}</div>
            </div>
        );
    }
    if (user.role === 'Paciente') {
        return (
            <div className="medico-app-layout">
                <PacienteSidebar />
                <div className="medico-app-main">{main}</div>
            </div>
        );
    }

    return main;
};

export default Perfil;
