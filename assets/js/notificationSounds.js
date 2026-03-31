/**
 * Pitidos breves vía Web Audio API (sin archivos externos).
 * @param {'success' | 'reminder' | 'urgent'} kind
 */
export function playNotificationSound(kind) {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();

        const tone = (freq, t0, dur, vol = 0.09) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = freq;
            o.type = 'sine';
            g.gain.value = vol;
            o.start(ctx.currentTime + t0);
            o.stop(ctx.currentTime + t0 + dur);
        };

        if (kind === 'success') {
            tone(659.25, 0, 0.11);
            tone(783.99, 0.13, 0.14);
        } else if (kind === 'reminder') {
            tone(440, 0, 0.2);
        } else {
            tone(523.25, 0, 0.1);
            tone(523.25, 0.18, 0.1);
            tone(659.25, 0.38, 0.16);
        }

        setTimeout(() => {
            try {
                ctx.close();
            } catch {
                /* ignore */
            }
        }, 900);
    } catch {
        /* autoplay o AudioContext no disponible */
    }
}
