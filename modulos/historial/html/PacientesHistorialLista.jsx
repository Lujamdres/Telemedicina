import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, removeToken } from '../../../assets/js/authSession';
import LoadingView from '../../../assets/js/LoadingView.jsx';
import MedicoSidebar from '../../citas/html/MedicoSidebar.jsx';
import '../../../assets/css/global.css';
import '../../citas/assets/css/medico-layout.css';
import '../assets/css/historial.css';

const PacientesHistorialLista = () => {
    const navigate = useNavigate();
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return undefined;
        }

        const load = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` };
                const resProfile = await axios.get('/api/auth/profile', { headers });
                const u = resProfile.data.data;
                setUser(u);
                if (u.role !== 'Medico') {
                    navigate('/dashboard');
                    return;
                }
                const res = await axios.get('/api/historial/mis-pacientes', { headers });
                setPacientes(res.data.data || []);
            } catch (e) {
                console.error(e);
                if (e.response?.status === 401) {
                    removeToken();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        load();
        return undefined;
    }, [navigate]);

    if (loading) {
        return (
            <div className="medico-app-layout">
                <MedicoSidebar />
                <div className="medico-app-main">
                    <LoadingView variant="embedded" message="Cargando pacientes…" />
                </div>
            </div>
        );
    }

    return (
        <div className="medico-app-layout">
            <MedicoSidebar />
            <div className="medico-app-main pacientes-historial-page">
                <div className="container">
                    <header className="header-flex">
                        <div>
                            <h1 className="title-primary">Pacientes e historias clínicas</h1>
                            <p className="text-muted-mb">
                                Listado de pacientes con cita <strong>completada</strong> o con registro clínico creado por{' '}
                                <strong>
                                    Dr. {user?.nombre} {user?.apellido}
                                </strong>
                                .
                            </p>
                        </div>
                    </header>

                    {pacientes.length === 0 ? (
                        <div className="citas-empty-state">
                            <p>
                                Aún no hay pacientes en este listado. Aparecerán cuando completes citas o añadas entradas al historial
                                clínico.
                            </p>
                        </div>
                    ) : (
                        <div className="glass-panel pacientes-historial-table-wrap">
                            <table className="pacientes-historial-table">
                                <thead>
                                    <tr>
                                        <th>Paciente</th>
                                        <th>Email</th>
                                        <th>Teléfono</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pacientes.map((p) => (
                                        <tr key={p._id}>
                                            <td>
                                                <strong>
                                                    {p.apellido}, {p.nombre}
                                                </strong>
                                            </td>
                                            <td>{p.email || '—'}</td>
                                            <td>{p.telefono || '—'}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm-auto"
                                                    onClick={() => navigate(`/historial/${p._id}`)}
                                                >
                                                    Ver historial
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PacientesHistorialLista;
