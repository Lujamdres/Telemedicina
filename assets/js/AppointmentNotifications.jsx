import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { playNotificationSound } from './notificationSounds';
import { getToken } from './authSession';
import { createAppSocket } from './socketClient';

const STORAGE_T10 = 'notif-cita-t10-';
const STORAGE_T0 = 'notif-cita-t0-';
const STORAGE_CONFIRM = 'notif-cita-confirm-';

function fmtFechaHora(iso) {
    try {
        return new Date(iso).toLocaleString('es', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    } catch {
        return '';
    }
}

export default function AppointmentNotifications() {
    const location = useLocation();
    const navigate = useNavigate();
    const [toasts, setToasts] = useState([]);
    const prevCitasRef = useRef(null);

    useEffect(() => {
        if (['/login', '/register'].includes(location.pathname)) {
            prevCitasRef.current = null;
        }
    }, [location.pathname]);

    const removeToast = useCallback((id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    const pushToast = useCallback((message, variant = 'info', duration = 9000, enlaceVideollamada = null) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setToasts((t) => [...t, { id, message, variant, enlaceVideollamada }]);
        if (duration > 0) {
            setTimeout(() => {
                setToasts((t) => t.filter((x) => x.id !== id));
            }, duration);
        }
        return id;
    }, []);

    const fetchCitasYUsuario = useCallback(async () => {
        const token = getToken();
        if (!token) return null;

        const [resProfile, resCitas] = await Promise.all([
            axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
            axios.get('/api/appointments', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
        ]);

        if (!resProfile?.data?.data || !resCitas?.data?.data) return null;

        const user = resProfile.data.data;
        const citas = resCitas.data.data;
        const prev = prevCitasRef.current;
        prevCitasRef.current = citas;

        if (user.role !== 'Medico' && user.role !== 'Paciente') {
            return { user, citas };
        }

        if (prev && Array.isArray(prev)) {
            const prevMap = new Map(prev.map((c) => [String(c._id), c]));
            for (const c of citas) {
                const id = String(c._id);
                const was = prevMap.get(id);
                if (!was) continue;
                if (was.estado === 'Pendiente' && ['Agendada', 'Programada'].includes(c.estado)) {
                    const key = STORAGE_CONFIRM + id;
                    if (!sessionStorage.getItem(key)) {
                        sessionStorage.setItem(key, '1');
                        playNotificationSound('success');
                        if (user.role === 'Paciente') {
                            const dr = c.medico ? `Dr. ${c.medico.nombre} ${c.medico.apellido}` : 'tu médico';
                            pushToast(
                                `Tu cita con ${dr} ha sido confirmada. Fecha: ${fmtFechaHora(c.fechaHora)}.`,
                                'success',
                                12000,
                                null
                            );
                        } else {
                            const p = c.paciente ? `${c.paciente.nombre} ${c.paciente.apellido}` : 'el paciente';
                            pushToast(`Cita confirmada con ${p}. Fecha: ${fmtFechaHora(c.fechaHora)}.`, 'success', 12000, null);
                        }
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification('Cita confirmada', {
                                body:
                                    user.role === 'Paciente'
                                        ? `Cita confirmada para ${fmtFechaHora(c.fechaHora)}`
                                        : `Cita confirmada con ${c.paciente ? `${c.paciente.nombre} ${c.paciente.apellido}` : 'paciente'}`
                            });
                        }
                    }
                }
            }
        }

        const now = Date.now();

        for (const c of citas) {
            if (!['Agendada', 'Programada'].includes(c.estado)) continue;
            const fh = new Date(c.fechaHora).getTime();
            if (Number.isNaN(fh)) continue;
            const oid = String(c._id);
            const diffStart = fh - now;

            if (diffStart > 0 && diffStart <= 10 * 60 * 1000) {
                const key = STORAGE_T10 + oid;
                if (!sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, '1');
                    playNotificationSound('reminder');
                    if (user.role === 'Paciente') {
                        const dr = c.medico ? `Dr. ${c.medico.nombre} ${c.medico.apellido}` : 'tu médico';
                        pushToast(
                            `En menos de 10 minutos comienza tu cita con ${dr} (${fmtFechaHora(c.fechaHora)}). Prepárate para la teleconsulta.`,
                            'warning',
                            14000,
                            null
                        );
                    } else {
                        const p = c.paciente ? `${c.paciente.nombre} ${c.paciente.apellido}` : 'Paciente';
                        pushToast(
                            `Tu cita con ${p} es en menos de 10 minutos (${fmtFechaHora(c.fechaHora)}).`,
                            'warning',
                            14000,
                            null
                        );
                    }
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                        new Notification('Cita próxima', {
                            body: `Menos de 10 minutos: ${fmtFechaHora(c.fechaHora)}`
                        });
                    }
                }
            }

            if (now >= fh && now <= fh + 5 * 60 * 1000) {
                const key = STORAGE_T0 + oid;
                if (sessionStorage.getItem(key)) continue;

                const soyPaciente = user.role === 'Paciente';
                const yaEntre = soyPaciente ? c.pacienteJoinedAt : c.medicoJoinedAt;
                if (yaEntre) continue;

                const enSala =
                    location.pathname.startsWith('/videollamada/') && location.pathname === `/videollamada/${c.enlaceVideollamada}`;
                if (enSala) continue;

                sessionStorage.setItem(key, '1');
                playNotificationSound('urgent');
                const msg =
                    'Es la hora de la teleconsulta. Tienes 5 minutos para unirte; si no, la cita puede marcarse como perdida y deberás solicitar otra fecha.';
                const tid = pushToast(msg, 'danger', 0, c.enlaceVideollamada || null);
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('Hora de la teleconsulta', {
                        body: 'Tienes 5 minutos para unirte a la videollamada.'
                    });
                }
                setTimeout(() => removeToast(tid), 28000);
            }
        }

        return { user, citas };
    }, [location.pathname, pushToast, removeToast]);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            prevCitasRef.current = null;
            return undefined;
        }

        let cancelled = false;

        const run = async () => {
            if (cancelled) return;
            try {
                await fetchCitasYUsuario();
            } catch {
                /* ignore */
            }
        };

        run();
        const poll = setInterval(run, 15000);

        const socket = createAppSocket();

        const join = () => {
            socket.emit('dashboard-join', { token });
        };
        socket.on('connect', join);
        socket.on('citas-refresh', run);
        if (socket.connected) join();

        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }

        return () => {
            cancelled = true;
            clearInterval(poll);
            socket.disconnect();
        };
    }, [fetchCitasYUsuario]);

    const token = typeof sessionStorage !== 'undefined' ? getToken() : null;
    const onLoginPages = ['/login', '/register'].includes(location.pathname);
    if (!token || onLoginPages) {
        return null;
    }

    return (
        <div className="app-toast-stack" aria-live="polite">
            {toasts.map((t) => (
                <div key={t.id} className={`app-toast app-toast--${t.variant}`} role="status">
                    <p className="app-toast-text">{t.message}</p>
                    {t.enlaceVideollamada && (
                        <button
                            type="button"
                            className="btn app-toast-action"
                            onClick={() => navigate(`/videollamada/${t.enlaceVideollamada}`)}
                        >
                            Ir a la videollamada
                        </button>
                    )}
                    <button type="button" className="app-toast-close" onClick={() => removeToast(t.id)} aria-label="Cerrar">
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
