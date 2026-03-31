import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getToken, removeToken } from './authSession';

/** Tiempo sin interacción antes de cerrar sesión (aplicación médica: no demasiado largo). */
export const IDLE_LOGOUT_MS = 15 * 60 * 1000;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel', 'focus'];

/**
 * Cierra la sesión si no hay actividad del usuario en esta pestaña.
 * No aplica en login/registro ni durante la videollamada (la consulta puede ser larga sin mover el ratón).
 */
export default function IdleSessionMonitor() {
    const navigate = useNavigate();
    const location = useLocation();
    const timerRef = useRef(null);

    const clearTimer = () => {
        if (timerRef.current != null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const runLogout = useCallback(() => {
        if (!getToken()) return;
        removeToken();
        Swal.fire({
            icon: 'info',
            title: 'Sesión cerrada',
            text: `Por seguridad, tu sesión se cerró tras ${Math.round(IDLE_LOGOUT_MS / 60000)} minutos sin actividad en esta pestaña.`,
            confirmButtonColor: '#4f46e5'
        }).then(() => {
            navigate('/login', { replace: true });
        });
    }, [navigate]);

    const armTimer = useCallback(() => {
        clearTimer();
        timerRef.current = setTimeout(runLogout, IDLE_LOGOUT_MS);
    }, [runLogout]);

    useEffect(() => {
        const publicPaths = ['/login', '/register'];
        if (publicPaths.includes(location.pathname) || !getToken()) {
            clearTimer();
            return undefined;
        }

        if (location.pathname.startsWith('/videollamada')) {
            clearTimer();
            return undefined;
        }

        const onActivity = () => {
            armTimer();
        };

        ACTIVITY_EVENTS.forEach((ev) => {
            window.addEventListener(ev, onActivity, { passive: true });
        });
        document.addEventListener('scroll', onActivity, { capture: true, passive: true });

        armTimer();

        return () => {
            ACTIVITY_EVENTS.forEach((ev) => {
                window.removeEventListener(ev, onActivity);
            });
            document.removeEventListener('scroll', onActivity, { capture: true });
            clearTimer();
        };
    }, [location.pathname, armTimer]);

    return null;
}
