import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../assets/css/global.css'; // Estilos base
import '../assets/css/citas.css'; // Estilos del módulo

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    // Cargar perfil y citas
    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchDatos = async () => {
            try {
                // Configurar header genérico para axios
                const config = { headers: { Authorization: `Bearer ${token}` } };

                // 1. Obtener mi perfil
                const resProfile = await axios.get('/api/auth/profile', config);
                setUser(resProfile.data.data);

                // 2. Obtener mis citas (ya sean de paciente o médico)
                const resCitas = await axios.get('/api/appointments', config);
                setCitas(resCitas.data.data);

                setLoading(false);
            } catch (error) {
                console.error("Error al cargar datos:", error);
                localStorage.removeItem('token');
                navigate('/login');
            }
        };

        fetchDatos();
    }, [navigate, token]);

    const handleCrearCitaClick = () => {
        navigate('/nueva-cita');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) return <div className="empty-state">Cargando sistema de Telemedicina...</div>;

    return (
        <div className="container">
            <header className="header-flex">
                <div>
                    <h1 className="title-primary">Panel de {user?.role}</h1>
                    <p>Bienvenido, <strong>{user?.nombre} {user?.apellido}</strong> {user?.especialidad && `(${user.especialidad})`}</p>
                </div>
                <button className="btn btn-danger btn-sm-auto" onClick={handleLogout}>Cerrar Sesión</button>
            </header>

            <section>
                <div className="flex-between">
                    <h2>Mis Citas</h2>
                    {user?.role === 'Paciente' && (
                        <button className="btn btn-sm-auto" onClick={handleCrearCitaClick}>
                            + Nueva Cita
                        </button>
                    )}
                </div>

                {citas.length === 0 ? (
                    <div className="citas-empty-state">
                        <p>No tienes citas programadas actualmente.</p>
                    </div>
                ) : (
                    <div className="citas-grid">
                        {citas.map(cita => (
                            <div key={cita._id} className="cita-card-item">
                                <div className="flex-between">
                                    <h3>{new Date(cita.fechaHora).toLocaleString()}</h3>
                                    <span className={`badge badge-${cita.estado}`}>{cita.estado}</span>
                                </div>
                                <p className="text-subtle">
                                    <strong>Con:</strong> {user?.role === 'Paciente' ? `Dr. ${cita.medico.nombre} ${cita.medico.apellido}` : `${cita.paciente.nombre} ${cita.paciente.apellido}`}
                                </p>
                                <p className="text-muted-mb">
                                    <strong>Motivo:</strong> {cita.motivoConsulta}
                                </p>

                                <div className="flex-gap-1" style={{ marginTop: '1rem' }}>
                                    {cita.estado === 'Programada' && (
                                        <button className="btn btn-center-block" onClick={() => navigate(`/videollamada/${cita.enlaceVideollamada}`)}>
                                            Unirse a Llamada
                                        </button>
                                    )}
                                    <button className="btn btn-secondary btn-center-block" onClick={() => navigate(`/historial/${user?.role === 'Paciente' ? user._id : cita.paciente._id}`)}>
                                        Expediente Clínico
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Dashboard;
