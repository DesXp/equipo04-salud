import { useEffect, useMemo, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';
import { BarChart3, RotateCw, TrendingUp } from 'lucide-react';
import type {
  CitySummaryRow,
  ModelMetricsRow,
  MonthlyTrendRow,
  ParetoProfileRow,
} from '../types/clinical';
import { CONFIG, fmtDec1, fmtDec2, fmtInt, fmtPEN } from '../services/bigqueryApi';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

interface ExecutivePostEventSectionProps {
  modelMetrics: ModelMetricsRow;
  paretoProfiles: ParetoProfileRow[];
  monthlyTrend: MonthlyTrendRow[];
  byCitySummary: CitySummaryRow[];
  loading: boolean;
  isOffline: boolean;
  onRetry: () => void;
}

interface ComputedParetoRow extends ParetoProfileRow {
  profileLabel: string;
  shortLabel: string;
  sharePct: number;
  cumSharePct: number;
  lostCostPEN: number;
}

export function ExecutivePostEventSection({
  modelMetrics,
  paretoProfiles,
  monthlyTrend,
  byCitySummary,
  loading,
  isOffline,
  onRetry,
}: ExecutivePostEventSectionProps) {
  const paretoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paretoChartRef = useRef<Chart | null>(null);

  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartRef = useRef<Chart<'line'> | null>(null);

  // Pareto ordered by no_shows DESC for true Pareto concentration (or keep BigQuery order and compute cumulative)
  const paretoData = useMemo(() => {
    const sortedByVolume = [...paretoProfiles].sort(
      (a, b) => Number(b.no_shows) - Number(a.no_shows),
    );
    const totalNoShows = sortedByVolume.reduce(
      (acc, r) => acc + Number(r.no_shows),
      0,
    );

    let running = 0;
    const rows: ComputedParetoRow[] = sortedByVolume.map((r) => {
      const ns = Number(r.no_shows);
      running += ns;
      const sharePct = totalNoShows > 0 ? (ns / totalNoShows) * 100 : 0;
      const cumSharePct = totalNoShows > 0 ? (running / totalNoShows) * 100 : 0;
      const smsShort = r.sms_status === 'SMS Confirmado' ? 'SMS Sí' : 'Sin SMS';
      const priorShort = r.prior_group.startsWith('Reincidente')
        ? 'Reincidente'
        : '0 faltas';
      return {
        ...r,
        profileLabel: `${r.sms_status} · ${r.prior_group} · ${r.lead_group}`,
        shortLabel: `${smsShort} / ${priorShort} / ${r.lead_group}`,
        sharePct,
        cumSharePct,
        lostCostPEN: ns * CONFIG.COST_PER_APPT,
      };
    });

    // Also sort by no_show_rate DESC for table display if desired, or keep Pareto volume order so cumulative % is strictly monotonic
    return { rows, totalNoShows };
  }, [paretoProfiles]);

  const totalCityNoShows = useMemo(
    () => byCitySummary.reduce((acc, r) => acc + Number(r.no_shows), 0),
    [byCitySummary],
  );

  // Render Pareto Chart (Bars = Inasistencias, Line = % Acumulado)
  useEffect(() => {
    const canvas = paretoCanvasRef.current;
    if (!canvas || paretoData.rows.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (paretoChartRef.current) {
      paretoChartRef.current.destroy();
    }

    const labels = paretoData.rows.map((r) => r.shortLabel);
    const bars = paretoData.rows.map((r) => Number(r.no_shows));
    const cumLine = paretoData.rows.map((r) => Number(r.cumSharePct.toFixed(1)));
    const rates = paretoData.rows.map((r) => Number(r.no_show_rate) * 100);

    const config: ChartConfiguration<'bar' | 'line'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: '% Acumulado de inasistencias',
            data: cumLine,
            borderColor: '#0f172a',
            backgroundColor: '#0f172a',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.25,
            yAxisID: 'y1',
          },
          {
            type: 'bar',
            label: 'Inasistencias (citas)',
            data: bars,
            backgroundColor: rates.map((rate) =>
              rate >= 28 ? '#dc2626' : rate >= 18 ? '#d97706' : '#0284c7',
            ),
            borderRadius: 5,
            maxBarThickness: 32,
            yAxisID: 'y',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                if (item.dataset.yAxisID === 'y1') {
                  return `% Acumulado: ${fmtDec1.format(Number(item.parsed.y))}%`;
                }
                const idx = item.dataIndex;
                const row = paretoData.rows[idx];
                return `Inasistencias: ${fmtInt.format(Number(item.parsed.y))} (Tasa No-Show: ${fmtDec1.format(Number(row?.no_show_rate ?? 0) * 100)}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 10 }, maxRotation: 28, minRotation: 15 },
            grid: { display: false },
          },
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'Inasistencias', font: { size: 10 } },
            ticks: { font: { size: 10 } },
            grid: { color: '#f1f5f9' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            title: { display: true, text: '% Acumulado', font: { size: 10 } },
            ticks: { callback: (v) => `${v}%`, font: { size: 10 } },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };

    paretoChartRef.current = new Chart(ctx, config);

    return () => {
      if (paretoChartRef.current) {
        paretoChartRef.current.destroy();
        paretoChartRef.current = null;
      }
    };
  }, [paretoData]);

  // Render Monthly Trend Chart
  useEffect(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas || monthlyTrend.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (trendChartRef.current) {
      trendChartRef.current.destroy();
    }

    const labels = monthlyTrend.map((r) => r.month_ym);
    const noShowSeries = monthlyTrend.map((r) =>
      Number((Number(r.no_show_rate) * 100).toFixed(2)),
    );
    const unconfirmedSeries = monthlyTrend.map((r) =>
      Number((Number(r.unconfirmed_sms_rate) * 100).toFixed(2)),
    );

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Tasa No-Show (%)',
            data: noShowSeries,
            borderColor: '#dc2626',
            backgroundColor: '#dc2626',
            borderWidth: 2.2,
            pointRadius: 3,
            tension: 0.25,
          },
          {
            label: '% Citas sin confirmar SMS',
            data: unconfirmedSeries,
            borderColor: '#0284c7',
            backgroundColor: '#0284c7',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (item) =>
                `${item.dataset.label}: ${fmtDec2.format(Number(item.parsed.y))}%`,
            },
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 10 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 60,
            ticks: { callback: (v) => `${v}%`, font: { size: 10 } },
            grid: { color: '#f1f5f9' },
          },
        },
      },
    };

    trendChartRef.current = new Chart(ctx, config);

    return () => {
      if (trendChartRef.current) {
        trendChartRef.current.destroy();
        trendChartRef.current = null;
      }
    };
  }, [monthlyTrend]);

  const evalCards = [
    {
      label: 'Accuracy',
      value: `${fmtDec2.format(Number(modelMetrics.accuracy) * 100)}%`,
      note: 'Exactitud global de clasificación',
    },
    {
      label: 'ROC-AUC',
      value: Number(modelMetrics.roc_auc).toFixed(4),
      note: 'Capacidad de discriminación',
    },
    {
      label: 'Precision',
      value: `${fmtDec2.format(Number(modelMetrics.precision) * 100)}%`,
      note: 'Precisión en alertas No-Show',
    },
    {
      label: 'Recall',
      value: `${fmtDec2.format(Number(modelMetrics.recall) * 100)}%`,
      note: 'Cobertura de ausencias reales',
    },
    {
      label: 'F1-Score',
      value: Number(modelMetrics.f1_score).toFixed(4),
      note: 'Balance Precision / Recall',
    },
  ];

  return (
    <section
      id="sec-gerencia"
      aria-label="Vista Gerencial y Diagnóstico Post-Evento"
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">
              Vista Gerencial &amp; Diagnóstico Post-Evento
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Evaluación real de <code className="font-mono text-slate-800">ML.EVALUATE</code>{' '}
            sobre <code className="font-mono text-slate-800">health_noshow_classifier</code>,
            Pareto de perfiles de ausencia, evolución mensual e impacto financiero por ciudad.
          </p>
        </div>

        <div className="shrink-0 text-xs">
          {isOffline ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-700">
                Snapshot auditado (offline)
              </span>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                <RotateCw className="h-3 w-3" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : (
            <span className="font-semibold text-emerald-700">
              Consultas en vivo · BigQuery
            </span>
          )}
        </div>
      </div>

      {/* a) Comparativa explícita v1 vs v2 + Tarjetas reales de ML.EVALUATE */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          a) Evolución del Modelo al Rescatar <code className="font-mono text-sky-800">sms_confirmed</code> del Triaje (v1 vs. v2 en vivo)
        </h3>

        {/* Barra comparativa explícita v1 (Evento) vs v2 (Post-Evento) */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs font-bold text-slate-700">
              Modelo Inicial v1 (Sin SMS)
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-slate-700 tabular-nums">
              <span>
                Accuracy <strong className="text-slate-900">57.15%</strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span>
                ROC-AUC <strong className="text-slate-900">0.6408</strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span>
                Precision <strong className="text-slate-900">24.88%</strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span>
                Recall <strong className="text-slate-900">67.23%</strong>
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3">
            <p className="text-xs font-bold text-emerald-900">
              Modelo Optimizado v2 (En vivo desde <code className="font-mono">ML.EVALUATE</code>)
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-slate-800 tabular-nums">
              <span>
                Accuracy{' '}
                <strong className="text-slate-950">
                  {fmtDec2.format(Number(modelMetrics.accuracy) * 100)}%
                </strong>{' '}
                <span className="font-bold text-emerald-700">
                  (+{fmtDec1.format(Number(modelMetrics.accuracy) * 100 - 57.15)} pp)
                </span>
              </span>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span>
                ROC-AUC{' '}
                <strong className="text-slate-950">
                  {Number(modelMetrics.roc_auc).toFixed(4)}
                </strong>{' '}
                <span className="font-bold text-emerald-700">
                  (+{(Number(modelMetrics.roc_auc) - 0.6408).toFixed(3)})
                </span>
              </span>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span>
                Precision{' '}
                <strong className="text-slate-950">
                  {fmtDec2.format(Number(modelMetrics.precision) * 100)}%
                </strong>{' '}
                <span className="font-bold text-emerald-700">
                  ({fmtDec1.format((Number(modelMetrics.precision) * 100) / 24.88)}x)
                </span>
              </span>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span>
                Recall{' '}
                <strong className="text-slate-950">
                  {fmtDec2.format(Number(modelMetrics.recall) * 100)}%
                </strong>
              </span>
            </p>
          </div>
        </div>

        {/* 5 tarjetas reales de ML.EVALUATE */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {evalCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-sky-200 bg-sky-50/40 p-3.5"
            >
              <p className="text-xs font-semibold text-slate-600">{card.label} v2</p>
              <p className="mt-1 font-[var(--font-display)] text-xl font-bold text-slate-900 tabular-nums sm:text-2xl">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600">{card.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* b) Pareto de perfiles de paciente */}
      <div className="space-y-4 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              b) Análisis de Pareto: Perfiles con Mayor Concentración de Inasistencias
            </h3>
            <p className="text-xs text-slate-600">
              Segmentación por confirmación SMS, reincidencia y días de anticipación. Costo
              estimado a S/ {CONFIG.COST_PER_APPT}/cita perdida.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
            Total inasistencias analizadas: {fmtInt.format(paretoData.totalNoShows)}
          </span>
        </div>

        <div className="relative h-72 w-full rounded-lg border border-slate-100 bg-slate-50/30 p-3">
          {loading && paretoProfiles.length === 0 ? (
            <div className="h-full w-full animate-pulse rounded bg-slate-100" />
          ) : (
            <canvas
              ref={paretoCanvasRef}
              aria-label="Gráfico de Pareto de perfiles con mayor ausentismo"
            />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2.5 text-left">Estado SMS</th>
                <th className="px-3 py-2.5 text-left">Historial</th>
                <th className="px-3 py-2.5 text-left">Anticipación</th>
                <th className="px-3 py-2.5 text-right">Citas</th>
                <th className="px-3 py-2.5 text-right">Inasistencias</th>
                <th className="px-3 py-2.5 text-right">Tasa No-Show</th>
                <th className="px-3 py-2.5 text-right">% del total</th>
                <th className="px-3 py-2.5 text-right">% Acum.</th>
                <th className="px-3 py-2.5 text-right">Costo perdido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paretoData.rows.map((r, i) => {
                const ratePct = Number(r.no_show_rate) * 100;
                const isUnconfirmed = r.sms_status !== 'SMS Confirmado';
                return (
                  <tr
                    key={`${r.sms_status}-${r.prior_group}-${r.lead_group}-${i}`}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td
                      className={`px-3 py-2 font-semibold ${
                        isUnconfirmed ? 'text-amber-800' : 'text-emerald-800'
                      }`}
                    >
                      {r.sms_status}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.prior_group}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                      {r.lead_group}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {fmtInt.format(Number(r.total))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {fmtInt.format(Number(r.no_shows))}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono text-xs font-bold tabular-nums ${
                        ratePct >= 28
                          ? 'text-red-700'
                          : ratePct >= 18
                            ? 'text-amber-700'
                            : 'text-sky-700'
                      }`}
                    >
                      {fmtDec2.format(ratePct)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {fmtDec1.format(r.sharePct)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {fmtDec1.format(r.cumSharePct)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-red-700 tabular-nums">
                      {fmtPEN.format(r.lostCostPEN)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* c) Evolución mensual & Resumen gerencial por ciudad */}
      <div className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-sky-700" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                c) Evolución Histórica Mensual
              </h3>
              <p className="text-xs text-slate-600">
                Relación temporal entre tasa de No-Show y porcentaje sin confirmación SMS.
              </p>
            </div>
          </div>

          <div className="relative h-64 w-full rounded-lg border border-slate-100 bg-slate-50/30 p-3">
            {loading && monthlyTrend.length === 0 ? (
              <div className="h-full w-full animate-pulse rounded bg-slate-100" />
            ) : (
              <canvas
                ref={trendCanvasRef}
                aria-label="Evolución mensual de tasa de No-Show y citas sin confirmar SMS"
              />
            )}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Resumen Gerencial por Ciudad
            </h3>
            <p className="text-xs text-slate-600">
              Volumen de inasistencias, sedes activas y costo de oportunidad por plaza.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 text-left">Ciudad</th>
                  <th className="px-3 py-2.5 text-center">Sedes</th>
                  <th className="px-3 py-2.5 text-right">Citas</th>
                  <th className="px-3 py-2.5 text-right">Inasistencias</th>
                  <th className="px-3 py-2.5 text-right">Tasa No-Show</th>
                  <th className="px-3 py-2.5 text-right">Part. %</th>
                  <th className="px-3 py-2.5 text-right">Costo perdido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {byCitySummary.map((c) => {
                  const ns = Number(c.no_shows);
                  const ratePct = Number(c.no_show_rate) * 100;
                  const share = totalCityNoShows > 0 ? (ns / totalCityNoShows) * 100 : 0;
                  return (
                    <tr
                      key={c.center_city}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {c.center_city}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-600 tabular-nums">
                        {fmtInt.format(Number(c.centers_count))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {fmtInt.format(Number(c.total))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {fmtInt.format(ns)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono text-xs font-bold tabular-nums ${
                          ratePct >= 18.5
                            ? 'text-red-700'
                            : ratePct >= 17.5
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {fmtDec2.format(ratePct)}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {fmtDec1.format(share)}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-red-700 tabular-nums">
                        {fmtPEN.format(ns * CONFIG.COST_PER_APPT)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
