import React from 'react';
import '../css/medconnect-logo.css';

/**
 * Logotipo MedConnect construido solo con CSS (emblema + texto).
 * @param {'hero'|'auth'|'header'|'sidebar'} [props.variant] — hero: panel lateral auth (grande)
 * @param {string} [props.className]
 */
function MedConnectLogo({ variant = 'header', className = '' }) {
    const rootClass = ['medconnect-logo', `medconnect-logo--${variant}`, className].filter(Boolean).join(' ');

    return (
        <div className={rootClass} role="img" aria-label="MedConnect">
            <div className="mcl-emblem" aria-hidden="true">
                <div className="mcl-ring" />
                <div className="mcl-scene">
                    <div className="mcl-rays">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="mcl-cross" />
                    <div className="mcl-wings" />
                    <div className="mcl-tower" />
                    <div className="mcl-wave" />
                </div>
            </div>
            <div className="mcl-wordmark" aria-hidden="true">
                <span className="mcl-txt-med">Med</span>
                <span className="mcl-txt-connect">Connect</span>
            </div>
        </div>
    );
}

export default MedConnectLogo;
