import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import '../../../assets/css/global.css';
import '../assets/css/citas.css';
import '../assets/css/calendario-medico.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const CALENDAR_STATES = ['Pendiente', 'Agendada', 'Programada', 'Completada'];

function localDayKey(d) {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function buildCells(year, month) {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const mondayOffset = startDow === 0 ? 6 : startDow - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevLast = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < mondayOffset; i++) {
        const day = prevLast - mondayOffset + i + 1;
        cells.push({ inMonth: false, date: new Date(year, month - 1, day) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ inMonth: true, date: new Date(year, month, d) });
    }
    let tail = 0;
    while (cells.length % 7 !== 0) {
        tail += 1;
        cells.push({ inMonth: false, date: new Date(year, month + 1, tail) });
    }
    return cells;
}

function badgeTextoCita(c) {
    if (c.estado === 'Cancelada' && c.canceladaPorRole) return `Cancelada por ${c.canceladaPorRole}`;
    if (c.estado === 'Perdida' && c.perdidaPorAusenciaDe) return `Perdida (${c.perdidaPorAusenciaDe})`;
    return c.estado;
}

const CalendarioMedico = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [user, setUser] = useState(null);
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState(() => {
        const n = new Date();
        return { year: n.getFullYear(), month: n.getMonth() };
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalDate, setModalDate] = useState(null);

    const citasFiltradas = useMemo(
        () => citas.filter((c) => CALENDAR_STATES.includes(c.estado)),
        [citas]
    );

    const byDay = useMemo(() => {
        const m = new Map();
        citasFiltradas.forEach((c) => {
            const k = localDayKey(c.fechaHora);
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(c);
        });
        m.forEach((arr) => {
            arr.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        });
        return m;
    }, [citasFiltradas]);

    const cells = useMemo(
        () => buildCells(view.year, view.month),
        [view.year, view.month]
    );

    const modalCitas = useMemo(() => {
        if (!modalDate) return [];
        const k = localDayKey(modalDate);
        return byDay.get(k) || [];
    }, [modalDate, byDay]);

    const monthTitle = useMemo(
        () =>
            new Date(view.year, view.month, 1).toLocaleDateString('es', {
                month: 'long',
                year: 'numeric',
            }),
        [view.year, view.month]
    );

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return undefined;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };

        const load = async () => {
            try {
                const resProfile = await axios.get('/api/auth/profile', config);
                if (resProfile.data.data.role !== 'Medico') {
                    navigate('/dashboard');
                    return;
                }
                setUser(resProfile.data.data);
                const resCitas = await axios.get('/api/appointments', config);
                setCitas(resCitas.data.data);
            } catch {
                localStorage.removeItem('token');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        load();
        return undefined;
    }, [navigate, token]);

    useEffect(() => {
        if (!token || loading || !user || user.role !== 'Medico') return undefined;

        const socket = io('/', { transports: ['websocket', 'polling'] });
        const joinDashboard = () => socket.emit('dashboard-join', { token });
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

    const openDay = useCallback((cell) => {
        if (!cell.inMonth) return;
        setModalDate(cell.date);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setModalDate(null);
    }, []);

    useEffect(() => {
        if (!modalOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') closeModal();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [modalOpen, closeModal]);

    const prevMonth = () => {
        setView((v) => {
            const m = v.month - 1;
            if (m < 0) return { year: v.year - 1, month: 11 };
            return { year: v.year, month: m };
        });
    };

    const nextMonth = () => {
        setView((v) => {
            const m = v.month + 1;
            if (m > 11) return { year: v.year + 1, month: 0 };
            return { year: v.year, month: m };
        });
    };

    const goToday = () => {
        const n = new Date();
        setView({ year: n.getFullYear(), month: n.getMonth() });
    };

    if (loading) {
        return <div className="empty-state calendario-medico-loading">Cargando calendario…</div>;
    }

    const todayKey = localDayKey(new Date());

    return (
        <div className="calendario-medico-page">
            <header className="calendario-medico-header">
                <div>
                    <button type="button" className="btn btn-secondary btn-sm-auto calendario-back" onClick={() => navigate('/dashboard')}>
                        Volver al panel
                    </button>
                    <h1 className="title-primary calendario-title">Calendario de citas</h1>
                    <p className="text-subtle">Citas pendientes, agendadas y completadas por día. Pulsa un día para ver el detalle.</p>
                </div>
            </header>

            <div className="calendario-toolbar glass-panel">
                <button type="button" className="btn btn-secondary btn-sm-auto" onClick={prevMonth} aria-label="Mes anterior">
                    Anterior
                </button>
                <h2 className="calendario-month-label">{monthTitle}</h2>
                <button type="button" className="btn btn-secondary btn-sm-auto" onClick={nextMonth} aria-label="Mes siguiente">
                    Siguiente
                </button>
                <button type="button" className="btn btn-sm-auto" onClick={goToday}>
                    Hoy
                </button>
            </div>

            <div className="calendario-grid-wrap glass-panel">
                <div className="calendario-weekdays">
                    {WEEKDAYS.map((d) => (
                        <div key={d} className="calendario-weekday">
                            {d}
                        </div>
                    ))}
                </div>
                <div className="calendario-cells">
                    {cells.map((cell, idx) => {
                        const key = localDayKey(cell.date);
                        const dayCitas = cell.inMonth ? byDay.get(key) || [] : [];
                        const isToday = cell.inMonth && key === todayKey;
                        return (
                            <button
                                key={`${key}-${idx}`}
                                type="button"
                                className={`calendario-cell ${cell.inMonth ? 'calendario-cell--in-month' : 'calendario-cell--muted'} ${isToday ? 'calendario-cell--today' : ''}`}
                                onClick={() => openDay(cell)}
                                disabled={!cell.inMonth}
                                aria-label={
                                    cell.inMonth
                                        ? `Día ${cell.date.getDate()}, ${dayCitas.length} citas`
                                        : undefined
                                }
                            >
                                <span className="calendario-cell-day">{cell.date.getDate()}</span>
                                {cell.inMonth && dayCitas.length > 0 && (
                                    <ul className="calendario-cell-list">
                                        {dayCitas.map((c) => (
                                            <li key={c._id} className={`calendario-cell-item calendario-cell-item--${c.estado}`}>
                                                <span className="calendario-cell-time">
                                                    {new Date(c.fechaHora).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="calendario-cell-patient">
                                                    {c.paciente?.nombre} {c.paciente?.apellido}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {modalOpen && modalDate && (
                <div className="calendario-modal-overlay" role="presentation" onClick={closeModal}>
                    <div
                        className="calendario-modal glass-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="calendario-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="calendario-modal-head">
                            <h2 id="calendario-modal-title">
                                {modalDate.toLocaleDateString('es', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </h2>
                            <button type="button" className="calendario-modal-close" onClick={closeModal} aria-label="Cerrar">
                                ×
                            </button>
                        </div>
                        {modalCitas.length === 0 ? (
                            <p className="text-muted-mb">No hay citas para este día.</p>
                        ) : (
                            <ul className="calendario-modal-list">
                                {modalCitas.map((c) => (
                                    <li key={c._id} className="calendario-modal-card">
                                        <div className="calendario-modal-row">
                                            <span className="calendario-modal-time">
                                                {new Date(c.fechaHora).toLocaleTimeString('es', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                            <span className={`badge badge-${c.estado}`}>{badgeTextoCita(c)}</span>
                                        </div>
                                        <p className="calendario-modal-detail">
                                            <strong>Paciente:</strong> {c.paciente?.nombre} {c.paciente?.apellido}
                                        </p>
                                        {c.paciente?.email && (
                                            <p className="calendario-modal-detail calendario-modal-detail--muted">
                                                <strong>Email:</strong> {c.paciente.email}
                                            </p>
                                        )}
                                        <p className="calendario-modal-detail">
                                            <strong>Motivo:</strong> {c.motivoConsulta}
                                        </p>
                                        {c.motivoCancelacion && (
                                            <p className="calendario-modal-detail">
                                                <strong>Cancelación:</strong> {c.motivoCancelacion}
                                            </p>
                                        )}
                                        <div className="calendario-modal-actions flex-gap-1">
                                            {c.estado === 'Pendiente' && (
                                                <button type="button" className="btn btn-center-block btn-sm-auto" onClick={(e) => handleAccept(c._id, e)}>
                                                    Confirmar cita
                                                </button>
                                            )}
                                            {['Agendada', 'Programada'].includes(c.estado) && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-center-block btn-sm-auto"
                                                        onClick={() => navigate(`/videollamada/${c.enlaceVideollamada}`)}
                                                    >
                                                        Videollamada
                                                    </button>
                                                    <button type="button" className="btn btn-secondary btn-center-block btn-sm-auto" onClick={(e) => handleComplete(c._id, e)}>
                                                        Marcar completada
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-center-block btn-sm-auto"
                                                onClick={() => navigate(`/historial/${c.paciente?._id}`)}
                                            >
                                                Expediente
                                            </button>
                                            {['Pendiente', 'Agendada', 'Programada'].includes(c.estado) && (
                                                <button type="button" className="btn btn-danger btn-center-block btn-sm-auto" onClick={(e) => handleCancel(c._id, e)}>
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarioMedico;
