import axios from 'axios';

// En desarrollo con Vite, usar proxy. En producción build, usar IP directa.
const baseURL = (import.meta.env.DEV) 
  ? 'http://localhost:5000'       // Desarrollo con proxy
  : 'http://144.225.147.105:8080';  // Producción - backend en puerto 8080

const api = axios.create({
  baseURL,
  withCredentials: false,
});

export default api;
