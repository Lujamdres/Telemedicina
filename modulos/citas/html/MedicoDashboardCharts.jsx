import React, { useEffect, useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LabelList,
} from 'recharts';

function padLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseLocalDate(s) {
    const [y, mo, da] = s.split('-').map(Number);
    return new Date(y, mo - 1, da);
}

function enumerateDays(fromStr, toStr) {
    const from = parseLocalDate(fromStr);
    const to = parseLocalDate(toStr);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    if (from > to) return [];
    const days = [];
    const cur = new Date(from);
    while (cur <= to) {
        days.push(padLocalDate(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

function defaultDateRange() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 29);
    return { from: padLocalDate(from), to: padLocalDate(to) };
}

function useMedicoChartTheme() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const el = document.documentElement;
        const bump = () => setTick((t) => t + 1);
        const mo = new MutationObserver(bump);
        mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
        return () => mo.disconnect();
    }, []);
    return useMemo(() => {
        const s = getComputedStyle(document.documentElement);
        return {
            text: s.getPropertyValue('--text-dark').trim() || '#1e293b',
            muted: s.getPropertyValue('--text-muted').trim() || '#64748b',
            primary: s.getPropertyValue('--primary').trim() || '#4f46e5',
            danger: s.getPropertyValue('--danger').trim() || '#ef4444',
            success: s.getPropertyValue('--success').trim() || '#10b981',
            grid: s.getPropertyValue('--card-border').trim() || '#e2e8f0',
        };
    }, [tick]);
}

function MedicoDashboardCharts({ citas }) {
    const theme = useMedicoChartTheme();
    const donutColors = useMemo(
        () => ({
            Pendientes: '#d97706',
            Agendadas: theme.primary,
            Perdidas: theme.danger,
        }),
        [theme.primary, theme.danger]
    );

    const [range, setRange] = useState(defaultDateRange);

    const donutData = useMemo(() => {
        let pend = 0;
        let agen = 0;
        let perd = 0;
        for (const c of citas) {
            if (c.estado === 'Pendiente') pend += 1;
            else if (['Agendada', 'Programada'].includes(c.estado)) agen += 1;
            else if (c.estado === 'Perdida') perd += 1;
        }
        return [
            { name: 'Pendientes', value: pend, key: 'Pendientes' },
            { name: 'Agendadas', value: agen, key: 'Agendadas' },
            { name: 'Perdidas', value: perd, key: 'Perdidas' },
        ];
    }, [citas]);

    const donutTotal = donutData.reduce((a, d) => a + d.value, 0);

    const barData = useMemo(() => {
        const days = enumerateDays(range.from, range.to);
        const sets = {};
        days.forEach((d) => {
            sets[d] = new Set();
        });
        const fromD = parseLocalDate(range.from);
        const toD = parseLocalDate(range.to);
        fromD.setHours(0, 0, 0, 0);
        toD.setHours(23, 59, 59, 999);

        for (const c of citas) {
            if (c.estado !== 'Completada') continue;
            const fh = new Date(c.fechaHora);
            if (Number.isNaN(fh.getTime()) || fh < fromD || fh > toD) continue;
            const key = padLocalDate(fh);
            if (!sets[key]) continue;
            const pid = c.paciente?._id != null ? String(c.paciente._id) : c.paciente ? String(c.paciente) : '';
            if (pid) sets[key].add(pid);
        }

        return days.map((d) => ({
            fecha: d,
            label: new Date(d + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }),
            pacientes: sets[d].size,
        }));
    }, [citas, range.from, range.to]);

    const onFromChange = (e) => {
        const v = e.target.value;
        setRange((r) => {
            if (!v) return r;
            if (parseLocalDate(v) > parseLocalDate(r.to)) return { from: v, to: v };
            return { ...r, from: v };
        });
    };

    const onToChange = (e) => {
        const v = e.target.value;
        setRange((r) => {
            if (!v) return r;
            if (parseLocalDate(r.from) > parseLocalDate(v)) return { from: v, to: v };
            return { ...r, to: v };
        });
    };

    const tooltipDonut = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0];
        const pct = donutTotal ? ((p.value / donutTotal) * 100).toFixed(1) : '0';
        return (
            <div className="medico-chart-tooltip">
                <strong>{p.name}</strong>
                <span>
                    {p.value} ({pct}%)
                </span>
            </div>
        );
    };

    const tooltipBar = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="medico-chart-tooltip">
                <strong>{label}</strong>
                <span>
                    {payload[0].value} paciente{payload[0].value !== 1 ? 's' : ''} atendido{payload[0].value !== 1 ? 's' : ''}
                </span>
            </div>
        );
    };

    return (
        <div className="medico-stats-grid">
            <div className="medico-chart-card">
                <h3 className="medico-chart-title">Estado de solicitudes y citas</h3>
                <p className="medico-chart-hint">Pendientes, agendadas y citas perdidas (no incluye canceladas ni completadas)</p>
                <div className="medico-chart-inner medico-chart-inner--donut">
                    {donutTotal === 0 ? (
                        <p className="medico-chart-empty">No hay citas en estas categorías</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={68}
                                    outerRadius={100}
                                    paddingAngle={2}
                                >
                                    {donutData.map((entry) => (
                                        <Cell key={entry.key} fill={donutColors[entry.key] || theme.primary} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip content={tooltipDonut} />
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(value) => <span style={{ color: theme.text }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="medico-chart-card">
                <h3 className="medico-chart-title">Pacientes atendidos por día</h3>
                <p className="medico-chart-hint">Citas completadas: pacientes únicos por fecha (rango local)</p>
                <div className="medico-chart-date-row">
                    <label className="medico-chart-date-label">
                        Desde
                        <input type="date" className="medico-chart-date-input" value={range.from} onChange={onFromChange} />
                    </label>
                    <label className="medico-chart-date-label">
                        Hasta
                        <input type="date" className="medico-chart-date-input" value={range.to} onChange={onToChange} />
                    </label>
                </div>
                <div className="medico-chart-inner medico-chart-inner--bar">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 11 }} minTickGap={10} />
                            <YAxis allowDecimals={false} tick={{ fill: theme.muted, fontSize: 12 }} width={36} />
                            <Tooltip content={tooltipBar} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
                            <Bar dataKey="pacientes" name="Pacientes" fill={theme.success} radius={[4, 4, 0, 0]} maxBarSize={48}>
                                {barData.length <= 45 ? (
                                    <LabelList dataKey="pacientes" position="top" fill={theme.text} fontSize={11} />
                                ) : null}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default MedicoDashboardCharts;
