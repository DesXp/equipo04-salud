import { useMemo, useState } from 'react';
import { Shield, Search, RotateCw, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';
import type { AgendaRow } from '../types/clinical';
import { fmtInt, parseBqDate, truncateHash } from '../services/bigqueryApi';

interface CriticalAgendaSectionProps {
  rows: AgendaRow[];
  loading: boolean;
  isOffline: boolean;
  onRetry: () => void;
  onEvaluateRow: (row: AgendaRow) => void;
}

export function CriticalAgendaSection({
  rows,
  loading,
  isOffline,
  onRetry,
  onEvaluateRow,
}: CriticalAgendaSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.center_name.toLowerCase().includes(q) ||
        r.center_city.toLowerCase().includes(q) ||
        r.specialty.toLowerCase().includes(q) ||
        r.appointment_channel.toLowerCase().includes(q),
    );
  }, [rows, searchTerm]);

  return (
    <article
      id="sec-agenda"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Agenda Crítica de Alto Riesgo (Top 12 Citas Prioritarias)
            </h3>
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
          <p className="mt-0.5 text-xs text-slate-600">
            Ordenadas por{' '}
            <span className="font-mono font-medium text-slate-800">
              prior_no_shows DESC, lead_time_days DESC
            </span>
            . Selecciona{' '}
            <strong className="font-semibold text-sky-700">Evaluar en BQML</strong> para
            precargar al paciente en el simulador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar sede, ciudad o esp…"
              aria-label="Filtrar agenda crítica"
              className="h-9 w-56 rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600/20"
            />
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Shield className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Identidad anonimizada SHA-256
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading && rows.length === 0 ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-600">
              {rows.length === 0
                ? 'Sin registros en Agenda Crítica.'
                : 'No hay citas que coincidan con el filtro ingresado.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-2 text-xs font-semibold text-sky-700 hover:underline"
              >
                Limpiar filtro
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2.5 text-left">DNI Hash</th>
                <th className="px-3 py-2.5 text-left">Fecha</th>
                <th className="px-3 py-2.5 text-left">Sede</th>
                <th className="px-3 py-2.5 text-left">Ciudad</th>
                <th className="px-3 py-2.5 text-left">Especialidad</th>
                <th className="px-3 py-2.5 text-left">Canal</th>
                <th className="px-3 py-2.5 text-center">Faltas prev.</th>
                <th className="px-3 py-2.5 text-center">Anticipación</th>
                <th className="px-3 py-2.5 text-center">Resultado real</th>
                <th className="px-3 py-2.5 text-right">Acción BQML</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((r, idx) => {
                const noShow = Number(r.no_show_label) === 1;
                const dateStr = parseBqDate(r.appointment_date);
                return (
                  <tr
                    key={`${r.national_id_hash}-${dateStr}-${idx}`}
                    className="transition-colors hover:bg-sky-50/40"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">
                      <span
                        title="Hash SHA-256 (DNI real nunca expuesto)"
                        className="cursor-help rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5"
                      >
                        {truncateHash(r.national_id_hash)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-slate-700 tabular-nums">
                      {dateStr}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {r.center_name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.center_city}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-medium text-slate-800">
                      {r.specialty}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">
                      {r.appointment_channel}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-red-700 tabular-nums">
                      {fmtInt.format(Number(r.prior_no_shows))}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-700 tabular-nums">
                      {fmtInt.format(Number(r.lead_time_days))} d
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {noShow ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          No asistió
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Asistió
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onEvaluateRow(r)}
                        className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-1"
                      >
                        <span>Evaluar en BQML</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
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
