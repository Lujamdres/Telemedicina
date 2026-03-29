import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist'
    },
    server: {
        port: 3000,
        allowedHosts: ['.trycloudflare.com', 'all', true],
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://localhost:5000',
                ws: true
            }
        }
    }
});
