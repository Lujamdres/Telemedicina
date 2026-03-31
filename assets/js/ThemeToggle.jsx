import React, { useState } from 'react';
import { getTheme, setTheme } from './themeStorage';

const OPTIONS = [
    { id: 'system', label: 'Sistema' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
];

const ThemeToggle = () => {
    const [mode, setMode] = useState(getTheme);

    const pick = (id) => {
        setTheme(id);
        setMode(id);
    };

    return (
        <div className="theme-toggle-host" role="group" aria-label="Tema de la interfaz">
            <span className="theme-toggle-label">Tema</span>
            <div className="theme-toggle-group">
                {OPTIONS.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        className="theme-toggle-option"
                        aria-pressed={mode === id}
                        onClick={() => pick(id)}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ThemeToggle;
