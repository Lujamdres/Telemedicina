const TOKEN_KEY = 'token';

/**
 * Sesión por pestaña: el JWT vive en sessionStorage, no en localStorage.
 * Así cada pestaña puede tener un usuario distinto sin pisarse.
 */
export function getToken() {
    try {
        return sessionStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setToken(token) {
    try {
        if (token == null || token === '') {
            sessionStorage.removeItem(TOKEN_KEY);
            return;
        }
        sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
        /* ignore */
    }
}

export function removeToken() {
    try {
        sessionStorage.removeItem(TOKEN_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * Migración única: token antiguo en localStorage → esta pestaña usa sessionStorage.
 * Limpia localStorage para no mezclar sesiones entre pestañas.
 */
export function migrateLegacyTokenFromLocalStorage() {
    try {
        const legacy = localStorage.getItem(TOKEN_KEY);
        if (legacy && !sessionStorage.getItem(TOKEN_KEY)) {
            sessionStorage.setItem(TOKEN_KEY, legacy);
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch {
        /* ignore */
    }
}
