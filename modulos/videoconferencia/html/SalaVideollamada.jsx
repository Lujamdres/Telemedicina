import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../assets/css/videoconferencia.css'; // Estilos específicos del módulo

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

    // Chat States
    const [messages, setMessages] = useState([]);
    const [currentMsg, setCurrentMsg] = useState('');
    const [myProfile, setMyProfile] = useState(null);

    // Solo usamos STUN servers hiper-confiables.
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' }
        ]
    };

    // Auto-scroll chat
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        socketRef.current = io('/', { transports: ['websocket', 'polling'] });
        const currentSocket = socketRef.current;

        const initWebRTC = async () => {
            try {
                // Instanciar perfil para el Chat
                const resProfile = await axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
                setMyProfile(resProfile.data.data);

                const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream;
                }
                setStreamStatus('Esperando al Especialista/Paciente...');

                currentSocket.emit('join-room', roomId);

                currentSocket.on('user-joined', async (userId) => {
                    setStreamStatus('Usuario conectado, iniciando conexión...');
                    peerConnectionRef.current = createPeerConnection(localStream);

                    const offer = await peerConnectionRef.current.createOffer();
                    await peerConnectionRef.current.setLocalDescription(offer);
                    currentSocket.emit('offer', offer, roomId);
                });

                currentSocket.on('offer', async (offer, senderId) => {
                    setStreamStatus('Llamada entrante, conectando...');
                    peerConnectionRef.current = createPeerConnection(localStream);

                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    currentSocket.emit('answer', answer, roomId);

                    setStreamStatus('¡Llamada Conectada!'); // Asegura que el Paciente sepa que se conectó
                    processIceQueue();
                });

                currentSocket.on('answer', async (answer, senderId) => {
                    if (peerConnectionRef.current) {
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                        setStreamStatus('¡Llamada Conectada!'); // Asegura que el Doctor sepa que se conectó
                        processIceQueue();
                    }
                });

                currentSocket.on('ice-candidate', async (candidate, senderId) => {
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

                // Escuchar Chat
                currentSocket.on('chat-message', (data) => {
                    // Si recibimos esto, vino de la otra persona, isLocal es false
                    setMessages(prev => [...prev, { ...data, isLocal: false }]);
                });

                // Escuchar desconexión del otro usuario
                currentSocket.on('user-disconnected', () => {
                    setStreamStatus('El otro participante se ha desconectado.');
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }
                });

            } catch (err) {
                console.error("Error al acceder a dispositivos:", err);
                setStreamStatus('Error: Permisos de cámara o micrófono denegados o dispositivo ausente.');
            }
        };

        initWebRTC();

        return () => {
            if (currentSocket) currentSocket.disconnect();
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            if (localVideoRef.current && localVideoRef.current.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [roomId, navigate]);

    const processIceQueue = () => {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                peerConnectionRef.current.addIceCandidate(candidate).catch(e => console.error(e));
            }
        }
    };

    const createPeerConnection = (stream) => {
        const pc = new RTCPeerConnection(rtcConfig);

        stream.getTracks().forEach(track => {
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

    const handleColgar = () => {
        navigate('/dashboard');
    };

    // --- Lógica del Chat ---
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!currentMsg.trim() || !myProfile) return;

        const messageData = {
            sender: myProfile.role === 'Medico' ? `Dr. ${myProfile.nombre} ${myProfile.apellido}` : myProfile.nombre,
            text: currentMsg
        };

        // Emitir vía socket al otro navegador
        socketRef.current.emit('chat-message', messageData, roomId);

        // Agregarlo yo mismo localmente de inmediato
        setMessages(prev => [...prev, { ...messageData, isLocal: true }]);
        setCurrentMsg('');
    };

    return (
        <div className="container-lg">
            <div className="glass-panel text-center">
                <h2 className="mb-1">Teleconsulta en Vivo</h2>
                <div className="badge badge-Programada mb-2" style={{ display: 'inline-block' }}>
                    {streamStatus}
                </div>

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

                {/* BOTON DE COLGAR */}
                <button className="btn btn-danger" style={{ maxWidth: '200px', display: 'block', margin: '0 auto' }} onClick={handleColgar}>Cerrar Teleconsulta</button>

                {/* ÁREA DE CHAT EN VIVO */}
                <div className="chat-container">
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', fontSize: '0.9rem' }}>El chat está vacío. Escribe algo para saludar.</p>
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
                            placeholder="Escribe tu mensaje interactivo aquí..."
                            value={currentMsg}
                            onChange={e => setCurrentMsg(e.target.value)}
                        />
                        <button type="submit" className="chat-btn">Enviar</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SalaVideollamada;
