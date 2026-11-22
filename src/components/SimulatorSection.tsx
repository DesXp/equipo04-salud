import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  DoughnutController,
  ArcElement,
  type ChartConfiguration,
} from 'chart.js';
import { Info, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';
import type {
  SimHistoryItem,
  SimulatorFeatures,
  WhatIfResult,
} from '../types/clinical';
import {
  fmtDec1,
  fmtDec2,
  getRiskLevel,
  predictAppointmentRisk,
} from '../services/bigqueryApi';

Chart.register(DoughnutController, ArcElement);

interface SimulatorSectionProps {
  features: SimulatorFeatures;
  onChangeFeatures: (next: SimulatorFeatures) => void;
  minAge: number;
  maxAge: number;
  minCapacity: number;
  maxCapacity: number;
  modelRecall: number;
  preloadedFromAgenda: boolean;
  evalTrigger: number;
}

export function SimulatorSection({
  features,
  onChangeFeatures,
  minAge,
  maxAge,
  minCapacity,
  maxCapacity,
  modelRecall,
  preloadedFromAgenda,
  evalTrigger,
}: SimulatorSectionProps) {
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingWhatIf, setLoadingWhatIf] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scorePct, setScorePct] = useState<number | null>(null);
  const [predClass, setPredClass] = useState<string | null>(null);
  const [isFallbackScore, setIsFallbackScore] = useState(false);
  const [lastEvaluatedFeatures, setLastEvaluatedFeatures] =
    useState<SimulatorFeatures | null>(null);
  const [whatIf, setWhatIf] = useState<WhatIfResult | null>(null);
  const [history, setHistory] = useState<SimHistoryItem[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);

  const gaugeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gaugeChartRef = useRef<Chart<'doughnut'> | null>(null);

  // Render Gauge whenever scorePct updates
  useEffect(() => {
    const canvas = gaugeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gaugeChartRef.current) {
      gaugeChartRef.current.destroy();
    }

    const risk = scorePct === null ? null : getRiskLevel(scorePct);
    const val = scorePct === null ? 0 : Number(scorePct.toFixed(1));
    const rest = Math.max(0, 100 - val);

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Riesgo No-Show', 'Restante'],
        datasets: [
          {
            data: [val, rest],
            backgroundColor: [risk ? risk.color : '#cbd5e1', '#e2e8f0'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 180,
        cutout: '75%',
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    };

    gaugeChartRef.current = new Chart(ctx, config);

    return () => {
      if (gaugeChartRef.current) {
        gaugeChartRef.current.destroy();
        gaugeChartRef.current = null;
      }
    };
  }, [scorePct]);

  const executePrediction = async (targetFeatures: SimulatorFeatures) => {
    setErrorMsg(null);
    setWhatIf(null);
    setLoadingPredict(true);

    try {
      const result = await predictAppointmentRisk(targetFeatures);
      setScorePct(result.probPct);
      setPredClass(result.predClass);
      setIsFallbackScore(Boolean(result.isFallback));
      setLastEvaluatedFeatures({ ...targetFeatures });

      const nowStr = new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setHistory((prev) => [
        {
          features: { ...targetFeatures },
          scorePct: result.probPct,
          predClass: result.predClass,
          timestamp: nowStr,
        },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo obtener la predicción desde BigQuery ML.',
      );
    } finally {
      setLoadingPredict(false);
    }
  };

  // Trigger prediction automatically when preloaded from Agenda Crítica
  useEffect(() => {
    if (evalTrigger > 0) {
      void executePrediction(features);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalTrigger]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executePrediction(features);
  };

  const handleWhatIf = async () => {
    setErrorMsg(null);
    setLoadingWhatIf(true);

    try {
      const needsBase =
        scorePct === null ||
        !lastEvaluatedFeatures ||
        JSON.stringify(lastEvaluatedFeatures) !== JSON.stringify(features);

      const featSmsConfirmed: SimulatorFeatures = {
        ...features,
        sms_confirmed: true,
      };
      const featApp: SimulatorFeatures = {
        ...features,
        appointment_channel: 'APP_MOBILE',
      };
      const feat7d: SimulatorFeatures = {
        ...features,
        lead_time_days: 7,
      };

      let baseVal = scorePct ?? 0;

      if (needsBase) {
        const [resBase, resSms, resApp, res7d] = await Promise.all([
          predictAppointmentRisk(features),
          predictAppointmentRisk(featSmsConfirmed),
          predictAppointmentRisk(featApp),
          predictAppointmentRisk(feat7d),
        ]);
        baseVal = resBase.probPct;
        setScorePct(resBase.probPct);
        setPredClass(resBase.predClass);
        setIsFallbackScore(Boolean(resBase.isFallback || resSms.isFallback));
        setLastEvaluatedFeatures({ ...features });
        setWhatIf({
          baseScore: baseVal,
          smsConfirmedScore: resSms.probPct,
          appScore: resApp.probPct,
          lead7Score: res7d.probPct,
        });
      } else {
        const [resSms, resApp, res7d] = await Promise.all([
          predictAppointmentRisk(featSmsConfirmed),
          predictAppointmentRisk(featApp),
          predictAppointmentRisk(feat7d),
        ]);
        if (resSms.isFallback || resApp.isFallback || res7d.isFallback) {
          setIsFallbackScore(true);
        }
        setWhatIf({
          baseScore: baseVal,
          smsConfirmedScore: resSms.probPct,
          appScore: resApp.probPct,
          lead7Score: res7d.probPct,
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al simular escenarios alternativos.',
      );
    } finally {
      setLoadingWhatIf(false);
    }
  };

  const handleRestoreHistory = (item: SimHistoryItem) => {
    onChangeFeatures({ ...item.features });
    setScorePct(item.scorePct);
    setPredClass(item.predClass);
    setLastEvaluatedFeatures({ ...item.features });
    setWhatIf(null);
    setErrorMsg(null);
  };

  const updateField = <K extends keyof SimulatorFeatures>(
    key: K,
    value: SimulatorFeatures[K],
  ) => {
    onChangeFeatures({ ...features, [key]: value });
  };

  const currentRisk = scorePct !== null ? getRiskLevel(scorePct) : null;

  const formatDelta = (delta: number) => {
    const sign = delta >= 0 ? '+' : '−';
    return `${sign}${fmtDec1.format(Math.abs(delta))} pp`;
  };

  const deltaColor = (delta: number) => {
    if (delta < -0.1) return 'text-emerald-700 font-bold';
    if (delta > 0.1) return 'text-red-700 font-bold';
    return 'text-slate-700 font-semibold';
  };

  return (
    <section
      id="sec-simulador"
      aria-label="Simulador predictivo BigQuery ML"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-sky-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">
              Simulador Predictivo de Riesgo por Cita (BigQuery ML en Vivo)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Evalúa las 12 variables clínicas y de contacto con{' '}
            <code className="font-mono text-slate-800">health_noshow_classifier</code> y
            obtén el protocolo recomendado para admisión.
          </p>
        </div>

        {preloadedFromAgenda && (
          <span className="text-xs font-semibold text-sky-700">
            Paciente precargado desde Agenda Crítica
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* FORMULARIO DE 12 VARIABLES */}
        <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* lead_time_days */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label htmlFor="f-lead_time_days">Días de anticipación</label>
                <span className="font-mono font-bold text-sky-700 tabular-nums">
                  {features.lead_time_days} d
                </span>
              </div>
              <input
                id="f-lead_time_days"
                type="range"
                min={0}
                max={60}
                step={1}
                value={features.lead_time_days}
                onChange={(e) => updateField('lead_time_days', Number(e.target.value))}
                className="mt-2 w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
                <span>0 d</span>
                <span>60 d</span>
              </div>
            </div>

            {/* prior_no_shows */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label htmlFor="f-prior_no_shows">Faltas previas</label>
                <span className="font-mono font-bold text-sky-700 tabular-nums">
                  {features.prior_no_shows}
                </span>
              </div>
              <input
                id="f-prior_no_shows"
                type="range"
                min={0}
                max={4}
                step={1}
                value={features.prior_no_shows}
                onChange={(e) => updateField('prior_no_shows', Number(e.target.value))}
                className="mt-2 w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
                <span>0</span>
                <span>4</span>
              </div>
            </div>

            {/* systolic_bp */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label htmlFor="f-systolic_bp">Presión sistólica</label>
                <span className="font-mono font-bold text-sky-700 tabular-nums">
                  {features.systolic_bp} mmHg
                </span>
              </div>
              <input
                id="f-systolic_bp"
                type="range"
                min={95}
                max={175}
                step={1}
                value={features.systolic_bp}
                onChange={(e) => updateField('systolic_bp', Number(e.target.value))}
                className="mt-2 w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
                <span>95</span>
                <span>175</span>
              </div>
            </div>

            {/* chronic_conditions */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label htmlFor="f-chronic_conditions">Condiciones crónicas</label>
                <span className="font-mono font-bold text-sky-700 tabular-nums">
                  {features.chronic_conditions}
                </span>
              </div>
              <input
                id="f-chronic_conditions"
                type="range"
                min={0}
                max={5}
                step={1}
                value={features.chronic_conditions}
                onChange={(e) =>
                  updateField('chronic_conditions', Number(e.target.value))
                }
                className="mt-2 w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
                <span>0</span>
                <span>5</span>
              </div>
            </div>

            {/* age */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label htmlFor="f-age">Edad del paciente</label>
                <span className="font-mono font-bold text-sky-700 tabular-nums">
                  {features.age} años
                </span>
              </div>
              <input
                id="f-age"
                type="range"
                min={minAge}
                max={maxAge}
                step={1}
                value={features.age}
                onChange={(e) => updateField('age', Number(e.target.value))}
                className="mt-2 w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
                <span>{minAge}</span>
                <span>{maxAge}</span>
              </div>
            </div>

            {/* capacity_daily */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label htmlFor="f-capacity_daily">Capacidad diaria sede</label>
                <span className="font-mono font-bold text-sky-700 tabular-nums">
                  {features.capacity_daily}
                </span>
              </div>
              <input
                id="f-capacity_daily"
                type="range"
                min={minCapacity}
                max={maxCapacity}
                step={1}
                value={features.capacity_daily}
                onChange={(e) => updateField('capacity_daily', Number(e.target.value))}
                className="mt-2 w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
                <span>{minCapacity}</span>
                <span>{maxCapacity}</span>
              </div>
            </div>
          </div>

          {/* 5 Selects categóricos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="f-appointment_channel"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Canal de reserva
              </label>
              <select
                id="f-appointment_channel"
                value={features.appointment_channel}
                onChange={(e) => updateField('appointment_channel', e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              >
                <option value="CALL_CENTER">CALL_CENTER</option>
                <option value="WALK_IN">WALK_IN</option>
                <option value="WEB">WEB</option>
                <option value="APP_MOBILE">APP_MOBILE</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="f-specialty"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Especialidad
              </label>
              <select
                id="f-specialty"
                value={features.specialty}
                onChange={(e) => updateField('specialty', e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              >
                <option value="TRAUMA">TRAUMA</option>
                <option value="CARDIOLOGY">CARDIOLOGY</option>
                <option value="GENERAL">GENERAL</option>
                <option value="ONCOLOGY">ONCOLOGY</option>
                <option value="PEDIATRICS">PEDIATRICS</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="f-center_city"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Ciudad de la sede
              </label>
              <select
                id="f-center_city"
                value={features.center_city}
                onChange={(e) => updateField('center_city', e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              >
                <option value="Lima">Lima</option>
                <option value="Arequipa">Arequipa</option>
                <option value="Trujillo">Trujillo</option>
                <option value="Cusco">Cusco</option>
                <option value="Piura">Piura</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="f-insurance_type"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Tipo de seguro
              </label>
              <select
                id="f-insurance_type"
                value={features.insurance_type}
                onChange={(e) => updateField('insurance_type', e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              >
                <option value="PUBLIC_SIS">PUBLIC_SIS</option>
                <option value="ESSALUD">ESSALUD</option>
                <option value="SELF_PAY">SELF_PAY</option>
                <option value="PRIVATE_EPS">PRIVATE_EPS</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="f-gender"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Sexo
              </label>
              <select
                id="f-gender"
                value={features.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              >
                <option value="F">F (Femenino)</option>
                <option value="M">M (Masculino)</option>
              </select>
            </div>
          </div>

          {/* Confirmación SMS Previa (sms_confirmed) */}
          <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Confirmación SMS Previa
                </p>
                <p className="text-[11px] text-slate-600">
                  Variable de contacto directo (<code className="font-mono">sms_confirmed</code>)
                </p>
              </div>
              <div
                role="group"
                aria-label="Confirmación SMS Previa"
                className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-white p-1"
              >
                <button
                  type="button"
                  aria-pressed={!features.sms_confirmed}
                  onClick={() => updateField('sms_confirmed', false)}
                  className={`h-9 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    !features.sms_confirmed
                      ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  No confirmó SMS
                </button>
                <button
                  type="button"
                  aria-pressed={features.sms_confirmed}
                  onClick={() => updateField('sms_confirmed', true)}
                  className={`h-9 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    features.sms_confirmed
                      ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sí confirmó SMS
                </button>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loadingPredict || loadingWhatIf}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPredict && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              <span>
                {loadingPredict
                  ? 'Consultando BigQuery ML…'
                  : 'Evaluar Riesgo en BigQuery ML'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleWhatIf}
              disabled={loadingPredict || loadingWhatIf}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingWhatIf ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-700" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
              )}
              <span>¿Qué pasaría si…?</span>
            </button>
          </div>
        </form>

        {/* PANEL DE RESULTADO Y PROTOCOLO */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Score de Riesgo de Ausentismo
                </h3>
                <button
                  type="button"
                  aria-label="Información sobre calibración del score"
                  aria-expanded={showTooltip}
                  onClick={() => setShowTooltip((prev) => !prev)}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </button>

                {showTooltip && (
                  <div
                    role="tooltip"
                    className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs leading-relaxed text-white shadow-lg sm:left-1/2 sm:-translate-x-1/2"
                  >
                    El modelo se entrenó con{' '}
                    <code className="font-mono text-sky-300">auto_class_weights=TRUE</code>
                    ; este valor es un score de riesgo relativo, no la probabilidad
                    calibrada (la tasa real de No-Show es 18.07%). El umbral de decisión
                    50% produce el Recall de {fmtDec2.format(modelRecall * 100)}%.
                  </div>
                )}
              </div>

              <span className="text-xs font-semibold text-slate-600">
                {scorePct === null
                  ? 'Sin evaluar'
                  : `${
                      predClass !== null
                        ? `Clase ${predClass} (${predClass === '1' ? 'No-Show' : 'Asiste'})`
                        : `Riesgo ${currentRisk?.level}`
                    }${isFallbackScore ? ' · Regla local v2' : ''}`}
              </span>
            </div>

            {/* Gauge semicircular */}
            <div className="relative mx-auto mt-3 h-44 w-72">
              <canvas
                ref={gaugeCanvasRef}
                aria-label="Medidor semicircular de riesgo de ausentismo"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
                <span
                  className="font-[var(--font-display)] text-3xl font-bold tracking-tight tabular-nums"
                  style={{ color: currentRisk ? currentRisk.color : '#0f172a' }}
                >
                  {scorePct === null ? '—%' : `${fmtDec1.format(scorePct)}%`}
                </span>
                <span
                  className="text-xs font-bold tracking-wide"
                  style={{ color: currentRisk ? currentRisk.color : '#64748b' }}
                >
                  {currentRisk
                    ? `RIESGO ${currentRisk.level}`
                    : 'Esperando evaluación'}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                {errorMsg}
              </div>
            )}

            {/* Tarjeta de Acción Clínica */}
            <div
              className={`mt-4 rounded-lg border p-4 transition-colors ${
                currentRisk
                  ? currentRisk.cardCls
                  : 'border-slate-200 bg-white'
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-500">
                Acción clínica recomendada
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  currentRisk ? currentRisk.textCls : 'text-slate-700'
                }`}
              >
                {currentRisk
                  ? currentRisk.action
                  : 'Presiona "Evaluar Riesgo en BigQuery ML" para obtener el protocolo recomendado para admisión.'}
              </p>
            </div>

            {/* Simulación contrafactual */}
            {whatIf && (
              <div className="mt-4 space-y-2 rounded-lg border border-sky-200 bg-white p-4 text-xs">
                <p className="font-bold text-sky-900">
                  Simulación contrafactual (“¿Qué pasaría si…?”)
                </p>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-slate-700">
                  <span>Escenario base actual</span>
                  <strong className="font-mono text-slate-900 tabular-nums">
                    {fmtDec1.format(whatIf.baseScore)}%
                  </strong>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-slate-700">
                  <span>
                    (1) Confirmar vía <strong className="font-mono">SMS</strong>
                  </span>
                  <span className="font-mono tabular-nums">
                    <strong className="text-slate-900">
                      {fmtDec1.format(whatIf.smsConfirmedScore)}%
                    </strong>{' '}
                    (
                    <span
                      className={deltaColor(
                        whatIf.smsConfirmedScore - whatIf.baseScore,
                      )}
                    >
                      {formatDelta(whatIf.smsConfirmedScore - whatIf.baseScore)}
                    </span>
                    )
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-slate-700">
                  <span>
                    (2) Cambiar canal a <strong className="font-mono">APP_MOBILE</strong>
                  </span>
                  <span className="font-mono tabular-nums">
                    <strong className="text-slate-900">
                      {fmtDec1.format(whatIf.appScore)}%
                    </strong>{' '}
                    (
                    <span className={deltaColor(whatIf.appScore - whatIf.baseScore)}>
                      {formatDelta(whatIf.appScore - whatIf.baseScore)}
                    </span>
                    )
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>(3) Reducir anticipación a 7 días</span>
                  <span className="font-mono tabular-nums">
                    <strong className="text-slate-900">
                      {fmtDec1.format(whatIf.lead7Score)}%
                    </strong>{' '}
                    (
                    <span className={deltaColor(whatIf.lead7Score - whatIf.baseScore)}>
                      {formatDelta(whatIf.lead7Score - whatIf.baseScore)}
                    </span>
                    )
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Historial de la sesión */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Historial de sesión (últimas 5)
              </span>
              <span className="text-slate-400">Clic para inspeccionar</span>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aún no hay evaluaciones en esta sesión.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {history.map((item, idx) => {
                  const r = getRiskLevel(item.scorePct);
                  return (
                    <button
                      key={`${item.timestamp}-${idx}`}
                      type="button"
                      onClick={() => handleRestoreHistory(item)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${r.badgeCls}`}
                    >
                      <span>{fmtDec1.format(item.scorePct)}%</span>
                      <span className="font-sans font-normal opacity-85">
                        · {item.features.specialty} · {item.features.lead_time_days}d
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
