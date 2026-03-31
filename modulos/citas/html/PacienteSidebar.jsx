import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { removeToken } from '../../../assets/js/authSession';
import MedConnectLogo from '../../../assets/js/MedConnectLogo.jsx';
import '../assets/css/medico-layout.css';

function linkClass({ isActive }) {
    return `medico-sidebar-link${isActive ? ' medico-sidebar-link--active' : ''}`;
}

const PacienteSidebar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        removeToken();
        navigate('/login');
    };

    return (
        <aside className="medico-sidebar" aria-label="Menú del paciente">
            <MedConnectLogo variant="sidebar" />
            <p className="medico-sidebar-title">Accesos</p>
            <nav className="medico-sidebar-nav">
                <NavLink to="/dashboard" end className={linkClass}>
                    Mis citas
                </NavLink>
                <NavLink to="/historial-citas" className={linkClass}>
                    Consultas completadas
                </NavLink>
                <NavLink to="/mis-recetas" className={linkClass}>
                    Mis recetas
                </NavLink>
                <NavLink to="/perfil" className={linkClass}>
                    Mi perfil
                </NavLink>
            </nav>
            <div className="medico-sidebar-footer">
                <button type="button" className="medico-sidebar-logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
};

export default PacienteSidebar;
