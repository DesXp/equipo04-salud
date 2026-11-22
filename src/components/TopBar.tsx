import { RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../types/clinical';

interface TopBarProps {
  connectionStatus: ConnectionStatus;
  lastUpdated: string | null;
  isRefreshing: boolean;
  onRefreshAll: () => void;
}

export function TopBar({
  connectionStatus,
  lastUpdated,
  isRefreshing,
  onRefreshAll,
}: TopBarProps) {
  const statusLabel =
    connectionStatus === 'live'
      ? 'En vivo · BigQuery'
      : connectionStatus === 'reconnecting'
        ? 'Reconectando…'
        : 'Modo offline';

  const statusTextColor =
    connectionStatus === 'live'
      ? 'text-emerald-700'
      : connectionStatus === 'reconnecting'
        ? 'text-amber-700'
        : 'text-slate-600';

  const statusDotColor =
    connectionStatus === 'live'
      ? 'bg-emerald-600'
      : connectionStatus === 'reconnecting'
        ? 'bg-amber-500'
        : 'bg-slate-400';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:gap-6 lg:px-8">
        <a
          href="#top"
          className="shrink-0 whitespace-nowrap font-[var(--font-display)] text-base font-bold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 sm:text-lg"
        >
          SaludConectada
        </a>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-4 text-sm font-medium text-slate-600 lg:flex xl:gap-6"
        >
          <a
            href="#sec-kpis"
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            Resumen
          </a>
          <a
            href="#sec-gerencia"
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            Post-Evento
          </a>
          <a
            href="#sec-analitica"
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            Factores
          </a>
          <a
            href="#sec-agenda"
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            Agenda
          </a>
          <a
            href="#sec-simulador"
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            Simulador
          </a>
          <a
            href="#sec-roi"
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-sky-700 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            ROI
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-2 text-xs font-medium sm:flex">
            <span
              className={`inline-block h-2 w-2 rounded-full ${statusDotColor}`}
              aria-hidden="true"
            />
            <span className={`whitespace-nowrap ${statusTextColor}`}>{statusLabel}</span>
            {lastUpdated && (
              <span className="hidden items-center gap-2 xl:inline-flex">
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="whitespace-nowrap font-mono text-[11px] text-slate-500 tabular-nums">
                  {lastUpdated}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65 sm:px-4"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Actualizando' : 'Refrescar'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
