import { SQL_QUERIES } from '../services/bigqueryApi';

export function FooterSection() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1360px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Arquitectura en Google Cloud Platform
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              PostgreSQL → Datastream CDC → BigQuery Medallion (Dataform) → BigQuery ML → Cloud Run (sa-run-equipo04) → Web App
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Proyecto: <code className="font-mono text-slate-700">datathon-dsc-uni</code> · Dataset:{' '}
            <code className="font-mono text-slate-700">curated_equipo04</code>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <details className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-900 focus-visible:outline-none">
              Ficha del modelo (BigQuery ML — health_noshow_classifier)
            </summary>
            <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-700">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <li>
                  <span className="font-semibold text-slate-900">Tipo:</span> LOGISTIC_REG
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Balanceo:</span>{' '}
                  auto_class_weights=TRUE
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Recall:</span> 67.23%
                </li>
                <li>
                  <span className="font-semibold text-slate-900">ROC-AUC:</span> 0.6408
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Accuracy:</span> 57.15%
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Target:</span> no_show_label
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
