import axios from 'axios';

// En desarrollo con Vite, usar proxy. En producción build, usar IP directa.
const baseURL = (import.meta.env.DEV) 
  ? 'http://localhost:5000'       // Desarrollo con proxy
  : 'http://144.225.147.105:5000';  // Producción - backend separado

const api = axios.create({
  baseURL,
  withCredentials: false,
});

export default api;
