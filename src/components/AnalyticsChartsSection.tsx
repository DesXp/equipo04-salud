import { useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
  type Plugin,
} from 'chart.js';
import { RotateCw } from 'lucide-react';
import type {
  ChannelRow,
  InsuranceRow,
  LeadRangeRow,
  PriorNoShowRow,
} from '../types/clinical';
import { fmtDec1, fmtDec2 } from '../services/bigqueryApi';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const refLinePlugin: Plugin<'bar'> = {
  id: 'refLinePlugin',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const opts = pluginOptions as { value?: number } | undefined;
    if (!opts || typeof opts.value !== 'number') return;

    const { ctx, chartArea, scales } = chart;
    const isHorizontal = chart.config.options?.indexAxis === 'y';

    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);

    if (isHorizontal && scales.x) {
      const xPos = scales.x.getPixelForValue(opts.value);
      if (xPos >= chartArea.left && xPos <= chartArea.right) {
        ctx.beginPath();
        ctx.moveTo(xPos, chartArea.top);
        ctx.lineTo(xPos, chartArea.bottom);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 10px "DM Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `Prom. ${fmtDec1.format(opts.value)}%`,
          Math.min(xPos + 4, chartArea.right - 72),
          chartArea.top + 11,
        );
      }
    } else if (scales.y) {
      const yPos = scales.y.getPixelForValue(opts.value);
      if (yPos >= chartArea.top && yPos <= chartArea.bottom) {
        ctx.beginPath();
        ctx.moveTo(chartArea.left, yPos);
        ctx.lineTo(chartArea.right, yPos);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 10px "DM Sans", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(
          `Prom. global ${fmtDec1.format(opts.value)}%`,
          chartArea.right - 4,
          yPos - 5,
        );
      }
    }

    ctx.restore();
  },
};

Chart.register(refLinePlugin);

interface BarCanvasProps {
  ariaLabel: string;
  labels: string[];
  values: number[];
  colors: string[];
  globalAvg: number;
  horizontal?: boolean;
  maxBarThickness?: number;
  extraSuggestedMax?: number;
}

function BarCanvas({
  ariaLabel,
  labels,
  values,
  colors,
  globalAvg,
  horizontal = false,
  maxBarThickness = 36,
  extraSuggestedMax = 5,
}: BarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'bar'> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const maxVal = Math.max(...values, globalAvg, 10) + extraSuggestedMax;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'No-Show %',
            data: values,
            backgroundColor: colors,
            borderRadius: 6,
            maxBarThickness,
          },
        ],
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => {
                const raw = horizontal ? c.parsed.x : c.parsed.y;
                return `No-Show: ${fmtDec2.format(raw ?? 0)}%`;
              },
            },
          },
          // @ts-expect-error custom plugin options
          refLinePlugin: { value: globalAvg },
        },
        scales: horizontal
          ? {
              x: {
                beginAtZero: true,
                suggestedMax: maxVal,
                ticks: { callback: (v) => `${v}%`, font: { size: 10 } },
                grid: { color: '#f1f5f9' },
              },
              y: {
                ticks: { font: { size: 10 } },
                grid: { display: false },
              },
            }
          : {
              y: {
                beginAtZero: true,
                suggestedMax: maxVal,
                ticks: { callback: (v) => `${v}%`, font: { size: 10 } },
                grid: { color: '#f1f5f9' },
              },
              x: {
                ticks: { font: { size: 10 } },
                grid: { display: false },
              },
            },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [labels, values, colors, globalAvg, horizontal, maxBarThickness, extraSuggestedMax]);

  return (
    <div className="relative h-56">
      <canvas ref={canvasRef} aria-label={ariaLabel} />
    </div>
  );
}

interface AnalyticsChartsSectionProps {
  channels: ChannelRow[];
  leadRanges: LeadRangeRow[];
  priorNoShows: PriorNoShowRow[];
  insurances: InsuranceRow[];
  globalNoShowPct: number;
  b1Offline: boolean;
  b2Offline: boolean;
  onRetryB1: () => void;
  onRetryB2: () => void;
}

