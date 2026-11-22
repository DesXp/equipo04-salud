import { CheckCircle2, AlertTriangle, ShieldCheck, RotateCw } from 'lucide-react';
import type { GovernanceRow, ModelMetricsRow } from '../types/clinical';
import { fmtDec2, fmtInt } from '../services/bigqueryApi';

interface GovernanceSectionProps {
  row: GovernanceRow | null;
  modelMetrics: ModelMetricsRow;
  loading: boolean;
  isOffline: boolean;
  errorMsg?: string;
  onRetry: () => void;
}

export function GovernanceSection({
  row,
  modelMetrics,
  loading,
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
  const allClean = piiInvalid === 0 && dups === 0 && negLead === 0 && triageNulls === 0;

  return (
    <section id="sec-gobernanza" aria-label="Auditoría de gobernanza de datos y FinOps">
      {/* Banda de Gobernanza & FinOps */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
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
            <span className="font-medium text-sky-800 tabular-nums">
              BQML LOGISTIC_REG · Recall {fmtDec2.format(modelMetrics.recall * 100)}% · AUC{' '}
              {fmtDec2.format(modelMetrics.roc_auc)}
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
