export const THEME_KEY = 'lui-theme';

const VALID = new Set(['light', 'dark', 'system']);

export function getTheme() {
    try {
        const t = localStorage.getItem(THEME_KEY);
        if (VALID.has(t)) return t;
    } catch {
    }
    return 'system';
}

export function setTheme(mode) {
    if (!VALID.has(mode)) return;
    document.documentElement.dataset.theme = mode;
    try {
        localStorage.setItem(THEME_KEY, mode);
    } catch {
    }
}

export function initTheme() {
    document.documentElement.dataset.theme = getTheme();
}
