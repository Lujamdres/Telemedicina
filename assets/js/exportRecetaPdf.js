function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Abre una ventana lista para imprimir o guardar como PDF (elige «Guardar como PDF» en el diálogo).
 * @param {object} receta
 * @param {string} pacienteNombre
 */
export function downloadRecetaPdf(receta, pacienteNombre) {
    const med = receta.medico;
    const nombreMed = med ? `Dr. ${med.nombre || ''} ${med.apellido || ''}`.trim() : '—';
    const fecha = receta.fechaEmision
        ? new Date(receta.fechaEmision).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
        : '—';
    const esp = med?.especialidad ? `<p class="meta"><strong>Especialidad:</strong> ${escapeHtml(med.especialidad)}</p>` : '';

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Receta</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; padding: 2rem; max-width: 640px; margin: 0 auto; color: #111; }
  h1 { font-size: 1.25rem; margin-bottom: 1rem; }
  .meta { font-size: 0.9rem; color: #333; margin: 0.35rem 0; }
  .box { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #ccc; white-space: pre-wrap; line-height: 1.5; font-size: 0.95rem; }
  .actions { margin-top: 1.5rem; }
  button { padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; border-radius: 8px; border: 1px solid #4f46e5; background: #4f46e5; color: #fff; }
  @media print { .actions { display: none; } body { padding: 1rem; } }
</style></head><body>
<h1>Receta / indicaciones de tratamiento</h1>
<p class="meta"><strong>Paciente:</strong> ${escapeHtml(pacienteNombre || '—')}</p>
<p class="meta"><strong>Médico:</strong> ${escapeHtml(nombreMed)}</p>
${esp}
<p class="meta"><strong>Fecha de emisión:</strong> ${escapeHtml(fecha)}</p>
<div class="box">${escapeHtml(receta.contenido || '')}</div>
<div class="actions">
  <p style="font-size:0.85rem;color:#555;margin-bottom:0.5rem;">Para guardar en PDF: pulsa el botón y, en impresión, elige «Guardar como PDF».</p>
  <button type="button" onclick="window.print()">Imprimir / guardar PDF</button>
</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
        window.alert('Permite ventanas emergentes para exportar la receta.');
        return;
    }
    w.document.write(html);
    w.document.close();
}
