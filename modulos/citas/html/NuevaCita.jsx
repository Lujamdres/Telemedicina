import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { getToken } from '../../../assets/js/authSession';
import LoadingView from '../../../assets/js/LoadingView.jsx';
import '../../../assets/css/global.css';

function toDatetimeLocalMin(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const h = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${y}-${m}-${day}T${h}:${min}`;
}

const NuevaCita = () => {
    const navigate = useNavigate();
    const [medicos, setMedicos] = useState([]);
    const [formData, setFormData] = useState({ medicoId: '', fechaHora: '', motivoConsulta: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [minFechaHora, setMinFechaHora] = useState(() => toDatetimeLocalMin());

    useEffect(() => {
        const id = setInterval(() => setMinFechaHora(toDatetimeLocalMin()), 30000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }

        const init = async () => {
            try {
                const resProfile = await axios.get('/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const role = resProfile.data.data?.role;
                setUserRole(role || '');
                if (role !== 'Paciente') {
                    return;
                }
                const res = await axios.get('/api/auth/medicos', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMedicos(res.data.data);
                if (res.data.data.length > 0) {
                    setFormData((prev) => ({ ...prev, medicoId: res.data.data[0]._id }));
                }
            } catch (err) {
                console.error('Error al cargar datos', err);
            }
        };
        init();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (userRole !== 'Paciente') {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Solo los pacientes pueden solicitar citas desde esta pantalla.',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        const cuando = new Date(formData.fechaHora);
        if (!formData.fechaHora || Number.isNaN(cuando.getTime()) || cuando.getTime() <= Date.now()) {
            Swal.fire({
                icon: 'warning',
                title: 'Fecha no válida',
                text: 'Debes elegir una fecha y hora posteriores al momento actual.',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        setLoading(true);
        setError('');
        try {
            const token = getToken();
            const res = await axios.post('/api/appointments', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: '¡Cita Agendada!',
                text: 'Tu cita se ha programado correctamente.',
                confirmButtonColor: '#4f46e5',
                background: '#f8fafc',
                customClass: { popup: 'glass-panel' }
            }).then(() => {
                navigate('/dashboard');
            });
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message || 'Error al conectar con el servidor';
            const hint =
                status === 403
                    ? `${msg} Si eres médico, debes confirmar las solicitudes desde el panel; solo un paciente puede crear una nueva cita aquí.`
                    : msg;
            Swal.fire({
                icon: 'error',
                title: status === 403 ? 'Sin permiso' : 'No se pudo agendar',
                text: hint,
                confirmButtonColor: '#e74c3c'
            });
        } finally {
            setLoading(false);
        }
    };

    if (userRole === null) {
        return (
            <div className="container-sm">
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <LoadingView variant="compact" message="Preparando formulario…" />
                </div>
            </div>
        );
    }

    if (userRole !== 'Paciente') {
        return (
            <div className="container-sm">
                <div className="glass-panel">
                    <h2>Agendar nueva cita</h2>
                    <div className="citas-empty-state" style={{ marginTop: '1rem', textAlign: 'left' }}>
                        <p>
                            <strong>Solo los pacientes</strong> pueden solicitar una cita desde aquí. El servidor responde
                            con error 403 si la sesión es de un médico u otro rol.
                        </p>
                        <p className="text-muted-mb" style={{ marginBottom: '1rem' }}>
                            Como médico, revisa y confirma las solicitudes en tu tablero. Como paciente, inicia sesión con
                            una cuenta de paciente para agendar.
                        </p>
                        <button type="button" className="btn" onClick={() => navigate('/dashboard')}>
                            Volver al panel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-sm">
            {loading && <LoadingView variant="overlay" message="Agendando cita…" />}
            <div className="glass-panel">
                <h2>Agendar Nueva Cita</h2>
                <p className="text-muted-mb">Selecciona tu médico de preferencia, el horario y cuéntanos el motivo.</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Especialista (Médico)</label>
                        <select
                            value={formData.medicoId}
                            onChange={(e) => setFormData({ ...formData, medicoId: e.target.value })}
                            required
                        >
                            <option value="" disabled>Seleccione un médico</option>
                            {medicos.map(medico => (
                                <option key={medico._id} value={medico._id}>
                                    Dr. {medico.nombre} {medico.apellido} - {medico.especialidad}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Fecha y Hora</label>
                        <input
                            type="datetime-local"
                            required
                            min={minFechaHora}
                            value={formData.fechaHora}
                            onChange={(e) => setFormData({ ...formData, fechaHora: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Motivo de la Consulta</label>
                        <textarea
                            rows="3"
                            required
                            placeholder="Describe brevemente tus síntomas o el motivo de la consulta..."
                            value={formData.motivoConsulta}
                            onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex-gap-1">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn" disabled={loading}>
                            {loading ? 'Agendando...' : 'Confirmar Cita'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NuevaCita;
