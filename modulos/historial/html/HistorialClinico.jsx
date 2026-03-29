import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../../../assets/css/global.css';
import '../assets/css/historial.css'; // Estilos modulares

const HistorialClinico = () => {
    const { id: pacienteId } = useParams();
    const navigate = useNavigate();

    const [historiales, setHistoriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    // Estado para nuevo registro (Solo visible para médicos)
    const [formData, setFormData] = useState({
        motivoConsulta: '', diagnostico: '', tratamiento: '', notasEvolutivas: ''
    });
    const [archivo, setArchivo] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                // Obtener perfil para saber mi rol
                const resProfile = await axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
                setUserRole(resProfile.data.data.role);

                // Obtener los historiales del paciente
                const resHistorial = await axios.get(`/api/historial/paciente/${pacienteId}`, { headers: { Authorization: `Bearer ${token}` } });
                setHistoriales(resHistorial.data.data);
            } catch (err) {
                console.error("Error cargando historial", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [pacienteId, navigate]);

    const handleSubmitRegistro = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const formPayload = new FormData();
            formPayload.append('pacienteId', pacienteId);
            formPayload.append('motivoConsulta', formData.motivoConsulta);
            formPayload.append('diagnostico', formData.diagnostico);
            formPayload.append('tratamiento', formData.tratamiento);
            formPayload.append('notasEvolutivas', formData.notasEvolutivas);

            if (archivo) {
                formPayload.append('archivo', archivo);
            }

            const res = await axios.post('/api/historial', formPayload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Agregar a la lista superior
            setHistoriales([res.data.data, ...historiales]);
            setFormData({ motivoConsulta: '', diagnostico: '', tratamiento: '', notasEvolutivas: '' });
            setArchivo(null);

            Swal.fire({
                icon: 'success',
                title: 'Ficha Clínica Guardada',
                text: 'El historial médico se actualizó con éxito.',
                confirmButtonColor: '#4f46e5',
                background: '#f8fafc',
                customClass: {
                    popup: 'glass-panel'
                }
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Fallo al guardar',
                text: err.response?.data?.message || 'Revisa tu conexión o vuelve a intentar',
                confirmButtonColor: '#e74c3c'
            });
        }
    };

    if (loading) return <div className="empty-state">Cargando Historial Médico...</div>;

    return (
        <div className="historial-container">
            <div className="header-flex">
                <h1 className="title-primary">Expediente Clínico del Paciente</h1>
                <button className="btn btn-secondary btn-sm-auto" onClick={() => navigate('/dashboard')}>Volver al Panel</button>
            </div>

            {historiales.length === 0 ? (
                <div className="empty-state">
                    <p>No existen registros médicos anteriores para este paciente.</p>
                </div>
            ) : (
                <div className="historial-lista">
                    {historiales.map((record) => (
                        <div key={record._id} className="record-card">
                            <div className="record-header">
                                <span className="record-date">{new Date(record.createdAt).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <span className="badge-doctor">Dr. {record.medicoId?.nombre} {record.medicoId?.apellido}</span>
                            </div>
                            <div className="record-section">
                                <h4>Motivo de Consulta</h4>
                                <p>{record.motivoConsulta}</p>
                            </div>
                            <div className="record-section">
                                <h4>Diagnóstico</h4>
                                <p>{record.diagnostico}</p>
                            </div>
                            <div className="record-section">
                                <h4>Tratamiento Indicado</h4>
                                <p>{record.tratamiento}</p>
                            </div>
                            {record.notasEvolutivas && (
                                <div className="record-section">
                                    <h4>Notas Evolutivas</h4>
                                    <p>{record.notasEvolutivas}</p>
                                </div>
                            )}

                            {record.archivosAdjuntos && record.archivosAdjuntos.length > 0 && (
                                <div className="record-section" style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                                    <h4>Documentos Adjuntos</h4>
                                    {record.archivosAdjuntos.map((doc, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <span>📄 {doc.nombreArchivo}</span>
                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginLeft: 'auto', width: 'auto' }}>
                                                Descargar PDF/Imagen
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {userRole === 'Medico' && (
                <form className="form-historial" onSubmit={handleSubmitRegistro}>
                    <h3 className="title-primary mb-1">Añadir Nuevo Registro Evolutivo</h3>

                    <div className="form-group">
                        <label>Motivo de Consulta</label>
                        <input required type="text" value={formData.motivoConsulta} onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Diagnóstico Definitivo / Presuntivo</label>
                        <textarea required rows="2" value={formData.diagnostico} onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}></textarea>
                    </div>
                    <div className="form-group">
                        <label>Plan de Tratamiento</label>
                        <textarea required rows="3" value={formData.tratamiento} onChange={(e) => setFormData({ ...formData, tratamiento: e.target.value })}></textarea>
                    </div>
                    <div className="form-group">
                        <label>Notas Extras (Opcional)</label>
                        <textarea rows="2" value={formData.notasEvolutivas} onChange={(e) => setFormData({ ...formData, notasEvolutivas: e.target.value })}></textarea>
                    </div>

                    <div className="form-group" style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Adjuntar Receta o Laboratorio (Opcional)</label>
                        <input type="file" accept=".pdf, image/*" onChange={(e) => setArchivo(e.target.files[0])} style={{ width: '100%', padding: '0.5rem' }} />
                        {archivo && <p className="text-subtle" style={{ fontSize: '0.85rem' }}>Archivo seleccionado: {archivo.name}</p>}
                    </div>

                    <button type="submit" className="btn" style={{ marginTop: '1.5rem' }}>Guardar Ficha Clínica y Archivos</button>
                    <p className="text-subtle" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>* El archivo se protegerá y mostrará en el historial de este paciente de forma permanente.</p>
                </form>
            )}
        </div>
    );
};

export default HistorialClinico;
