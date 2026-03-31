import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../../modulos/auth/html/Login';
import Register from '../../modulos/auth/html/Register';

import Dashboard from '../../modulos/citas/html/Dashboard';
import NuevaCita from '../../modulos/citas/html/NuevaCita';
import CalendarioMedico from '../../modulos/citas/html/CalendarioMedico';
import SalaVideollamada from '../../modulos/videoconferencia/html/SalaVideollamada';
import HistorialClinico from '../../modulos/historial/html/HistorialClinico';
import PacientesHistorialLista from '../../modulos/historial/html/PacientesHistorialLista';
import HistorialCitasCompletadas from '../../modulos/citas/html/HistorialCitasCompletadas';
import Perfil from '../../modulos/auth/html/Perfil';
import MisRecetas from '../../modulos/recetas/html/MisRecetas';
import ThemeToggle from './ThemeToggle';
import AppointmentNotifications from './AppointmentNotifications';
import IdleSessionMonitor from './IdleSessionMonitor';

const App = () => {
    return (
        <Router>
            <ThemeToggle />
            <AppointmentNotifications />
            <IdleSessionMonitor />
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/nueva-cita" element={<NuevaCita />} />
                <Route path="/medico/pacientes-historial" element={<PacientesHistorialLista />} />
                <Route path="/historial-citas" element={<HistorialCitasCompletadas />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/mis-recetas" element={<MisRecetas />} />
                <Route path="/calendario-medico" element={<CalendarioMedico />} />
                <Route path="/videollamada/:id" element={<SalaVideollamada />} />
                <Route path="/historial/:id" element={<HistorialClinico />} />
            </Routes>
        </Router>
    );
};

export default App;
