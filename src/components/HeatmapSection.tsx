import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import type { HeatmapRow } from '../types/clinical';
import { fmtDec2, fmtInt } from '../services/bigqueryApi';

interface HeatmapSectionProps {
  rows: HeatmapRow[];
  loading: boolean;
  isOffline: boolean;
  onRetry: () => void;
}

function getHeatCellClasses(ratePct: number): string {
  if (ratePct >= 22) return 'bg-red-50 text-red-900 border-red-200';
  if (ratePct >= 19) return 'bg-amber-50 text-amber-900 border-amber-200';
  if (ratePct >= 16) return 'bg-sky-50 text-sky-900 border-sky-200';
  return 'bg-emerald-50 text-emerald-900 border-emerald-200';
}

function getRiskTag(ratePct: number): string {
  if (ratePct >= 22) return 'Crítico';
  if (ratePct >= 19) return 'Alto';
  if (ratePct >= 16) return 'Moderado';
  return 'Estable';
}

export function HeatmapSection({
  rows,
  loading,
  isOffline,
  onRetry,
}: HeatmapSectionProps) {
  const [prudenceFactor, setPrudenceFactor] = useState<number>(0.5);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Mapa de Calor: Sede × Especialidad y Sobrecupo Inteligente
            </h3>
            <span className="text-xs font-medium text-sky-700">
              · Top 10 mayor ausentismo
            </span>
            {isOffline && (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-amber-700">· Offline</span>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  Reintentar
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Fórmula de sobrecupo diario:{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
              ROUND(capacity_daily × tasa_no_show × factor_prudencia)
            </code>{' '}
            para absorber ausencias sin saturar consultorios.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
          <label
            htmlFor="slider-prudencia"
            className="whitespace-nowrap text-xs font-semibold text-slate-700"
          >
            Factor de prudencia:{' '}
            <span className="font-mono font-bold text-sky-700 tabular-nums">
              {fmtDec2.format(prudenceFactor)}
            </span>
          </label>
          <input
            id="slider-prudencia"
            type="range"
            min={0.3}
            max={0.8}
            step={0.05}
            value={prudenceFactor}
            onChange={(e) => setPrudenceFactor(Number(e.target.value))}
            className="w-40 cursor-pointer"
          />
          <span className="whitespace-nowrap text-[11px] text-slate-500">
            (0.30 conservador – 0.80 agresivo)
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {loading && rows.length === 0 ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No se encontraron segmentos con suficiente volumen.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2.5 text-left">Sede</th>
                <th className="px-3 py-2.5 text-left">Ciudad</th>
                <th className="px-3 py-2.5 text-left">Especialidad</th>
                <th className="px-3 py-2.5 text-right">Citas</th>
                <th className="px-3 py-2.5 text-center">Tasa No-Show</th>
                <th className="px-3 py-2.5 text-right">Capacidad diaria</th>
                <th className="px-3 py-2.5 text-right">Sobrecupo sugerido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r) => {
                const rate = Number(r.no_show_rate);
                const ratePct = rate * 100;
                const cap = Number(r.capacity_daily);
                const overbooking = Math.round(cap * rate * prudenceFactor);

                return (
                  <tr
                    key={`${r.center_name}-${r.specialty}`}
                    className="transition-colors hover:bg-slate-50/90"
                  >
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {r.center_name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.center_city}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-medium text-slate-800">
                      {r.specialty}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {fmtInt.format(Number(r.total))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums ${getHeatCellClasses(ratePct)}`}
                      >
                        <span>{fmtDec2.format(ratePct)}%</span>
                        <span className="font-sans text-[10px] font-medium opacity-80">
                          ({getRiskTag(ratePct)})
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {fmtInt.format(cap)} cupos/día
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-emerald-700 tabular-nums">
                      +{fmtInt.format(overbooking)} cupos/día
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </article>
  );
}
