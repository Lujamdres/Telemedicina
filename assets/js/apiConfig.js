import axios from 'axios';

// Configurar baseURL según el entorno
const baseURL = import.meta.env.PROD 
  ? 'http://144.225.147.105:5000'  // Producción - IP del VPS
  : 'http://localhost:5000';       // Desarrollo

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
