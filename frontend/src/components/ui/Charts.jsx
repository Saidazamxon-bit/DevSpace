import { useEffect, useState } from 'react';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Tooltip);

/** Read design tokens so charts follow the active theme. */
export function useThemeTokens() {
  const read = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n) => s.getPropertyValue(n).trim();
    return {
      accent: v('--accent'), orange: v('--orange'), text: v('--text'), muted: v('--muted'), grid: v('--grid-line'),
      card: v('--card'), card2: v('--card-2'), border: v('--border'), danger: v('--danger'), font: v('--font'),
    };
  };
  const [tokens, setTokens] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setTokens(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return tokens;
}

const tooltip = (t) => ({
  backgroundColor: t.card2,
  borderColor: t.border,
  borderWidth: 1,
  titleColor: t.text,
  bodyColor: t.text,
  padding: 10,
  cornerRadius: 10,
  displayColors: false,
  titleFont: { family: t.font, weight: '600', size: 12 },
  bodyFont: { family: t.font, size: 12 },
});

const axes = (t, { yTicks = {}, xTicks = {} } = {}) => ({
  x: { grid: { display: false }, border: { display: false }, ticks: { color: t.muted, font: { family: t.font, size: 11.5 }, ...xTicks } },
  y: {
    beginAtZero: true,
    grid: { color: t.grid, drawTicks: false },
    border: { display: false, dash: [4, 4] },
    ticks: { color: t.muted, font: { family: t.font, size: 11 }, padding: 8, precision: 0, maxTicksLimit: 5, ...yTicks },
  },
});

/** Bar chart. `colors` may be an array (per bar) or a single color. */
export function BarChart({ labels, values, colors, label, format = (v) => v, height = 260, titles }) {
  const t = useThemeTokens();
  const data = {
    labels,
    datasets: [{
      label,
      data: values,
      backgroundColor: colors || t.accent,
      hoverBackgroundColor: colors || t.accent,
      borderRadius: { topLeft: 10, topRight: 10, bottomLeft: 4, bottomRight: 4 },
      borderSkipped: false,
      maxBarThickness: 64,
      categoryPercentage: 0.78,
      barPercentage: 0.92,
      minBarLength: 3,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltip(t), callbacks: { title: (items) => (titles ? titles[items[0].dataIndex] : items[0].label), label: (ctx) => `${label}: ${format(ctx.parsed.y)}` } },
    },
    scales: axes(t, { yTicks: { callback: (v) => format(v) } }),
  };
  return <div style={{ height }}><Bar data={data} options={options} /></div>;
}

export function LineChart({ labels, values, label, format = (v) => v, height = 240, pointColors }) {
  const t = useThemeTokens();
  const data = {
    labels,
    datasets: [{
      label,
      data: values,
      borderColor: t.accent,
      borderWidth: 2,
      tension: 0.35,
      fill: true,
      backgroundColor: (ctx) => {
        const { chart } = ctx;
        if (!chart.chartArea) return 'transparent';
        const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
        g.addColorStop(0, 'rgba(184,255,101,0.22)');
        g.addColorStop(1, 'rgba(184,255,101,0)');
        return g;
      },
      pointRadius: pointColors ? values.map((_, i) => (pointColors[i] ? 4 : 0)) : 0,
      pointBackgroundColor: pointColors ? pointColors.map((c) => c || t.accent) : t.accent,
      pointHoverRadius: 5,
      spanGaps: true,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { ...tooltip(t), callbacks: { label: (ctx) => `${label}: ${ctx.parsed.y === null ? '—' : format(ctx.parsed.y)}` } } },
    scales: axes(t, { xTicks: { maxTicksLimit: 8, maxRotation: 0, autoSkip: true }, yTicks: { callback: (v) => format(v) } }),
  };
  return <div style={{ height }}><Line data={data} options={options} /></div>;
}

export function DoughnutChart({ labels, values, colors, format = (v) => v, height = 220 }) {
  const t = useThemeTokens();
  const data = { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: t.card, borderWidth: 3, hoverOffset: 4 }] };
  const options = {
    responsive: true, maintainAspectRatio: false, cutout: '70%',
    plugins: { legend: { display: false }, tooltip: { ...tooltip(t), callbacks: { label: (ctx) => `${ctx.label}: ${format(ctx.parsed)}` } } },
  };
  return <div style={{ height }}><Doughnut data={data} options={options} /></div>;
}
