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

## Despliegue en CubePath

Este proyecto está optimizado para despliegue en CubePath siguiendo estos pasos:

### 1. Configuración del Entorno

```bash
# Clonar el repositorio
git clone https://github.com/Lujamdres/Telemedicina.git
cd Telemedicina

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### 2. Variables de Entorno para CubePath

```env
# Base de datos MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telemedicina

# JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRES_IN=7d

# Puerto del servidor
PORT=5000

# CubePath específico
CUBEPATH_MODE=production
NODE_ENV=production
```

### 3. Build y Deploy

```bash
# Build del frontend
npm run build

# Iniciar servidor en modo producción
npm start
```

### 4. Configuración en CubePath

1. **Crear cuenta** en [midu.link/cubepath](https://midu.link/cubepath)
2. **Nuevo proyecto** con estos settings:
   - **Runtime**: Node.js
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Configurar las mencionadas arriba
3. **Dominio personalizado** (opcional)
4. **Deploy automático** desde GitHub

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

## Modelo de Datos

### Usuario (Patient/Doctor)
```javascript
{
  nombre: String,
  apellido: String,
  email: String,
  password: String, // Hasheado con bcrypt
  role: 'Paciente' | 'Medico',
  especialidad: String, // Solo para médicos
  telefono: String
}
```

### Cita Médica
```javascript
{
  paciente: ObjectId,
  medico: ObjectId,
  fecha: Date,
  estado: 'Pendiente' | 'Confirmada' | 'Completada',
  roomId: String, // Para videollamada
  motivo: String
}
```

### Historial Médico
```javascript
{
  paciente: ObjectId,
  medico: ObjectId,
  fecha: Date,
  diagnostico: String,
  tratamiento: String,
  recetas: [String],
  archivos: [String] // URLs de archivos
}
```

## Testing y QA

### Tests Funcionales
- Registro de usuarios (Paciente/Médico)
- Login y autenticación JWT
- Creación y gestión de citas
- Videollamadas WebRTC
- Chat en tiempo real
- Historial clínico

### Tests de Rendimiento
- Carga de página < 2s
- Latencia de video < 200ms
- Mensajes instantáneos
- Responsive en móviles

## Contribución

1. **Fork** el proyecto
2. **Branch** con tu feature: `git checkout -feature/nueva-funcionalidad`
3. **Commit** tus cambios: `git commit -m 'Agregando nueva funcionalidad'`
4. **Push** al branch: `git push origin feature/nueva-funcionalidad`
5. **Pull Request** para revisión

**Repositorio**: https://github.com/Lujamdres/Telemedicina

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## Hackathon CubePath

Este proyecto participa en el Hackathon CubePath cumpliendo con:

- **Proyecto nuevo** sin usuarios reales previos
- **Desplegado en CubePath** con $15 de crédito
- **Repositorio público** con documentación completa
- **README.md** detallado con capturas y demo
- **Registro via Issue** en repositorio oficial
- **Proyecto funcional** y listo para revisión

## Contacto

- **Desarrolladores**: Lujamdres y Cawtell
- **GitHub**: [@Lujamdres](https://github.com/Lujamdres) y [@HaiverGuerrero](https://github.com/HaiverGuerrero)
- **Portfolio**: [luidev.gt.tc](http://luidev.gt.tc/)
- **Email**: lujamdres@example.com
- **Demo**: [telemedicina-lui.cubepath.io](https://telemedicina-lui.cubepath.io)

---

**Hecho con React para el Hackathon CubePath 2026**