export function AnalyticsChartsSection({
  channels,
  leadRanges,
  priorNoShows,
  insurances,
  globalNoShowPct,
  b1Offline,
  b2Offline,
  onRetryB1,
  onRetryB2,
}: AnalyticsChartsSectionProps) {
  const chLabels = channels.map((r) => r.appointment_channel);
  const chVals = channels.map((r) => Number((Number(r.no_show_rate) * 100).toFixed(2)));
  const chColors = chVals.map((v) =>
    v > globalNoShowPct + 2 ? '#dc2626' : v > globalNoShowPct ? '#d97706' : '#0284c7',
  );

  const ldLabels = leadRanges.map((r) => r.lead_bucket);
  const ldVals = leadRanges.map((r) => Number((Number(r.no_show_rate) * 100).toFixed(2)));
  const ldColors = ldVals.map((v) =>
    v > globalNoShowPct + 2 ? '#dc2626' : v > globalNoShowPct ? '#d97706' : '#059669',
  );

  const prLabels = priorNoShows.map((r) => `${r.prior_no_shows} faltas`);
  const prVals = priorNoShows.map((r) => Number((Number(r.no_show_rate) * 100).toFixed(2)));
  const prColors = prVals.map((v) =>
    v >= 25 ? '#dc2626' : v >= globalNoShowPct ? '#d97706' : '#059669',
  );

  const inLabels = insurances.map((r) => r.insurance_type);
  const inVals = insurances.map((r) => Number((Number(r.no_show_rate) * 100).toFixed(2)));
  const inColors = inVals.map((v) =>
    v > globalNoShowPct + 1.5 ? '#dc2626' : v > globalNoShowPct ? '#d97706' : '#0284c7',
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* B1 */}
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Tasa de No-Show por Canal y Anticipación
            </h3>
            <p className="text-xs text-slate-600">
              Comparativa frente al promedio global (línea punteada).
            </p>
          </div>
          <div className="shrink-0 text-xs">
            {b1Offline ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-700">Offline</span>
                <button
                  type="button"
                  onClick={onRetryB1}
                  className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            ) : (
              <span className="font-medium text-emerald-700">En vivo</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Por Canal de Reserva
            </p>
            <BarCanvas
              ariaLabel="Gráfico de tasa No-Show por canal"
              labels={chLabels}
              values={chVals}
              colors={chColors}
              globalAvg={globalNoShowPct}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Por Días de Anticipación
            </p>
            <BarCanvas
              ariaLabel="Gráfico de tasa No-Show por anticipación"
              labels={ldLabels}
              values={ldVals}
              colors={ldColors}
              globalAvg={globalNoShowPct}
            />
          </div>
        </div>
      </article>

      {/* B2 */}
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Tasa de No-Show por Faltas Previas y Seguro
            </h3>
            <p className="text-xs text-slate-600">
              El historial de ausencias multiplica exponencialmente el riesgo.
            </p>
          </div>
          <div className="shrink-0 text-xs">
            {b2Offline ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-700">Offline</span>
                <button
                  type="button"
                  onClick={onRetryB2}
                  className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            ) : (
              <span className="font-medium text-emerald-700">En vivo</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Por Faltas Previas (0 a 4)
            </p>
            <BarCanvas
              ariaLabel="Gráfico de tasa No-Show por faltas previas"
              labels={prLabels}
              values={prVals}
              colors={prColors}
              globalAvg={globalNoShowPct}
              maxBarThickness={34}
              extraSuggestedMax={6}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Por Tipo de Seguro
            </p>
            <BarCanvas
              ariaLabel="Gráfico de tasa No-Show por tipo de seguro"
              labels={inLabels}
              values={inVals}
              colors={inColors}
              globalAvg={globalNoShowPct}
              horizontal
              maxBarThickness={28}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
