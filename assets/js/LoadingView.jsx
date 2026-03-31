import React from 'react';
import '../css/loading.css';

/**
 * @param {object} props
 * @param {string} [props.message]
 * @param {'fullscreen'|'embedded'|'compact'|'overlay'} [props.variant]
 * @param {string} [props.className]
 */
function LoadingView({ message = 'Cargando…', variant = 'fullscreen', className = '' }) {
    const rootClass = ['app-loading', `app-loading--${variant}`, className].filter(Boolean).join(' ');

    return (
        <div className={rootClass} role="status" aria-live="polite" aria-busy="true">
            <div className="app-loading-inner">
                <div className="app-loading-spinner-wrap" aria-hidden>
                    <div className="app-loading-spinner" />
                    <div className="app-loading-spinner app-loading-spinner--orbit" />
                </div>
                <p className="app-loading-message">{message}</p>
            </div>
        </div>
    );
}

export default LoadingView;
