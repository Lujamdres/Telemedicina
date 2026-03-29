import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../../../assets/css/global.css';

const NuevaCita = () => {
    const navigate = useNavigate();
    const [medicos, setMedicos] = useState([]);
    const [formData, setFormData] = useState({ medicoId: '', fechaHora: '', motivoConsulta: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchMedicos = async () => {
            try {
                const res = await axios.get('/api/auth/medicos', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMedicos(res.data.data);
                if (res.data.data.length > 0) {
                    setFormData(prev => ({ ...prev, medicoId: res.data.data[0]._id }));
                }
            } catch (err) {
                console.error("Error al cargar médicos", err);
            }
        };
        fetchMedicos();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/appointments', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: '¡Cita Agendada!',
                text: 'Tu cita se ha programado correctamente.',
                confirmButtonColor: '#4f46e5',
                background: '#f8fafc',
                customClass: { popup: 'glass-panel' }
            }).then(() => {
                navigate('/dashboard');
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo agendar',
                text: err.response?.data?.message || 'Error al conectar con el servidor',
                confirmButtonColor: '#e74c3c'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-sm">
            <div className="glass-panel">
                <h2>Agendar Nueva Cita</h2>
                <p className="text-muted-mb">Selecciona tu médico de preferencia, el horario y cuéntanos el motivo.</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Especialista (Médico)</label>
                        <select
                            value={formData.medicoId}
                            onChange={(e) => setFormData({ ...formData, medicoId: e.target.value })}
                            required
                        >
                            <option value="" disabled>Seleccione un médico</option>
                            {medicos.map(medico => (
                                <option key={medico._id} value={medico._id}>
                                    Dr. {medico.nombre} {medico.apellido} - {medico.especialidad}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Fecha y Hora</label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.fechaHora}
                            onChange={(e) => setFormData({ ...formData, fechaHora: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Motivo de la Consulta</label>
                        <textarea
                            rows="3"
                            required
                            placeholder="Describe brevemente tus síntomas o el motivo de la consulta..."
                            value={formData.motivoConsulta}
                            onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex-gap-1">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn" disabled={loading}>
                            {loading ? 'Agendando...' : 'Confirmar Cita'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NuevaCita;
