import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { GovernanceSection } from './components/GovernanceSection';
import { KpiSection } from './components/KpiSection';
import { AnalyticsChartsSection } from './components/AnalyticsChartsSection';
import { HeatmapSection } from './components/HeatmapSection';
import { CriticalAgendaSection } from './components/CriticalAgendaSection';
import { SimulatorSection } from './components/SimulatorSection';
import { RoiCalculatorSection } from './components/RoiCalculatorSection';
import { ExecutivePostEventSection } from './components/ExecutivePostEventSection';
import { FooterSection } from './components/FooterSection';
import {
  CONFIG,
  DEFAULT_FEATURES,
  OFFLINE_FALLBACK,
  SQL_QUERIES,
  calcMonthsBetween,
  fmtDec1,
  parseBqDate,
  runQuery,
} from './services/bigqueryApi';
import type {
  AgendaRow,
  BigQuerySnapshot,
  ChannelRow,
  CitySummaryRow,
  ConnectionStatus,
  GovernanceRow,
  HeatmapRow,
  InsuranceRow,
  KpiSummaryRow,
  LeadRangeRow,
  ModelMetricsRow,
  MonthlyTrendRow,
  ParetoProfileRow,
  PriorNoShowRow,
  SimulatorFeatures,
  SpecialtyRow,
} from './types/clinical';

const FALLBACK_MODEL_METRICS: ModelMetricsRow = {
  precision: 0,
  recall: CONFIG.RECALL,
  accuracy: CONFIG.ACCURACY,
  f1_score: 0,
  roc_auc: CONFIG.ROC_AUC,
};

