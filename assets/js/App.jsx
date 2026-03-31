import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../../modulos/auth/html/Login';
import Register from '../../modulos/auth/html/Register';

import Dashboard from '../../modulos/citas/html/Dashboard';
import NuevaCita from '../../modulos/citas/html/NuevaCita';
import CalendarioMedico from '../../modulos/citas/html/CalendarioMedico';
import SalaVideollamada from '../../modulos/videoconferencia/html/SalaVideollamada';
import HistorialClinico from '../../modulos/historial/html/HistorialClinico';
import ThemeToggle from './ThemeToggle';

const App = () => {
    return (
        <Router>
            <ThemeToggle />
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/nueva-cita" element={<NuevaCita />} />
                <Route path="/calendario-medico" element={<CalendarioMedico />} />
                <Route path="/videollamada/:id" element={<SalaVideollamada />} />
                <Route path="/historial/:id" element={<HistorialClinico />} />
            </Routes>
        </Router>
    );
};

export default App;
