import { useCallback, useEffect, useState } from 'react';
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
  parseBqDate,
  runQuery,
} from './services/bigqueryApi';
import type {
  AgendaRow,
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
        <GovernanceSection
          row={governance}
          mesesVentana={mesesVentana}
          modelMetrics={modelMetrics}
          loading={isRefreshing}
          isColdStart={isColdStart}
          isOffline={govOffline}
          errorMsg={govError}
          onRetry={() => void retrySection('governance')}
        />

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

          <CriticalAgendaSection
            rows={agendaRows}
            loading={isRefreshing}
            isOffline={b4Offline}
            onRetry={() => void retrySection('b4')}
            onEvaluateRow={handleEvaluateAgendaRow}
          />
        </section>

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

        <RoiCalculatorSection
          noShowsTotales={noShowsTotales}
          mesesVentana={mesesVentana}
          modelRecall={modelMetrics.recall}
        />

        <ExecutivePostEventSection
          modelMetrics={modelMetrics}
          paretoProfiles={paretoProfiles}
          monthlyTrend={monthlyTrend}
          byCitySummary={byCitySummary}
          loading={isRefreshing}
          isOffline={executiveOffline}
          onRetry={() => void retrySection('executive')}
        />
      </main>

      <FooterSection
        modelMetrics={modelMetrics}
        metricsOffline={metricsOffline}
      />
    </div>
  );
}
