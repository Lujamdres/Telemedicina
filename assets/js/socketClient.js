import { io } from 'socket.io-client';

/**
 * URL de Socket.io.
 * En desarrollo, conexión directa al API (p. ej. :5000) evita fallos del proxy WS de Vite
 * ("WebSocket is closed before the connection is established").
 * En producción: mismo origen o `VITE_SOCKET_ORIGIN` / `VITE_API_ORIGIN`.
 */
export function getSocketUrl() {
    const trim = (u) => String(u).replace(/\/$/, '');

    if (import.meta.env.PROD) {
        const env = import.meta.env.VITE_SOCKET_ORIGIN || import.meta.env.VITE_API_ORIGIN;
        if (env) return trim(env);
        return typeof window !== 'undefined' ? window.location.origin : '';
    }

    const fromEnv = import.meta.env.VITE_SOCKET_ORIGIN || import.meta.env.VITE_API_ORIGIN;
    if (fromEnv) return trim(fromEnv);
    return 'http://localhost:5000';
}

export function createAppSocket() {
    return io(getSocketUrl(), {
        transports: ['polling', 'websocket'],
        path: '/socket.io/'
    });
}
