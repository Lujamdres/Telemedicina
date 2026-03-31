import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, removeToken } from '../../../assets/js/authSession';
import LoadingView from '../../../assets/js/LoadingView.jsx';
import MedicoSidebar from './MedicoSidebar.jsx';
import PacienteSidebar from './PacienteSidebar.jsx';
import '../../../assets/css/global.css';
import '../assets/css/medico-layout.css';
import '../assets/css/historial-citas.css';

function formatFechaHora(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    } catch {
        return '—';
    }
}

function formatDuracion(seg) {
    if (seg == null || Number.isNaN(seg)) return '—';
    const s = Math.max(0, Math.round(seg));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    if (m >= 60) {
        const h = Math.floor(m / 60);
        const mm = m % 60;
        return `${h} h ${mm} min`;
    }
    return `${m} min ${rest} s`;
}

const HistorialCitasCompletadas = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const resProfile = await axios.get('/api/auth/profile', { headers });
            const u = resProfile.data.data;
            setUser(u);
            if (u.role !== 'Medico' && u.role !== 'Paciente') {
                navigate('/dashboard');
                return;
            }
            const res = await axios.get('/api/appointments/historial-completadas', { headers });
            setRows(res.data.data || []);
        } catch (e) {
            console.error(e);
            if (e.response?.status === 401) {
                removeToken();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRowDoubleClickMedico = (pacienteId) => {
        if (!pacienteId) return;
        navigate(`/historial/${pacienteId}`);
    };

    const isMedico = user?.role === 'Medico';

    const shell = (sidebar, main) => (
        <div className="medico-app-layout">
            {sidebar}
            <div className="medico-app-main historial-citas-page">{main}</div>
        </div>
    );

    if (loading) {
        return <LoadingView message="Cargando historial de consultas…" />;
    }

    if (!user) {
        return null;
    }

    const inner = (
        <div className="container">
            <header className="header-flex">
                <div>
                    <h1 className="title-primary">Consultas completadas</h1>
                    <p className="historial-citas-hint">
                        {isMedico ? (
                            <>
                                Citas en estado <strong>Completada</strong> en las que participaste. Doble clic en una fila
                                para abrir el historial clínico del paciente.
                            </>
                        ) : (
                            <>
                                Citas finalizadas correctamente con tus médicos: nombre del especialista, especialidad, fecha
                                y hora de la consulta.
                            </>
                        )}
                    </p>
                </div>
            </header>

            {rows.length === 0 ? (
                <div className="citas-empty-state">
                    <p>Aún no hay consultas completadas en tu historial.</p>
                </div>
            ) : (
                <div className="glass-panel historial-citas-table-wrap">
                    <table className="historial-citas-table">
                        <thead>
                            <tr>
                                {isMedico ? (
                                    <>
                                        <th>Paciente</th>
                                        <th>Fecha y hora</th>
                                        <th>Duración de la videollamada</th>
                                    </>
                                ) : (
                                    <>
                                        <th>Médico</th>
                                        <th>Especialidad</th>
                                        <th>Fecha y hora</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((cita) => {
                                const pid = cita.paciente?._id || cita.paciente;
                                if (isMedico) {
                                    const nombrePac = cita.paciente
                                        ? `${cita.paciente.nombre || ''} ${cita.paciente.apellido || ''}`.trim()
                                        : '—';
                                    return (
                                        <tr
                                            key={cita._id}
                                            className="historial-citas-row--clickable"
                                            onDoubleClick={() => handleRowDoubleClickMedico(pid)}
                                            title="Doble clic para ver el historial del paciente"
                                        >
                                            <td>{nombrePac || '—'}</td>
                                            <td>{formatFechaHora(cita.fechaHora)}</td>
                                            <td>{formatDuracion(cita.duracionSegundos)}</td>
                                        </tr>
                                    );
                                }
                                const nombreMed = cita.medico
                                    ? `Dr. ${cita.medico.nombre || ''} ${cita.medico.apellido || ''}`.trim()
                                    : '—';
                                return (
                                    <tr key={cita._id}>
                                        <td>{nombreMed}</td>
                                        <td>{cita.medico?.especialidad || '—'}</td>
                                        <td>{formatFechaHora(cita.fechaHora)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return shell(isMedico ? <MedicoSidebar /> : <PacienteSidebar />, inner);
};

export default HistorialCitasCompletadas;