export default function App() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('reconnecting');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(true);
  const [isColdStart, setIsColdStart] = useState<boolean>(true);

  const [governance, setGovernance] = useState<GovernanceRow | null>(null);
  const [govOffline, setGovOffline] = useState(false);
  const [govError, setGovError] = useState<string | undefined>(undefined);

  const [kpi, setKpi] = useState<KpiSummaryRow | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyRow[]>([]);
  const [kpiOffline, setKpiOffline] = useState(false);
  const [kpiError, setKpiError] = useState<string | undefined>(undefined);

  const [leadRanges, setLeadRanges] = useState<LeadRangeRow[]>([]);
  const [b1Offline, setB1Offline] = useState(false);

  const [priorNoShows, setPriorNoShows] = useState<PriorNoShowRow[]>([]);
  const [insurances, setInsurances] = useState<InsuranceRow[]>([]);
  const [b2Offline, setB2Offline] = useState(false);

  const [heatmapRows, setHeatmapRows] = useState<HeatmapRow[]>([]);
  const [b3Offline, setB3Offline] = useState(false);

  const [agendaRows, setAgendaRows] = useState<AgendaRow[]>([]);
  const [b4Offline, setB4Offline] = useState(false);

  const [modelMetrics, setModelMetrics] = useState<ModelMetricsRow>(
    FALLBACK_MODEL_METRICS,
  );
  const [metricsOffline, setMetricsOffline] = useState(false);

  const [paretoProfiles, setParetoProfiles] = useState<ParetoProfileRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendRow[]>([]);
  const [byCitySummary, setByCitySummary] = useState<CitySummaryRow[]>([]);
  const [executiveOffline, setExecutiveOffline] = useState(false);

  const [simFeatures, setSimFeatures] = useState<SimulatorFeatures>(DEFAULT_FEATURES);
  const [preloadedFromAgenda, setPreloadedFromAgenda] = useState(false);
  const [evalTrigger, setEvalTrigger] = useState(0);

  const markUpdatedTime = () => {
    setLastUpdated(
      new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  };

  const loadDashboard = useCallback(async () => {
    setConnectionStatus('reconnecting');
    setIsRefreshing(true);

    const tasks = [
      runQuery<GovernanceRow>(SQL_QUERIES.GOVERNANCE),
      runQuery<KpiSummaryRow>(SQL_QUERIES.KPI_SUMMARY),
      runQuery<ChannelRow>(SQL_QUERIES.BY_CHANNEL),
      runQuery<SpecialtyRow>(SQL_QUERIES.BY_SPECIALTY),
      runQuery<LeadRangeRow>(SQL_QUERIES.BY_LEAD_RANGE),
      runQuery<PriorNoShowRow>(SQL_QUERIES.BY_PRIOR_NOSHOWS),
      runQuery<InsuranceRow>(SQL_QUERIES.BY_INSURANCE),
      runQuery<HeatmapRow>(SQL_QUERIES.HEATMAP_CENTER_SPECIALTY),
      runQuery<AgendaRow>(SQL_QUERIES.CRITICAL_AGENDA),
      runQuery<ModelMetricsRow>(SQL_QUERIES.MODEL_METRICS),
      runQuery<ParetoProfileRow>(SQL_QUERIES.PARETO_PROFILES),
      runQuery<MonthlyTrendRow>(SQL_QUERIES.MONTHLY_TREND),
      runQuery<CitySummaryRow>(SQL_QUERIES.BY_CITY_SUMMARY),
    ] as const;

    const settled = await Promise.allSettled(tasks);
    const successCount = settled.filter((s) => s.status === 'fulfilled').length;

    setIsColdStart(false);
    setIsRefreshing(false);
    markUpdatedTime();
    setConnectionStatus(successCount > 0 ? 'live' : 'offline');

    const [
      govRes,
      kpiRes,
      chanRes,
      specRes,
      leadRes,
      priorRes,
      insRes,
      heatRes,
      agendaRes,
      metricsRes,
      paretoRes,
      trendRes,
      cityRes,
    ] = settled;

    // 0) Governance
    if (govRes.status === 'fulfilled' && govRes.value[0]) {
      setGovernance(govRes.value[0]);
      setGovOffline(false);
      setGovError(undefined);
    } else {
      setGovernance(OFFLINE_FALLBACK.governance);
      setGovOffline(true);
      setGovError(
        govRes.status === 'rejected'
          ? govRes.reason?.message || 'Error de conexión'
          : 'Sin filas devueltas',
      );
    }

    // A) KPIs & Bounds
    const nextKpi =
      kpiRes.status === 'fulfilled' && kpiRes.value[0]
        ? kpiRes.value[0]
        : OFFLINE_FALLBACK.kpi;
    const nextChan =
      chanRes.status === 'fulfilled' ? chanRes.value : OFFLINE_FALLBACK.byChannel;
    const nextSpec =
      specRes.status === 'fulfilled'
        ? specRes.value
        : OFFLINE_FALLBACK.bySpecialty;

    setKpi(nextKpi);
    setChannels(nextChan);
    setSpecialties(nextSpec);

    const isKpiOff = !(
      kpiRes.status === 'fulfilled' &&
      chanRes.status === 'fulfilled' &&
      specRes.status === 'fulfilled'
    );
    setKpiOffline(isKpiOff);
    if (isKpiOff) {
      const msg =
        (kpiRes.status === 'rejected' && kpiRes.reason?.message) ||
        (chanRes.status === 'rejected' && chanRes.reason?.message) ||
        (specRes.status === 'rejected' && specRes.reason?.message) ||
        'Error al consultar KPIs';
      setKpiError(msg);
    } else {
      setKpiError(undefined);
    }

    // Clamp initial simulator age/capacity bounds if DB returned narrower/wider range
    const minAge = Number.isFinite(Number(nextKpi.min_age))
      ? Number(nextKpi.min_age)
      : 0;
    const maxAge = Number.isFinite(Number(nextKpi.max_age))
      ? Number(nextKpi.max_age)
      : 90;
    const minCap = Number.isFinite(Number(nextKpi.min_capacity))
      ? Number(nextKpi.min_capacity)
      : 50;
    const maxCap = Number.isFinite(Number(nextKpi.max_capacity))
      ? Number(nextKpi.max_capacity)
      : 300;
    setSimFeatures((prev) => ({
      ...prev,
      age: Math.min(maxAge, Math.max(minAge, prev.age)),
      capacity_daily: Math.min(maxCap, Math.max(minCap, prev.capacity_daily)),
    }));

    // B1) Channel & Lead
    setLeadRanges(
      leadRes.status === 'fulfilled' ? leadRes.value : OFFLINE_FALLBACK.byLeadRange,
    );
    setB1Offline(
      !(chanRes.status === 'fulfilled' && leadRes.status === 'fulfilled'),
    );

    // B2) Prior & Insurance
    setPriorNoShows(
      priorRes.status === 'fulfilled' ? priorRes.value : OFFLINE_FALLBACK.byPrior,
    );
    setInsurances(
      insRes.status === 'fulfilled' ? insRes.value : OFFLINE_FALLBACK.byInsurance,
    );
    setB2Offline(
      !(priorRes.status === 'fulfilled' && insRes.status === 'fulfilled'),
    );

    // B3) Heatmap
    setHeatmapRows(
      heatRes.status === 'fulfilled' ? heatRes.value : OFFLINE_FALLBACK.heatmap,
    );
    setB3Offline(heatRes.status !== 'fulfilled');

    // B4) Agenda
    setAgendaRows(
      agendaRes.status === 'fulfilled' ? agendaRes.value : OFFLINE_FALLBACK.agenda,
    );
    setB4Offline(agendaRes.status !== 'fulfilled');

    // ML.EVALUATE live metrics
    if (metricsRes.status === 'fulfilled' && metricsRes.value[0]) {
      const m = metricsRes.value[0];
      setModelMetrics({
        precision: Number(m.precision ?? 0),
        recall: Number(m.recall ?? CONFIG.RECALL),
        accuracy: Number(m.accuracy ?? CONFIG.ACCURACY),
        f1_score: Number(m.f1_score ?? 0),
        roc_auc: Number(m.roc_auc ?? CONFIG.ROC_AUC),
      });
      setMetricsOffline(false);
    } else {
      setModelMetrics(OFFLINE_FALLBACK.modelMetrics);
      setMetricsOffline(true);
    }

    // Executive Post-Event queries
    setParetoProfiles(
      paretoRes.status === 'fulfilled'
        ? paretoRes.value
        : OFFLINE_FALLBACK.paretoProfiles,
    );
    setMonthlyTrend(
      trendRes.status === 'fulfilled'
        ? trendRes.value
        : OFFLINE_FALLBACK.monthlyTrend,
    );
    setByCitySummary(
      cityRes.status === 'fulfilled'
        ? cityRes.value
        : OFFLINE_FALLBACK.byCitySummary,
    );
    setExecutiveOffline(
      !(
        metricsRes.status === 'fulfilled' &&
        paretoRes.status === 'fulfilled' &&
        trendRes.status === 'fulfilled' &&
        cityRes.status === 'fulfilled'
      ),
    );
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const retrySection = async (
    section: 'governance' | 'kpis' | 'b1' | 'b2' | 'b3' | 'b4' | 'executive',
  ) => {
    setConnectionStatus('reconnecting');
    try {
      if (section === 'governance') {
        const rows = await runQuery<GovernanceRow>(SQL_QUERIES.GOVERNANCE);
        if (rows[0]) {
          setGovernance(rows[0]);
          setGovOffline(false);
          setGovError(undefined);
        }
      } else if (section === 'kpis') {
        const [k, c, s] = await Promise.all([
          runQuery<KpiSummaryRow>(SQL_QUERIES.KPI_SUMMARY),
          runQuery<ChannelRow>(SQL_QUERIES.BY_CHANNEL),
          runQuery<SpecialtyRow>(SQL_QUERIES.BY_SPECIALTY),
        ]);
        if (k[0]) setKpi(k[0]);
        setChannels(c);
        setSpecialties(s);
        setKpiOffline(false);
        setKpiError(undefined);
      } else if (section === 'b1') {
        const [c, l] = await Promise.all([
          runQuery<ChannelRow>(SQL_QUERIES.BY_CHANNEL),
          runQuery<LeadRangeRow>(SQL_QUERIES.BY_LEAD_RANGE),
        ]);
        setChannels(c);
        setLeadRanges(l);
        setB1Offline(false);
      } else if (section === 'b2') {
        const [p, i] = await Promise.all([
          runQuery<PriorNoShowRow>(SQL_QUERIES.BY_PRIOR_NOSHOWS),
          runQuery<InsuranceRow>(SQL_QUERIES.BY_INSURANCE),
        ]);
        setPriorNoShows(p);
        setInsurances(i);
        setB2Offline(false);
      } else if (section === 'b3') {
        const h = await runQuery<HeatmapRow>(SQL_QUERIES.HEATMAP_CENTER_SPECIALTY);
        setHeatmapRows(h);
        setB3Offline(false);
      } else if (section === 'b4') {
        const a = await runQuery<AgendaRow>(SQL_QUERIES.CRITICAL_AGENDA);
        setAgendaRows(a);
        setB4Offline(false);
      } else if (section === 'executive') {
        const [mRows, pRows, tRows, cRows] = await Promise.all([
          runQuery<ModelMetricsRow>(SQL_QUERIES.MODEL_METRICS),
          runQuery<ParetoProfileRow>(SQL_QUERIES.PARETO_PROFILES),
          runQuery<MonthlyTrendRow>(SQL_QUERIES.MONTHLY_TREND),
          runQuery<CitySummaryRow>(SQL_QUERIES.BY_CITY_SUMMARY),
        ]);
        if (mRows[0]) {
          setModelMetrics({
            precision: Number(mRows[0].precision ?? 0),
            recall: Number(mRows[0].recall ?? CONFIG.RECALL),
            accuracy: Number(mRows[0].accuracy ?? CONFIG.ACCURACY),
            f1_score: Number(mRows[0].f1_score ?? 0),
            roc_auc: Number(mRows[0].roc_auc ?? CONFIG.ROC_AUC),
          });
          setMetricsOffline(false);
        }
        setParetoProfiles(pRows);
        setMonthlyTrend(tRows);
        setByCitySummary(cRows);
        setExecutiveOffline(false);
      }
      setConnectionStatus('live');
      markUpdatedTime();
    } catch (err) {
      setConnectionStatus('offline');
      if (section === 'governance') {
        setGovError(
          err instanceof Error
            ? err.message
            : 'No fue posible reconectar con BigQuery.',
        );
      } else if (section === 'kpis') {
        setKpiError(
          err instanceof Error
            ? err.message
            : 'No fue posible reconectar con BigQuery.',
        );
      }
    }
  };

  const handleEvaluateAgendaRow = (row: AgendaRow) => {
    setSimFeatures({
      lead_time_days: Number(row.lead_time_days),
      prior_no_shows: Number(row.prior_no_shows),
      systolic_bp: Number(row.systolic_bp),
      chronic_conditions: Number(row.chronic_conditions),
      age: Number(row.age),
      capacity_daily: Number(row.capacity_daily),
      appointment_channel: row.appointment_channel,
      specialty: row.specialty,
      center_city: row.center_city,
      insurance_type: row.insurance_type,
      gender: row.gender,
      sms_confirmed: Boolean(row.sms_confirmed),
    });
    setPreloadedFromAgenda(true);
    setEvalTrigger((c) => c + 1);

    const simEl = document.getElementById('sec-simulador');
    if (simEl) {
      simEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExportSnapshot = () => {
    const snapshot: BigQuerySnapshot = {
      exportedAt: new Date().toISOString(),
      connectionStatus,
      governance,
      kpi,
      modelMetrics,
      paretoProfiles,
      monthlyTrend,
      byCitySummary,
      byChannel: channels,
      bySpecialty: specialties,
      byLeadRange: leadRanges,
      byPrior: priorNoShows,
      byInsurance: insurances,
      heatmap: heatmapRows,
      agenda: agendaRows,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'saludconectada_bigquery_snapshot_v2.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSnapshot = (snapshot: BigQuerySnapshot) => {
    if (snapshot.governance) setGovernance(snapshot.governance);
    if (snapshot.kpi) setKpi(snapshot.kpi);
    if (snapshot.modelMetrics) {
      setModelMetrics({
        precision: Number(snapshot.modelMetrics.precision ?? 0),
        recall: Number(snapshot.modelMetrics.recall ?? CONFIG.RECALL),
        accuracy: Number(snapshot.modelMetrics.accuracy ?? CONFIG.ACCURACY),
        f1_score: Number(snapshot.modelMetrics.f1_score ?? 0),
        roc_auc: Number(snapshot.modelMetrics.roc_auc ?? CONFIG.ROC_AUC),
      });
    }
    if (Array.isArray(snapshot.byChannel)) setChannels(snapshot.byChannel);
    if (Array.isArray(snapshot.bySpecialty)) setSpecialties(snapshot.bySpecialty);
    if (Array.isArray(snapshot.byLeadRange)) setLeadRanges(snapshot.byLeadRange);
    if (Array.isArray(snapshot.byPrior)) setPriorNoShows(snapshot.byPrior);
    if (Array.isArray(snapshot.byInsurance)) setInsurances(snapshot.byInsurance);
    if (Array.isArray(snapshot.heatmap)) setHeatmapRows(snapshot.heatmap);
    if (Array.isArray(snapshot.agenda)) setAgendaRows(snapshot.agenda);
    if (Array.isArray(snapshot.paretoProfiles)) setParetoProfiles(snapshot.paretoProfiles);
    if (Array.isArray(snapshot.monthlyTrend)) setMonthlyTrend(snapshot.monthlyTrend);
    if (Array.isArray(snapshot.byCitySummary)) setByCitySummary(snapshot.byCitySummary);

    setIsColdStart(false);
    setIsRefreshing(false);
    setConnectionStatus('offline');
    setGovOffline(true);
    setKpiOffline(true);
    setB1Offline(true);
    setB2Offline(true);
    setB3Offline(true);
    setB4Offline(true);
    setMetricsOffline(true);
    setExecutiveOffline(true);
    setGovError('Cargado desde snapshot JSON local');
    setKpiError(undefined);
    markUpdatedTime();
  };

  const mesesVentana = governance
    ? calcMonthsBetween(
        parseBqDate(governance.min_date),
        parseBqDate(governance.max_date),
      )
    : 12;

  const globalNoShowPct = kpi
    ? Number(kpi.no_show_rate) * 100
    : CONFIG.SNAPSHOT.noShowRate;

  const noShowsTotales = kpi ? Number(kpi.no_shows) : CONFIG.SNAPSHOT.noShows;

  const minAge =
    kpi && Number.isFinite(Number(kpi.min_age)) ? Number(kpi.min_age) : 0;
  const maxAge =
    kpi && Number.isFinite(Number(kpi.max_age)) ? Number(kpi.max_age) : 90;
  const minCapacity =
    kpi && Number.isFinite(Number(kpi.min_capacity))
      ? Number(kpi.min_capacity)
      : 50;
  const maxCapacity =
    kpi && Number.isFinite(Number(kpi.max_capacity))
      ? Number(kpi.max_capacity)
      : 300;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar
        connectionStatus={connectionStatus}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefreshAll={() => void loadDashboard()}
      />

      <main className="mx-auto max-w-[1360px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Cabecera Ejecutiva + Cold Start */}
        <section id="top" className="space-y-4">
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
                Herramienta operativa para{' '}
                <strong className="font-semibold text-slate-800">Gerencia Médica</strong> (ROI y
                recuperación de capacidad) y{' '}
                <strong className="font-semibold text-slate-800">Admisión</strong> (semáforo de
                riesgo por cita en BigQuery ML).
              </p>
            </div>

            <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-700">
              <span className="text-slate-500">Ventana analizada: </span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {governance ? parseBqDate(governance.min_date) : '—'} →{' '}
                {governance ? parseBqDate(governance.max_date) : '—'}
              </span>
              <span className="ml-1.5 text-slate-500 tabular-nums">
                ({fmtDec1.format(mesesVentana)} meses)
              </span>
            </div>
          </div>

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
                    Ejecutando 13 consultas paralelas agregadas sobre{' '}
                    <code className="font-mono text-[11px]">
                      curated_equipo04.curated_appointments_gold
                    </code>{' '}
                    y <code className="font-mono text-[11px]">ML.EVALUATE</code>.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-sky-800">
                FinOps · Solo agregaciones
              </span>
            </div>
          )}
        </section>

        {/* PASO 1: Impacto Macro y Gobernanza */}
        <KpiSection
          kpi={kpi}
          channels={channels}
          specialties={specialties}
          mesesVentana={mesesVentana}
          loading={isRefreshing}
          isOffline={kpiOffline}
          errorMsg={kpiError}
          onRetry={() => void retrySection('kpis')}
        />

        <GovernanceSection
          row={governance}
          modelMetrics={modelMetrics}
          loading={isRefreshing}
          isOffline={govOffline}
          errorMsg={govError}
          onRetry={() => void retrySection('governance')}
        />

        {/* PASO 2: Diagnóstico Gerencial y Causa Raíz */}
        <ExecutivePostEventSection
          modelMetrics={modelMetrics}
          paretoProfiles={paretoProfiles}
          monthlyTrend={monthlyTrend}
          byCitySummary={byCitySummary}
          loading={isRefreshing}
          isOffline={executiveOffline}
          onRetry={() => void retrySection('executive')}
        />

        <section
          id="sec-analitica"
          aria-label="Análisis de factores de ausentismo y sobrecupo"
          className="space-y-6"
        >
          <AnalyticsChartsSection
            channels={channels}
            leadRanges={leadRanges}
            priorNoShows={priorNoShows}
            insurances={insurances}
            globalNoShowPct={globalNoShowPct}
            b1Offline={b1Offline}
            b2Offline={b2Offline}
            onRetryB1={() => void retrySection('b1')}
            onRetryB2={() => void retrySection('b2')}
          />

          <HeatmapSection
            rows={heatmapRows}
            loading={isRefreshing}
            isOffline={b3Offline}
            onRetry={() => void retrySection('b3')}
          />
        </section>

        {/* PASO 3: Operación Clínica e Intervención en Vivo */}
        <section
          aria-label="Operación clínica e intervención en vivo"
          className="space-y-6"
        >
          <CriticalAgendaSection
            rows={agendaRows}
            loading={isRefreshing}
            isOffline={b4Offline}
            onRetry={() => void retrySection('b4')}
            onEvaluateRow={handleEvaluateAgendaRow}
          />

          <SimulatorSection
            features={simFeatures}
            onChangeFeatures={(next) => {
              setPreloadedFromAgenda(false);
              setSimFeatures(next);
            }}
            minAge={minAge}
            maxAge={maxAge}
            minCapacity={minCapacity}
            maxCapacity={maxCapacity}
            modelRecall={modelMetrics.recall}
            preloadedFromAgenda={preloadedFromAgenda}
            evalTrigger={evalTrigger}
          />
        </section>

        {/* PASO 4: Retorno Financiero */}
        <RoiCalculatorSection
          noShowsTotales={noShowsTotales}
          mesesVentana={mesesVentana}
          modelRecall={modelMetrics.recall}
        />
      </main>

      <FooterSection
        modelMetrics={modelMetrics}
        metricsOffline={metricsOffline}
        onExportSnapshot={handleExportSnapshot}
        onImportSnapshot={handleImportSnapshot}
      />
    </div>
  );
}
