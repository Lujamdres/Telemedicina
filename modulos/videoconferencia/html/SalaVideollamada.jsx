import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../../../assets/js/authSession';
import LoadingView from '../../../assets/js/LoadingView.jsx';
import { createAppSocket } from '../../../assets/js/socketClient';
import Swal from 'sweetalert2';
import '../assets/css/videoconferencia.css';

const MS_5MIN = 5 * 60 * 1000;
const MS_6MIN = 6 * 60 * 1000;

function formatCountdown(ms) {
    if (ms <= 0) return '0:00';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
}

const SalaVideollamada = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();

    const [streamStatus, setStreamStatus] = useState('Iniciando cámara...');
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const socketRef = useRef(null);
    const iceCandidatesQueue = useRef([]);
    const messagesEndRef = useRef(null);
    const appointmentPollRef = useRef(null);
    const appointmentRef = useRef(null);
    const myProfileRef = useRef(null);
    const hasShownFiveMinPromptRef = useRef(false);

    const [messages, setMessages] = useState([]);
    const [currentMsg, setCurrentMsg] = useState('');
    const [myProfile, setMyProfile] = useState(null);
    const [appointment, setAppointment] = useState(null);
    const [absenceText, setAbsenceText] = useState('');
    const [extendedWaitRemainingMs, setExtendedWaitRemainingMs] = useState(null);
    const [recetaModalOpen, setRecetaModalOpen] = useState(false);
    const [recetaTexto, setRecetaTexto] = useState('');
    const [recetaSending, setRecetaSending] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    appointmentRef.current = appointment;
    myProfileRef.current = myProfile;

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' }
        ]
    };

    const loadAppointment = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await axios.get(`/api/appointments/room/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointment(res.data.data);
        } catch {
            /* ignore */
        }
    }, [roomId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if (!appointment?.esperaExtendidaHasta) {
            setExtendedWaitRemainingMs(null);
            return;
        }
        const tick = () => {
            const end = new Date(appointment.esperaExtendidaHasta).getTime();
            setExtendedWaitRemainingMs(Math.max(0, end - Date.now()));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [appointment?.esperaExtendidaHasta]);

    useEffect(() => {
        if (!appointment || !myProfile || !['Agendada', 'Programada', 'Completada'].includes(appointment.estado)) {
            setAbsenceText('');
            return;
        }
        if (appointment.estado === 'Completada') {
            setAbsenceText('');
            return;
        }
        const now = Date.now();
        const pJoin = appointment.pacienteJoinedAt ? new Date(appointment.pacienteJoinedAt).getTime() : null;
        const mJoin = appointment.medicoJoinedAt ? new Date(appointment.medicoJoinedAt).getTime() : null;
        let msg = '';
        if (myProfile.role === 'Medico' && mJoin && !pJoin && now > mJoin + MS_6MIN) {
            msg = 'Cita perdida por ausencia de paciente';
        }
        if (myProfile.role === 'Paciente' && pJoin && !mJoin && now > pJoin + MS_6MIN) {
            msg = 'Cita perdida por ausencia de médico';
        }
        setAbsenceText(msg);
    }, [appointment, myProfile]);

    useEffect(() => {
        if (appointment?.estado === 'Completada') {
            setStreamStatus('Consulta registrada como completada');
        }
    }, [appointment?.estado]);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return undefined;
        }

        socketRef.current = createAppSocket();
        const currentSocket = socketRef.current;

        const initWebRTC = async () => {
            try {
                const resProfile = await axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
                setMyProfile(resProfile.data.data);

                await loadAppointment();

                const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream;
                }
                setStreamStatus('Esperando al especialista o al paciente…');
                setSessionReady(true);

                currentSocket.emit('join-room', { roomId, token });

                appointmentPollRef.current = setInterval(loadAppointment, 15000);

                currentSocket.on('appointment-completed', () => {
                    loadAppointment();
                });

                currentSocket.on('user-joined', async () => {
                    setStreamStatus('Usuario conectado, iniciando conexión...');
                    peerConnectionRef.current = createPeerConnection(localStream);

                    const offer = await peerConnectionRef.current.createOffer();
                    await peerConnectionRef.current.setLocalDescription(offer);
                    currentSocket.emit('offer', offer, roomId);
                });

                currentSocket.on('offer', async (offer) => {
                    setStreamStatus('Llamada entrante, conectando...');
                    peerConnectionRef.current = createPeerConnection(localStream);

                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    currentSocket.emit('answer', answer, roomId);

                    setStreamStatus('¡Llamada conectada!');
                    processIceQueue();
                });

                currentSocket.on('answer', async (answer) => {
                    if (peerConnectionRef.current) {
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                        setStreamStatus('¡Llamada conectada!');
                        processIceQueue();
                    }
                });

                currentSocket.on('ice-candidate', async (candidate) => {
                    const rtcCandidate = new RTCIceCandidate(candidate);
                    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                        try {
                            await peerConnectionRef.current.addIceCandidate(rtcCandidate);
                        } catch (e) {
                            console.error('Error adding ICE', e);
                        }
                    } else {
                        iceCandidatesQueue.current.push(rtcCandidate);
                    }
                });

                currentSocket.on('chat-message', (data) => {
                    setMessages((prev) => [...prev, { ...data, isLocal: false }]);
                });

                currentSocket.on('user-disconnected', () => {
                    setStreamStatus('El otro participante se ha desconectado.');
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }
                });
            } catch (err) {
                console.error('Error al acceder a dispositivos:', err);
                setStreamStatus('Error: permisos de cámara o micrófono denegados o dispositivo ausente.');
                setSessionReady(true);
            }
        };

        initWebRTC();

        return () => {
            if (currentSocket) currentSocket.disconnect();
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            if (localVideoRef.current && localVideoRef.current.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            }
            if (appointmentPollRef.current) {
                clearInterval(appointmentPollRef.current);
                appointmentPollRef.current = null;
            }
        };
    }, [roomId, navigate, loadAppointment]);

    useEffect(() => {
        const checkInterval = setInterval(async () => {
            const appt = appointmentRef.current;
            const prof = myProfileRef.current;
            if (!appt || !prof || hasShownFiveMinPromptRef.current) return;
            if (!['Agendada', 'Programada'].includes(appt.estado)) return;
            if (appt.esperaExtendidaHasta) return;
            if (prof.role !== 'Paciente' && prof.role !== 'Medico') return;

            const pAt = appt.pacienteJoinedAt;
            const mAt = appt.medicoJoinedAt;
            const soloPacienteEnSala = Boolean(pAt && !mAt);
            const soloMedicoEnSala = Boolean(mAt && !pAt);
            if (!soloPacienteEnSala && !soloMedicoEnSala) return;

            const soyQuienEspera =
                (prof.role === 'Paciente' && soloPacienteEnSala) ||
                (prof.role === 'Medico' && soloMedicoEnSala);
            if (!soyQuienEspera) return;

            const miEntrada = prof.role === 'Paciente' ? pAt : mAt;
            const elapsed = Date.now() - new Date(miEntrada).getTime();
            if (elapsed < MS_5MIN) return;

            hasShownFiveMinPromptRef.current = true;

            const token = getToken();
            const result = await Swal.fire({
                title: '¿Seguir esperando?',
                html:
                    '<p style="text-align:left;margin:0 0 0.5rem">Han pasado <strong>5 minutos</strong> sin que se una la contraparte.</p>' +
                    '<p style="text-align:left;margin:0;font-size:0.92rem;color:#64748b">Puedes ampliar la espera <strong>hasta 30 minutos</strong> (contador en pantalla) o cancelar la cita. Si la contraparte entra en ese plazo, la consulta se registrará como <strong>completada</strong>.</p>',
                icon: 'question',
                showCancelButton: true,
                focusCancel: false,
                confirmButtonText: 'Sí, seguir esperando',
                cancelButtonText: 'No, cancelar cita',
                confirmButtonColor: '#4f46e5',
                cancelButtonColor: '#dc2626',
                allowOutsideClick: false
            });

            if (!result.isConfirmed) {
                try {
                    await axios.put(
                        `/api/appointments/${appt._id}/cancel`,
                        {
                            motivoCancelacion:
                                'El usuario decidió no continuar esperando en la videollamada tras el aviso de los 5 minutos.'
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    await Swal.fire({
                        icon: 'info',
                        title: 'Cita cancelada',
                        text: 'Puedes solicitar otra cita desde el panel.'
                    });
                } catch (e) {
                    hasShownFiveMinPromptRef.current = false;
                    await Swal.fire({
                        icon: 'error',
                        title: 'No se pudo cancelar',
                        text: e.response?.data?.message || 'Intenta de nuevo'
                    });
                    return;
                }
                navigate('/dashboard');
                return;
            }

            try {
                await axios.put(`/api/appointments/${appt._id}/extend-wait`, {}, { headers: { Authorization: `Bearer ${token}` } });
                await loadAppointment();
            } catch (e) {
                hasShownFiveMinPromptRef.current = false;
                await Swal.fire({
                    icon: 'error',
                    title: 'No se pudo ampliar la espera',
                    text: e.response?.data?.message || 'Intenta de nuevo'
                });
            }
        }, 2000);

        return () => clearInterval(checkInterval);
    }, [loadAppointment, navigate, roomId]);

    const processIceQueue = () => {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                peerConnectionRef.current.addIceCandidate(candidate).catch((e) => console.error(e));
            }
        }
    };

    const createPeerConnection = (stream) => {
        const pc = new RTCPeerConnection(rtcConfig);

        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', event.candidate, roomId);
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        return pc;
    };

    const handleColgar = async () => {
        const token = getToken();
        const appt = appointmentRef.current;
        try {
            if (
                token &&
                appt?._id &&
                ['Agendada', 'Programada'].includes(appt.estado) &&
                appt.esperaExtendidaHasta
            ) {
                const ext = new Date(appt.esperaExtendidaHasta).getTime();
                if (!Number.isNaN(ext) && Date.now() < ext && appt.estado !== 'Completada') {
                    await axios.put(
                        `/api/appointments/${appt._id}/cancel`,
                        {
                            motivoCancelacion:
                                'Salida de la videollamada durante el periodo de espera ampliada (30 min), sin completar la consulta.'
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            }
        } catch (e) {
            console.error(e);
        }
        navigate('/dashboard');
    };

    const puedeEmitirReceta =
        myProfile?.role === 'Medico' &&
        appointment?._id &&
        ['Agendada', 'Programada', 'Completada'].includes(appointment?.estado);

    const handleEnviarReceta = async (e) => {
        e.preventDefault();
        const texto = recetaTexto.trim();
        if (texto.length < 8) {
            Swal.fire({ icon: 'warning', title: 'Completa la receta', text: 'Escribe al menos 8 caracteres.' });
            return;
        }
        const token = getToken();
        if (!token || !appointment?._id) return;
        setRecetaSending(true);
        try {
            await axios.post(
                '/api/recetas',
                { appointmentId: appointment._id, contenido: texto },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await Swal.fire({
                icon: 'success',
                title: 'Receta enviada',
                text: 'El paciente la verá en «Mis recetas».',
                confirmButtonColor: '#4f46e5'
            });
            setRecetaModalOpen(false);
            setRecetaTexto('');
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo enviar',
                text: err.response?.data?.message || 'Intenta de nuevo.'
            });
        } finally {
            setRecetaSending(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!currentMsg.trim() || !myProfile) return;

        const messageData = {
            sender: myProfile.role === 'Medico' ? `Dr. ${myProfile.nombre} ${myProfile.apellido}` : myProfile.nombre,
            text: currentMsg
        };

        socketRef.current.emit('chat-message', messageData, roomId);

        setMessages((prev) => [...prev, { ...messageData, isLocal: true }]);
        setCurrentMsg('');
    };

    const soloPacienteEsperando = Boolean(appointment?.pacienteJoinedAt && !appointment?.medicoJoinedAt);
    const soloMedicoEsperando = Boolean(appointment?.medicoJoinedAt && !appointment?.pacienteJoinedAt);
    const soyQuienEsperaEnSala =
        myProfile &&
        (myProfile.role === 'Paciente' || myProfile.role === 'Medico') &&
        ((myProfile.role === 'Paciente' && soloPacienteEsperando) ||
            (myProfile.role === 'Medico' && soloMedicoEsperando));

    const showExtendedBanner =
        soyQuienEsperaEnSala &&
        appointment?.esperaExtendidaHasta &&
        ['Agendada', 'Programada'].includes(appointment.estado) &&
        extendedWaitRemainingMs != null;

    if (!sessionReady) {
        return <LoadingView message="Preparando videollamada…" />;
    }

    return (
        <div className="container-lg">
            <div className="glass-panel text-center">
                <h2 className="mb-1">Teleconsulta en vivo</h2>
                <div className="badge badge-Programada mb-2" style={{ display: 'inline-block' }}>
                    {streamStatus}
                </div>
                {showExtendedBanner && (
                    <p className="videollamada-wait-banner">
                        Espera ampliada: <strong>{formatCountdown(extendedWaitRemainingMs)}</strong> restantes. Si la
                        contraparte entra, la cita pasará a <strong>completada</strong>.
                    </p>
                )}
                {absenceText && (
                    <button type="button" className="btn btn-danger btn-sm-auto" style={{ margin: '0 auto 1rem' }}>
                        {absenceText}
                    </button>
                )}

                <div className="video-grid">
                    <div className="video-wrapper local">
                        <video ref={localVideoRef} autoPlay playsInline muted className="video-player mirrored"></video>
                        <span className="video-label">Tú</span>
                    </div>

                    <div className="video-wrapper remote">
                        <video ref={remoteVideoRef} autoPlay playsInline className="video-player mirrored"></video>
                        <span className="video-label">Paciente / Especialista</span>
                    </div>
                </div>

                {puedeEmitirReceta && (
                    <div className="videollamada-actions-medico">
                        <button type="button" className="btn btn-sm-auto" onClick={() => setRecetaModalOpen(true)}>
                            Emitir receta / tratamiento
                        </button>
                    </div>
                )}

                <button
                    className="btn btn-danger"
                    style={{ maxWidth: '220px', display: 'block', margin: '0 auto' }}
                    onClick={handleColgar}
                >
                    Cerrar teleconsulta
                </button>

                <div className="chat-container">
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <p
                                style={{
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    margin: 'auto',
                                    fontSize: '0.9rem'
                                }}
                            >
                                El chat está vacío. Escribe algo para saludar.
                            </p>
                        ) : (
                            messages.map((m, i) => (
                                <div key={i} className={`chat-msg ${m.isLocal ? 'local' : 'remote'}`}>
                                    <span className="chat-sender">{m.isLocal ? 'Tú' : m.sender}</span>
                                    {m.text}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chat-input-area" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Escribe tu mensaje aquí..."
                            value={currentMsg}
                            onChange={(e) => setCurrentMsg(e.target.value)}
                        />
                        <button type="submit" className="chat-btn">
                            Enviar
                        </button>
                    </form>
                </div>
            </div>

            {recetaModalOpen && (
                <div
                    className="videollamada-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="receta-modal-title"
                    onClick={(ev) => {
                        if (ev.target === ev.currentTarget) setRecetaModalOpen(false);
                    }}
                >
                    <div className="videollamada-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                        <h3 id="receta-modal-title" className="videollamada-modal-title">
                            Receta o indicaciones de tratamiento
                        </h3>
                        <p className="videollamada-modal-hint">
                            El texto se enviará al paciente y quedará en su listado «Mis recetas».
                        </p>
                        <form onSubmit={handleEnviarReceta}>
                            <label className="videollamada-modal-label" htmlFor="receta-contenido">
                                Contenido
                            </label>
                            <textarea
                                id="receta-contenido"
                                className="videollamada-modal-textarea"
                                rows={8}
                                value={recetaTexto}
                                onChange={(e) => setRecetaTexto(e.target.value)}
                                placeholder="Medicación, dosis, duración, recomendaciones…"
                                required
                                minLength={8}
                            />
                            <div className="videollamada-modal-buttons">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm-auto"
                                    onClick={() => setRecetaModalOpen(false)}
                                    disabled={recetaSending}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-sm-auto" disabled={recetaSending}>
                                    {recetaSending ? 'Enviando…' : 'Enviar al paciente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaVideollamada;
