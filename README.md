# Telemedicina LUI - Plataforma de Consultas Médicas en Vivo

Una plataforma completa de telemedicina que conecta pacientes con médicos a través de videollamadas y chat en vivo, construida con React, Node.js y WebRTC.

## Características Principales

- Videollamadas en tiempo real con WebRTC y Socket.io
- Chat interactivo durante las consultas
- Registro y autenticación de pacientes y médicos
- Gestión de citas médicas
- Historial clínico digital
- Interfaz moderna con diseño glassmorphism
- Responsive design para todos los dispositivos

## Demo en Vivo

**[Demo desplegada en CubePath](https://tu-demo.cubepath.io)** - *Próximamente*

## Capturas de Pantalla

### Registro de Usuarios
![Registro](screenshots/registro.png)

### Dashboard Principal
![Dashboard](screenshots/dashboard.png)

### Videollamada con Chat
![Videollamada](screenshots/videollamada.png)

### Gestión de Citas
![Citas](screenshots/citas.png)

## Stack Tecnológico

### Frontend
- **React 19.2.4** - Framework principal
- **Vite 8.0.3** - Build tool y desarrollo
- **React Router DOM 7.13.2** - Navegación
- **Axios 1.14.0** - Cliente HTTP
- **Socket.io Client 4.8.3** - Comunicación en tiempo real

### Backend
- **Node.js** - Runtime del servidor
- **Express 5.2.1** - Framework web
- **Socket.io 4.8.3** - WebSockets para videollamadas
- **MongoDB con Mongoose 9.3.3** - Base de datos
- **JWT** - Autenticación
- **Multer** - Manejo de archivos

### Comunicación en Tiempo Real
- **WebRTC** - Videollamadas peer-to-peer
- **STUN Servers de Google** - NAT traversal
- **Socket.io** - Señalización y chat

## Funcionalidades Médicas

### Para Pacientes
- Registro seguro de datos personales
- Solicitar citas con especialistas
- Consultas virtuales en tiempo real
- Chat durante la consulta
- Acceso al historial médico
- Recordatorios de citas

### Para Médicos
- Perfil profesional con especialidad
- Gestión de agenda de pacientes
- Consultas virtuales seguras
- Comunicación directa con pacientes
- Historial clínico de pacientes
- Recetas digitales


## Arquitectura del Sistema

```
├── core/                   # Backend principal
│   ├── index.js           # Servidor Express + Socket.io
│   ├── config.js          # Configuración
│   ├── db.js              # Conexión MongoDB
│   └── middlewares/       # Middleware de autenticación
├── modulos/               # Módulos de funcionalidad
│   ├── auth/              # Autenticación de usuarios
│   ├── citas/             # Gestión de citas
│   ├── historial/         # Historial médico
│   └── videoconferencia/  # Videollamadas + chat
├── assets/                # Frontend
│   ├── css/               # Estilos globales
│   └── js/                # Componentes React
└── uploads/               # Archivos subidos
```

## Flujo de Videollamada

1. **Paciente solicita cita** → Se genera roomId único
2. **Ambos usuarios entran** a sala de videollamada
3. **Socket.io maneja señalización** WebRTC
4. **Conexión P2P directa** para video/audio
5. **Chat paralelo** vía Socket.io
6. **Desconexión automática** al finalizar


**Repositorio**: https://github.com/Lujamdres/Telemedicina

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## Contacto

- **Desarrolladores**: Lujamdres y Cawtell
- **GitHub**: [@Lujamdres](https://github.com/Lujamdres) y [@HaiverGuerrero](https://github.com/HaiverGuerrero)
- **Portfolio**: [luidev.gt.tc](http://luidev.gt.tc/)
- **Demo**: [telemedicina-lui.cubepath.io](https://telemedicina-lui.cubepath.io)

---

**Hecho con React para el Hackathon CubePath 2026**
