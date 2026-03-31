import React from 'react';
import ReactDOM from 'react-dom/client';
import { initTheme } from './themeStorage';
import App from './App';
import '../css/global.css';

initTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
