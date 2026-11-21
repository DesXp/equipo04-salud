import { Users, CircleDollarSign, Clock, AlertTriangle, RotateCw } from 'lucide-react';
import type { ChannelRow, KpiSummaryRow, SpecialtyRow } from '../types/clinical';
import { CONFIG, fmtDec1, fmtDec2, fmtInt, fmtPEN } from '../services/bigqueryApi';

interface KpiSectionProps {
  kpi: KpiSummaryRow | null;
  channels: ChannelRow[];
  specialties: SpecialtyRow[];
  mesesVentana: number;
  loading: boolean;
  isOffline: boolean;
  errorMsg?: string;
  onRetry: () => void;
}

export function KpiSection({
  kpi,
  channels,
  specialties,
  mesesVentana,
  loading,
  isOffline,
  errorMsg,
  onRetry,
}: KpiSectionProps) {
  if (loading && !kpi) {
    return (
      <section id="sec-kpis" aria-label="Indicadores clave ejecutivos" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Panorama Ejecutivo de Asistencia y Costo de Oportunidad
            </h2>
            <p className="text-xs text-slate-600">
              Métricas agregadas en tiempo real desde la capa Gold en BigQuery.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="mt-4 h-8 w-1/2 rounded bg-slate-100" />
              <div className="mt-6 h-14 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const total = kpi ? Number(kpi.total) : 0;
  const shows = kpi ? Number(kpi.shows) : 0;
  const noShows = kpi ? Number(kpi.no_shows) : 0;
  const noShowRatePct = kpi ? Number(kpi.no_show_rate) * 100 : 0;
  const showRatePct = 100 - noShowRatePct;
  const avgLead = kpi ? Number(kpi.avg_lead) : 0;
  const rateGe2 = kpi ? Number(kpi.rate_prior_ge2) * 100 : 0;
  const rate0 = kpi ? Number(kpi.rate_prior_0) * 100 : 0;
  const mult = rate0 > 0 ? rateGe2 / rate0 : 0;

  const horasPerdidas = noShows * CONFIG.HOURS_PER_APPT;
  const costoTotal = noShows * CONFIG.COST_PER_APPT;
  const costoMensual = costoTotal / Math.max(1, mesesVentana);
  const horasMensual = horasPerdidas / Math.max(1, mesesVentana);

  const sortedSpec = [...specialties].sort(
    (a, b) => Number(b.no_show_rate) - Number(a.no_show_rate),
  );
  const sortedChan = [...channels].sort(
    (a, b) => Number(b.no_show_rate) - Number(a.no_show_rate),
  );
  const worstSpec = sortedSpec[0] ?? { specialty: '—', no_show_rate: 0 };
  const worstChan = sortedChan[0] ?? { appointment_channel: '—', no_show_rate: 0 };
  const bestChan = sortedChan[sortedChan.length - 1] ?? {
    appointment_channel: '—',
    no_show_rate: 0,
  };
  const ppDiff = (Number(worstChan.no_show_rate) - Number(bestChan.no_show_rate)) * 100;

  return (
    <section id="sec-kpis" aria-label="Indicadores clave ejecutivos" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Panorama Ejecutivo de Asistencia y Costo de Oportunidad
          </h2>
          <p className="text-xs text-slate-600">
            Métricas agregadas en tiempo real desde la capa Gold en BigQuery.
          </p>
        </div>

        {isOffline && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-amber-700">
              Snapshot auditado (offline)
            </span>
            {errorMsg && <span className="hidden text-red-700 sm:inline">· {errorMsg}</span>}
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              <RotateCw className="h-3 w-3" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1 */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Total Citas y Ausentismo
              </span>
              <Users className="h-4 w-4 text-sky-600" aria-hidden="true" />
            </div>
            <p className="mt-2 font-[var(--font-display)] text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {fmtInt.format(total)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
              <div>
                <span className="block font-medium text-emerald-700">Asistencia</span>
                <span className="text-base font-bold text-emerald-800 tabular-nums">
                  {fmtDec2.format(showRatePct)}%
                </span>
                <span className="block text-[11px] text-slate-500 tabular-nums">
                  {fmtInt.format(shows)} citas
                </span>
              </div>
              <div className="border-l border-slate-100 pl-3">
                <span className="block font-medium text-red-700">No-Show</span>
                <span className="text-base font-bold text-red-700 tabular-nums">
                  {fmtDec2.format(noShowRatePct)}%
                </span>
                <span className="block text-[11px] text-slate-500 tabular-nums">
                  {fmtInt.format(noShows)} citas
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* KPI 2 */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Costo de Oportunidad
              </span>
              <CircleDollarSign className="h-4 w-4 text-red-600" aria-hidden="true" />
            </div>
            <p className="mt-2 font-[var(--font-display)] text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {fmtPEN.format(costoTotal)}
            </p>
            <p className="mt-1 text-sm font-semibold text-red-700 tabular-nums">
              {fmtInt.format(horasPerdidas)} horas médicas perdidas
            </p>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <p className="tabular-nums">
                Promedio mensual:{' '}
                <strong className="font-semibold text-slate-900">
                  {fmtPEN.format(costoMensual)}/mes
                </strong>{' '}
                ({fmtInt.format(horasMensual)} h/mes)
              </p>
              <p className="text-[11px] text-slate-500">
                Supuestos: 0.5 h/cita · S/ 120/cita
              </p>
            </div>
          </div>
        </article>

        {/* KPI 3 */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Anticipación y Factor #1
              </span>
              <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
            </div>
            <p className="mt-2 font-[var(--font-display)] text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {fmtDec1.format(avgLead)} días
            </p>
            <p className="text-xs text-slate-500">Anticipación promedio de reserva</p>
            <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">≥ 2 faltas previas vs 0</span>
                <span className="font-bold text-amber-700 tabular-nums">
                  ×{fmtDec1.format(mult)} riesgo
                </span>
              </div>
              <p className="mt-1 text-slate-600 tabular-nums">
                {fmtDec1.format(rateGe2)}% vs {fmtDec1.format(rate0)}% de ausentismo
              </p>
            </div>
          </div>
        </article>

        {/* KPI 4 */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Puntos Críticos (≥ 500 citas)
              </span>
              <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="block text-[11px] font-medium text-slate-500">
                    Especialidad más crítica
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {worstSpec.specialty}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-red-700 tabular-nums">
                  {fmtDec2.format(Number(worstSpec.no_show_rate) * 100)}%
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500">
                      Canal más crítico
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {worstChan.appointment_channel}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-red-700 tabular-nums">
                    {fmtDec2.format(Number(worstChan.no_show_rate) * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-emerald-700 tabular-nums">
                  vs {bestChan.appointment_channel} (
                  {fmtDec1.format(Number(bestChan.no_show_rate) * 100)}%): +
                  {fmtDec1.format(ppDiff)} pp
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
