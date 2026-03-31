import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { getToken, removeToken } from '../../../assets/js/authSession';
import LoadingView from '../../../assets/js/LoadingView.jsx';
import { downloadRecetaPdf } from '../../../assets/js/exportRecetaPdf';
import PacienteSidebar from '../../citas/html/PacienteSidebar.jsx';
import '../../../assets/css/global.css';
import '../../citas/assets/css/medico-layout.css';
import '../assets/css/recetas.css';

const MisRecetas = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [recetas, setRecetas] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const resProfile = await axios.get('/api/auth/profile', { headers });
            const u = resProfile.data.data;
            setUser(u);
            if (u.role !== 'Paciente') {
                navigate('/dashboard');
                return;
            }
            const res = await axios.get('/api/recetas/mis-recetas', { headers });
            setRecetas(res.data.data || []);
        } catch (e) {
            console.error(e);
            if (e.response?.status === 401) {
                removeToken();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        load();
    }, [load]);

    const pacienteNombre = user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() : '';

    const handleExportPdf = (receta) => {
        try {
            downloadRecetaPdf(receta, pacienteNombre);
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: 'No se pudo generar el PDF' });
        }
    };

    if (loading) {
        return <LoadingView message="Cargando recetas…" />;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="medico-app-layout">
            <PacienteSidebar />
            <div className="medico-app-main recetas-page">
                <div className="container">
                    <header className="header-flex">
                        <div>
                            <h1 className="title-primary">Mis recetas</h1>
                            <p className="recetas-page-hint">
                                Tratamientos e indicaciones emitidos por tus médicos durante las teleconsultas. Puedes
                                abrir cada receta e imprimirla o guardarla como PDF desde el navegador.
                            </p>
                        </div>
                    </header>

                    {recetas.length === 0 ? (
                        <div className="citas-empty-state">
                            <p>Aún no tienes recetas registradas.</p>
                        </div>
                    ) : (
                        <div className="glass-panel recetas-list-wrap">
                            <ul className="recetas-list">
                                {recetas.map((r) => {
                                    const med = r.medico;
                                    const docNombre = med ? `Dr. ${med.nombre || ''} ${med.apellido || ''}`.trim() : '—';
                                    const fechaStr = r.fechaEmision
                                        ? new Date(r.fechaEmision).toLocaleString('es-ES', {
                                              dateStyle: 'medium',
                                              timeStyle: 'short'
                                          })
                                        : '—';
                                    return (
                                        <li key={r._id} className="recetas-card">
                                            <div className="recetas-card-head">
                                                <div>
                                                    <p className="recetas-card-meta">
                                                        <strong>{docNombre}</strong>
                                                        {med?.especialidad && (
                                                            <span className="recetas-card-esp"> · {med.especialidad}</span>
                                                        )}
                                                    </p>
                                                    <p className="recetas-card-fecha">Emitida: {fechaStr}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm-auto"
                                                    onClick={() => handleExportPdf(r)}
                                                >
                                                    Imprimir / PDF
                                                </button>
                                            </div>
                                            <div className="recetas-card-body">
                                                <p className="recetas-card-contenido">{r.contenido}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MisRecetas;
