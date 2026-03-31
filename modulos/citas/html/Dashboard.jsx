import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import '../../../assets/css/global.css';
import '../assets/css/citas.css';
import MedicoDashboardCharts from './MedicoDashboardCharts.jsx';

function badgeTextoCita(c) {
    if (c.estado === 'Cancelada' && c.canceladaPorRole) return `Cancelada por ${c.canceladaPorRole}`;
    if (c.estado === 'Perdida' && c.perdidaPorAusenciaDe) return `Perdida (${c.perdidaPorAusenciaDe})`;
    return c.estado;
}

function motivoColumnaFinales(c) {
    if (c.estado === 'Cancelada' && c.motivoCancelacion) {
        return (
            <p className="text-muted-mb kanban-motivo">
                <strong>Motivo:</strong> {c.motivoCancelacion}
            </p>
        );
    }
    if (c.estado === 'Perdida') {
        const aus = c.perdidaPorAusenciaDe;
        const txt =
            aus === 'Medico'
                ? 'Ausencia del médico'
                : aus === 'Paciente'
                  ? 'Ausencia del paciente'
                  : 'Ninguna parte se conectó a tiempo';
        return (
            <p className="text-muted-mb kanban-motivo">
                <strong>Detalle:</strong> {txt}
            </p>
        );
    }
    return null;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return undefined;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };

        const fetchDatos = async () => {
            try {
                const resProfile = await axios.get('/api/auth/profile', config);
                setUser(resProfile.data.data);

                const resCitas = await axios.get('/api/appointments', config);
                setCitas(resCitas.data.data);

                setLoading(false);
            } catch (error) {
                console.error('Error al cargar datos:', error);
                localStorage.removeItem('token');
                navigate('/login');
            }
        };

        fetchDatos();
        return undefined;
    }, [navigate, token]);

    useEffect(() => {
        if (!token || loading || !user) return undefined;
        if (user.role !== 'Medico' && user.role !== 'Paciente') return undefined;

        const socket = io('/', {
            transports: ['websocket', 'polling'],
        });

        const joinDashboard = () => {
            socket.emit('dashboard-join', { token });
        };

        const refreshCitas = () => {
            axios
                .get('/api/appointments', { headers: { Authorization: `Bearer ${token}` } })
                .then((res) => setCitas(res.data.data))
                .catch(() => {});
        };

        socket.on('connect', joinDashboard);
        socket.on('citas-refresh', refreshCitas);
        if (socket.connected) joinDashboard();

        return () => {
            socket.off('connect', joinDashboard);
            socket.off('citas-refresh', refreshCitas);
            socket.disconnect();
        };
    }, [token, loading, user]);

    const handleCrearCitaClick = () => {
        navigate('/nueva-cita');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const apiConfig = { headers: { Authorization: `Bearer ${token}` } };

    const refreshCitas = async () => {
        const res = await axios.get('/api/appointments', apiConfig);
        setCitas(res.data.data);
    };

    const handleAccept = async (id) => {
        try {
            await axios.put(`/api/appointments/${id}/accept`, {}, apiConfig);
            await refreshCitas();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'No se pudo confirmar', text: err.response?.data?.message || 'Error del servidor' });
        }
    };

    const handleComplete = async (id) => {
        try {
            await axios.put(`/api/appointments/${id}/complete`, {}, apiConfig);
            await refreshCitas();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err.response?.data?.message || 'Error del servidor' });
        }
    };

    const handleCancel = async (id) => {
        const r = await Swal.fire({
            title: 'Cancelar cita',
            input: 'textarea',
            inputLabel: 'Motivo de cancelación',
            inputPlaceholder: 'Escribe el motivo...',
            inputAttributes: { maxlength: 300 },
            showCancelButton: true,
            confirmButtonText: 'Cancelar cita',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#e74c3c',
            inputValidator: (value) => {
                if (!value || value.trim().length < 4) return 'Debes escribir un motivo (mínimo 4 caracteres)';
                return undefined;
            }
        });
        if (!r.isConfirmed) return;
        try {
            await axios.put(`/api/appointments/${id}/cancel`, { motivoCancelacion: r.value }, apiConfig);
            await refreshCitas();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'No se pudo cancelar', text: err.response?.data?.message || 'Error del servidor' });
        }
    };

    const columnasMedico = useMemo(() => {
        if (user?.role !== 'Medico') return null;
        const pendientes = citas
            .filter((c) => c.estado === 'Pendiente')
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const agendadas = citas
            .filter((c) => ['Agendada', 'Programada'].includes(c.estado))
            .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        const finales = citas
            .filter((c) => ['Perdida', 'Cancelada'].includes(c.estado))
            .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
        const completadas = citas
            .filter((c) => c.estado === 'Completada')
            .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
        return { pendientes, agendadas, finales, completadas };
    }, [citas, user?.role]);

    if (loading) return <div className="empty-state">Cargando sistema de Telemedicina...</div>;

    return (
        <div className="container">
            <header className="header-flex">
                <div>
                    <h1 className="title-primary">Panel de {user?.role}</h1>
                    <p>Bienvenido, <strong>{user?.nombre} {user?.apellido}</strong> {user?.especialidad && `(${user.especialidad})`}</p>
                </div>
                <button className="btn btn-danger btn-sm-auto" onClick={handleLogout}>Cerrar Sesión</button>
            </header>

            <section>
                <div className="flex-between">
                    <h2>{user?.role === 'Medico' ? 'Tablero de citas' : 'Mis Citas'}</h2>
                    {(user?.role === 'Medico' || user?.role === 'Paciente') && (
                        <div className="flex-gap-1" style={{ justifyContent: 'flex-end' }}>
                            {user?.role === 'Medico' && (
                                <button type="button" className="btn btn-secondary btn-sm-auto" onClick={() => navigate('/calendario-medico')}>
                                    Calendario
                                </button>
                            )}
                            {user?.role === 'Paciente' && (
                                <button type="button" className="btn btn-sm-auto" onClick={handleCrearCitaClick}>
                                    + Nueva Cita
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {user?.role === 'Medico' && columnasMedico && (
                    <>
                        <MedicoDashboardCharts citas={citas} />
                        {citas.length === 0 ? (
                            <div className="citas-empty-state">
                                <p>No tienes citas todavía.</p>
                            </div>
                        ) : (
                            <>
                                <div className="kanban-board">
                                    <div className="kanban-column kanban-column--pendiente">
                                        <h3 className="kanban-column-title">Solicitudes sin agendar</h3>
                                        <p className="kanban-column-hint">Orden: más antiguas primero (llegada)</p>
                                        <div className="kanban-column-body">
                                            {columnasMedico.pendientes.length === 0 ? (
                                                <p className="kanban-empty">Sin solicitudes pendientes</p>
                                            ) : (
                                                columnasMedico.pendientes.map((cita) => (
                                                    <div key={cita._id} className="kanban-card cita-card-item">
                                                        <div className="flex-between">
                                                            <h3>{new Date(cita.fechaHora).toLocaleString()}</h3>
                                                            <span className={`badge badge-${cita.estado}`}>{badgeTextoCita(cita)}</span>
                                                        </div>
                                                        <p className="text-subtle">
                                                            <strong>Paciente:</strong> {cita.paciente?.nombre} {cita.paciente?.apellido}
                                                        </p>
                                                        <p className="text-muted-mb">
                                                            <strong>Consulta:</strong> {cita.motivoConsulta}
                                                        </p>
                                                        <p className="kanban-meta">
                                                            Solicitud: {cita.createdAt ? new Date(cita.createdAt).toLocaleString() : '—'}
                                                        </p>
                                                        <div className="flex-gap-1 kanban-card-actions">
                                                            <button type="button" className="btn btn-center-block btn-sm-auto" onClick={() => handleAccept(cita._id)}>
                                                                Confirmar
                                                            </button>
                                                            <button type="button" className="btn btn-danger btn-center-block btn-sm-auto" onClick={() => handleCancel(cita._id)}>
                                                                Cancelar
                                                            </button>
                                                            <button type="button" className="btn btn-secondary btn-center-block btn-sm-auto" onClick={() => navigate(`/historial/${cita.paciente?._id}`)}>
                                                                Expediente
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="kanban-column kanban-column--agendada">
                                        <h3 className="kanban-column-title">Agendadas</h3>
                                        <p className="kanban-column-hint">Orden: la cita más próxima arriba</p>
                                        <div className="kanban-column-body">
                                            {columnasMedico.agendadas.length === 0 ? (
                                                <p className="kanban-empty">Sin citas confirmadas</p>
                                            ) : (
                                                columnasMedico.agendadas.map((cita) => (
                                                    <div key={cita._id} className="kanban-card cita-card-item">
                                                        <div className="flex-between">
                                                            <h3>{new Date(cita.fechaHora).toLocaleString()}</h3>
                                                            <span className={`badge badge-${cita.estado}`}>{badgeTextoCita(cita)}</span>
                                                        </div>
                                                        <p className="text-subtle">
                                                            <strong>Paciente:</strong> {cita.paciente?.nombre} {cita.paciente?.apellido}
                                                        </p>
                                                        <p className="text-muted-mb">
                                                            <strong>Consulta:</strong> {cita.motivoConsulta}
                                                        </p>
                                                        <div className="flex-gap-1 kanban-card-actions">
                                                            <button type="button" className="btn btn-center-block btn-sm-auto" onClick={() => navigate(`/videollamada/${cita.enlaceVideollamada}`)}>
                                                                Videollamada
                                                            </button>
                                                            <button type="button" className="btn btn-secondary btn-center-block btn-sm-auto" onClick={() => handleComplete(cita._id)}>
                                                                Completada
                                                            </button>
                                                            <button type="button" className="btn btn-danger btn-center-block btn-sm-auto" onClick={() => handleCancel(cita._id)}>
                                                                Cancelar
                                                            </button>
                                                            <button type="button" className="btn btn-secondary btn-center-block btn-sm-auto" onClick={() => navigate(`/historial/${cita.paciente?._id}`)}>
                                                                Expediente
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="kanban-column kanban-column--final">
                                        <h3 className="kanban-column-title">Perdidas o canceladas</h3>
                                        <p className="kanban-column-hint">Motivo de baja o ausencia</p>
                                        <div className="kanban-column-body">
                                            {columnasMedico.finales.length === 0 ? (
                                                <p className="kanban-empty">Sin registros</p>
                                            ) : (
                                                columnasMedico.finales.map((cita) => (
                                                    <div key={cita._id} className="kanban-card cita-card-item">
                                                        <div className="flex-between">
                                                            <h3>{new Date(cita.fechaHora).toLocaleString()}</h3>
                                                            <span className={`badge badge-${cita.estado}`}>{badgeTextoCita(cita)}</span>
                                                        </div>
                                                        <p className="text-subtle">
                                                            <strong>Paciente:</strong> {cita.paciente?.nombre} {cita.paciente?.apellido}
                                                        </p>
                                                        <p className="text-muted-mb">
                                                            <strong>Consulta:</strong> {cita.motivoConsulta}
                                                        </p>
                                                        {motivoColumnaFinales(cita)}
                                                        <div className="flex-gap-1 kanban-card-actions">
                                                            <button type="button" className="btn btn-secondary btn-center-block btn-sm-auto" onClick={() => navigate(`/historial/${cita.paciente?._id}`)}>
                                                                Expediente
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {columnasMedico.completadas.length > 0 && (
                                    <div className="kanban-completadas">
                                        <h3 className="kanban-completadas-title">Completadas recientes</h3>
                                        <p className="kanban-column-hint">Historial de consultas ya cerradas</p>
                                        <div className="citas-grid">
                                            {columnasMedico.completadas.map((cita) => (
                                                <div key={cita._id} className="cita-card-item">
                                                    <div className="flex-between">
                                                        <h3>{new Date(cita.fechaHora).toLocaleString()}</h3>
                                                        <span className={`badge badge-${cita.estado}`}>{badgeTextoCita(cita)}</span>
                                                    </div>
                                                    <p className="text-subtle">
                                                        <strong>Paciente:</strong> {cita.paciente?.nombre} {cita.paciente?.apellido}
                                                    </p>
                                                    <p className="text-muted-mb">
                                                        <strong>Consulta:</strong> {cita.motivoConsulta}
                                                    </p>
                                                    <div className="flex-gap-1" style={{ marginTop: '1rem' }}>
                                                        <button type="button" className="btn btn-secondary btn-center-block btn-sm-auto" onClick={() => navigate(`/historial/${cita.paciente?._id}`)}>
                                                            Expediente
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {user?.role === 'Paciente' && (
                    <>
                        {citas.length === 0 ? (
                            <div className="citas-empty-state">
                                <p>No tienes citas programadas actualmente.</p>
                            </div>
                        ) : (
                            <div className="citas-grid">
                                {citas.map((cita) => (
                                    <div key={cita._id} className="cita-card-item">
                                        <div className="flex-between">
                                            <h3>{new Date(cita.fechaHora).toLocaleString()}</h3>
                                            <span className={`badge badge-${cita.estado}`}>{badgeTextoCita(cita)}</span>
                                        </div>
                                        <p className="text-subtle">
                                            <strong>Con:</strong> {`Dr. ${cita.medico.nombre} ${cita.medico.apellido}`}
                                        </p>
                                        <p className="text-muted-mb">
                                            <strong>Motivo:</strong> {cita.motivoConsulta}
                                        </p>
                                        {cita.motivoCancelacion && (
                                            <p className="text-muted-mb">
                                                <strong>Cancelación:</strong> {cita.motivoCancelacion}
                                            </p>
                                        )}

                                        <div className="flex-gap-1" style={{ marginTop: '1rem' }}>
                                            {['Agendada', 'Programada'].includes(cita.estado) && (
                                                <button className="btn btn-center-block" onClick={() => navigate(`/videollamada/${cita.enlaceVideollamada}`)}>
                                                    Unirse a Llamada
                                                </button>
                                            )}
                                            {['Pendiente', 'Agendada', 'Programada'].includes(cita.estado) && (
                                                <button type="button" className="btn btn-danger btn-center-block" onClick={() => handleCancel(cita._id)}>
                                                    Cancelar
                                                </button>
                                            )}
                                            <button className="btn btn-secondary btn-center-block" onClick={() => navigate(`/historial/${user._id}`)}>
                                                Expediente Clínico
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {user?.role && user.role !== 'Medico' && user.role !== 'Paciente' && (
                    <div className="citas-empty-state">
                        <p>No hay vista de citas para este rol.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Dashboard;
