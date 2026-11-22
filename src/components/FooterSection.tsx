import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { SQL_QUERIES, fmtDec2 } from '../services/bigqueryApi';
import type { BigQuerySnapshot, ModelMetricsRow } from '../types/clinical';

interface FooterSectionProps {
  modelMetrics: ModelMetricsRow;
  metricsOffline: boolean;
  onExportSnapshot: () => void;
  onImportSnapshot: (snapshot: BigQuerySnapshot) => void;
}

export function FooterSection({
  modelMetrics,
  metricsOffline,
  onExportSnapshot,
  onImportSnapshot,
}: FooterSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [snapshotNotice, setSnapshotNotice] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<BigQuerySnapshot>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.kpi ||
        !parsed.modelMetrics ||
        !Array.isArray(parsed.byChannel)
      ) {
        setSnapshotNotice('El archivo no corresponde a un snapshot válido de SaludConectada.');
        return;
      }
      onImportSnapshot(parsed as BigQuerySnapshot);
      setSnapshotNotice(
        `Snapshot cargado (${parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('es-PE') : file.name}).`,
      );
    } catch {
      setSnapshotNotice('No se pudo leer el archivo JSON seleccionado.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1360px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Arquitectura en Google Cloud Platform
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              PostgreSQL → Datastream CDC → BigQuery Medallion (Dataform) → BigQuery ML → Cloud Run (sa-run-equipo04) → Web App
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-500">
              Proyecto: <code className="font-mono text-slate-700">datathon-dsc-uni</code> · Dataset:{' '}
              <code className="font-mono text-slate-700">curated_equipo04</code>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onExportSnapshot();
                  setSnapshotNotice('Snapshot exportado: saludconectada_bigquery_snapshot_v2.json');
                }}
                className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                <Download className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
                <span>Descargar Snapshot JSON (Backup BigQuery)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Importar JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Importar archivo snapshot JSON de BigQuery"
              />
            </div>
          </div>
        </div>

        {snapshotNotice && (
          <p role="status" className="text-xs font-medium text-sky-800">
            {snapshotNotice}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <details className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-900 focus-visible:outline-none">
              Ficha del modelo (BigQuery ML — health_noshow_classifier)
            </summary>
            <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-700">
              <ul className="grid grid-cols-2 gap-2 tabular-nums sm:grid-cols-3">
                <li>
                  <span className="font-semibold text-slate-900">Tipo:</span> LOGISTIC_REG
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Balanceo:</span>{' '}
                  auto_class_weights=TRUE
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Recall:</span>{' '}
                  {fmtDec2.format(modelMetrics.recall * 100)}%
                </li>
                <li>
                  <span className="font-semibold text-slate-900">ROC-AUC:</span>{' '}
                  {modelMetrics.roc_auc.toFixed(4)}
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Accuracy:</span>{' '}
                  {fmtDec2.format(modelMetrics.accuracy * 100)}%
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Target:</span> no_show_label{' '}
                  {metricsOffline && (
                    <span className="text-[11px] text-amber-700">(respaldo)</span>
                  )}
                </li>
              </ul>
              <p className="rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-sky-950">
                <strong className="font-semibold">¿Por qué se prioriza el Recall?</strong>{' '}
                En gestión ambulatoria el costo de errores es asimétrico: un falso negativo
                cuesta un consultorio vacío (S/ 120 y 0.5 h médicas perdidas); un falso
                positivo solo dispara un recordatorio de bajo costo (S/ 0.15).
              </p>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-900 focus-visible:outline-none">
              SQL ejecutado (evidencia FinOps · solo columnas explícitas y agregaciones)
            </summary>
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto border-t border-slate-200 pt-3 font-mono text-[11px] text-slate-700">
              {Object.entries(SQL_QUERIES).map(([key, sql]) => (
                <div
                  key={key}
                  className="rounded-lg border border-slate-200 bg-white p-2.5"
                >
                  <p className="mb-1 text-[10px] font-bold text-sky-700">{key}</p>
                  <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-700">
                    {sql}
                  </pre>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </footer>
  );
}
