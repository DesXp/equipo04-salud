import { CheckCircle2, AlertTriangle, Loader2, ShieldCheck, RotateCw } from 'lucide-react';
import type { GovernanceRow } from '../types/clinical';
import { fmtDec1, fmtInt, parseBqDate } from '../services/bigqueryApi';

interface GovernanceSectionProps {
  row: GovernanceRow | null;
  mesesVentana: number;
  loading: boolean;
  isColdStart: boolean;
  isOffline: boolean;
  errorMsg?: string;
  onRetry: () => void;
}

export function GovernanceSection({
  row,
  mesesVentana,
  loading,
  isColdStart,
  isOffline,
  errorMsg,
  onRetry,
}: GovernanceSectionProps) {
  const total = row ? Number(row.total) : 0;
  const uniqueBookings = row ? Number(row.unique_bookings) : 0;
  const dups = Math.max(0, total - uniqueBookings);
  const piiInvalid = row ? Number(row.pii_invalid) : 0;
  const negLead = row ? Number(row.negative_lead) : 0;
  const triageNulls = row ? Number(row.triage_nulls) : 0;
  const minDate = row ? parseBqDate(row.min_date) : '—';
  const maxDate = row ? parseBqDate(row.max_date) : '—';
  const allClean = piiInvalid === 0 && dups === 0 && negLead === 0 && triageNulls === 0;

  return (
    <section id="top" className="space-y-5">
      {/* Encabezado Ejecutivo */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-1.5">
          <p className="text-xs font-semibold text-sky-700">
            Plataforma de Decisión Clínica y Financiera · Capa Gold BigQuery
          </p>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            style={{ textWrap: 'balance' }}
          >
            Optimización de Agenda Clínica y Predicción de Ausentismo
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Herramienta operativa para <strong className="font-semibold text-slate-800">Gerencia Médica</strong> (ROI y recuperación de capacidad) y <strong className="font-semibold text-slate-800">Admisión</strong> (semáforo de riesgo por cita en BigQuery ML).
          </p>
        </div>

        <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-700">
          <span className="text-slate-500">Ventana analizada: </span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            {minDate} → {maxDate}
          </span>
          <span className="ml-1.5 text-slate-500 tabular-nums">
            ({fmtDec1.format(mesesVentana)} meses)
          </span>
        </div>
      </div>

      {/* Banner de Cold Start */}
      {isColdStart && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Conectando con BigQuery (Cloud Run puede tardar unos segundos en despertar)…
              </p>
              <p className="text-xs text-sky-800">
                Ejecutando 9 consultas paralelas agregadas sobre{' '}
                <code className="font-mono text-[11px]">curated_equipo04.curated_appointments_gold</code>.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium text-sky-800">
            FinOps · Solo agregaciones
          </span>
        </div>
      )}

      {/* Banda de Gobernanza & FinOps */}
      <div
        aria-label="Auditoría de gobernanza de datos y FinOps"
        className="rounded-xl border border-slate-200 bg-white px-4 py-3.5"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Pipeline Medallion Activo
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>PII Protegido SHA-256</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>Particionado Diario + Clustering (specialty, no_show_label)</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-medium text-sky-800">
              BQML LOGISTIC_REG · Recall 67.23% · AUC 0.64
            </span>
          </div>

          <div className="text-xs font-medium">
            {isOffline ? (
              <div className="flex flex-wrap items-center gap-2 text-slate-700">
                <span className="font-semibold text-amber-700">Snapshot auditado (offline)</span>
                {errorMsg && <span className="text-red-700">· {errorMsg}</span>}
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            ) : row ? (
              <span className="font-semibold text-emerald-700 tabular-nums">
                100% íntegro ({fmtInt.format(total)} filas validadas)
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-2.5">
          {loading && !row ? (
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-600">
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  allClean ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {allClean ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Auditoría de calidad en vivo:
              </span>

              <span className="tabular-nums">
                PII SHA-256 inválido:{' '}
                <strong className={piiInvalid === 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {fmtInt.format(piiInvalid)}
                </strong>
              </span>
              <span className="tabular-nums">
                Duplicados UUID:{' '}
                <strong className={dups === 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {fmtInt.format(dups)}
                </strong>
              </span>
              <span className="tabular-nums">
                Lead negativo:{' '}
                <strong className={negLead === 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {fmtInt.format(negLead)}
                </strong>
              </span>
              <span className="tabular-nums">
                Nulos triaje:{' '}
                <strong className={triageNulls === 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {fmtInt.format(triageNulls)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
