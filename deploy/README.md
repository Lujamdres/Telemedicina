# Despliegue en el servidor (proxy inverso)

La aplicación en Docker escucha en **`127.0.0.1:5000`**. Estos archivos configuran **Nginx** o **Caddy** en el VPS para exponer **80/443** con WebSockets (Socket.io y videollamada).

## Nginx

1. Instala Nginx en el host (no dentro del contenedor).
2. Copia la plantilla del repo:

   ```bash
   sudo cp deploy/nginx-medconnect.conf /etc/nginx/sites-available/medconnect
   ```

3. Edita `server_name` si usas un dominio concreto (o deja `_` para aceptar cualquier `Host`).
4. Activa el sitio y recarga:

   ```bash
   sudo ln -sf /etc/nginx/sites-available/medconnect /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. Para TLS, usa **certbot** (`certbot --nginx -d tu-dominio.com`) o descomenta y adapta el bloque `443` comentado al final de `nginx-medconnect.conf`.

## Caddy

1. Instala [Caddy](https://caddyserver.com/docs/install) en el VPS.
2. Copia el Caddyfile del repo, por ejemplo:

   ```bash
   sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
   ```

3. Si usas dominio con HTTPS automático, comenta el bloque `:80`, descomenta el bloque con tu dominio y ajusta `email` en el bloque global.
4. Valida y arranca:

   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl enable --now caddy
   ```

## Variables de entorno

En la **raíz del proyecto** (donde está `docker-compose.yml`), el archivo **`.env`** debe definir al menos `JWT_SECRET`. Plantilla: **`.env.example`** en el repositorio.
