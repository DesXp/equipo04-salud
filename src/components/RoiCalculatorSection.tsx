import { useState } from 'react';
import { Calculator } from 'lucide-react';
import {
  CONFIG,
  fmtDec1,
  fmtDec2,
  fmtInt,
  fmtPEN,
  fmtPEN2,
} from '../services/bigqueryApi';

interface RoiCalculatorSectionProps {
  noShowsTotales: number;
  mesesVentana: number;
  modelRecall: number;
}

export function RoiCalculatorSection({
  noShowsTotales,
  mesesVentana,
  modelRecall,
}: RoiCalculatorSectionProps) {
  const [recoveryPct, setRecoveryPct] = useState<number>(40);

  const meses = Math.max(1, mesesVentana);
  const noShowsMes = noShowsTotales / meses;
  const detectadasMes = noShowsMes * modelRecall;
  const recuperadasMes = detectadasMes * (recoveryPct / 100);

  const horasMes = recuperadasMes * CONFIG.HOURS_PER_APPT;
  const solesMes = recuperadasMes * CONFIG.COST_PER_APPT;
  const solesAnio = solesMes * 12;
  const jornadasMes = horasMes / 8;

  const costoRecordatoriosMes = detectadasMes * CONFIG.REMINDER_COST;
  const beneficioNetoMes = solesMes - costoRecordatoriosMes;
  const beneficioNetoAnio = beneficioNetoMes * 12;

  const recoveryTier =
    recoveryPct <= 25
      ? 'basic'
      : recoveryPct <= 45
        ? 'recommended'
        : 'integral';

  const activeLeverText =
    recoveryTier === 'basic'
      ? 'Nivel Básico: Solo recordatorio automático SMS/WhatsApp 48 h antes.'
      : recoveryTier === 'recommended'
        ? 'Nivel Recomendado (Base 40%): WhatsApp + auto-liberación de cupo en 24 h + tope de 15 días a reincidentes.'
        : 'Nivel Integral: Combo completo (Pre-pago en particulares/EPS + tope 15 días en SIS/EsSalud + sobrecupo controlado).';

  return (
    <section
      id="sec-roi"
      aria-label="Calculadora de ROI y recuperación de consultorios"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">
              Calculadora de ROI y Recuperación de Consultorios (Gerencia Médica)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            Impacto financiero y operativo mensual proyectado al intervenir
            proactivamente las citas detectadas por el modelo (Recall{' '}
            {fmtDec2.format(modelRecall * 100)}%).
          </p>
        </div>

        <div className="min-w-[290px] rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-emerald-900">
            <label htmlFor="slider-roi-recovery">
              % de recuperación efectiva
            </label>
            <span className="font-mono font-bold text-emerald-800 tabular-nums">
              {recoveryPct}%
            </span>
          </div>
          <input
            id="slider-roi-recovery"
            type="range"
            min={10}
            max={60}
            step={1}
            value={recoveryPct}
            onChange={(e) => setRecoveryPct(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-emerald-800">
            <span>10%</span>
            <span>40% base</span>
            <span>60%</span>
          </div>
        </div>
      </div>

      {/* 4 métricas principales */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="text-xs font-semibold text-slate-600">
            Horas médicas recuperadas / mes
          </p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-sky-700 tabular-nums">
            {fmtInt.format(Math.round(horasMes))} h
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {fmtInt.format(Math.round(recuperadasMes))} citas recuperadas/mes
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-xs font-semibold text-emerald-900">
            Valor recuperado / mes
          </p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-emerald-700 tabular-nums">
            {fmtPEN.format(solesMes)}
          </p>
          <p className="mt-1 text-xs text-emerald-900 tabular-nums">
            Neto: {fmtPEN.format(beneficioNetoMes)}/mes (recordatorios:{' '}
            {fmtPEN2.format(costoRecordatoriosMes)})
          </p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-5">
          <p className="text-xs font-semibold text-sky-900">Proyección anual</p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-sky-800 tabular-nums">
            {fmtPEN.format(solesAnio)}
          </p>
          <p className="mt-1 text-xs text-sky-800 tabular-nums">
            Beneficio neto anual: {fmtPEN.format(beneficioNetoAnio)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="text-xs font-semibold text-slate-600">
            Jornadas de consultorio liberadas
          </p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-slate-900 tabular-nums">
            {fmtDec1.format(jornadasMes)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Turnos de 8 h/mes reasignables
          </p>
        </div>
      </div>

      {/* Supuestos y Palancas de Recuperación */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Supuestos y Palancas de Recuperación
          </h3>
          <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
            Escenario seleccionado: {recoveryPct}% de recuperación
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <p className="font-mono text-xs font-bold text-slate-900">
              0.5 h/cita
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Duración estándar de consulta ambulatoria (30 min de médico y
              consultorio).
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <p className="font-mono text-xs font-bold text-slate-900">
              S/ 120/cita
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Costo de oportunidad promedio por turno perdido (consulta +
              capacidad ociosa).
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <p className="font-mono text-xs font-bold text-slate-900">
              S/ 0.15/cita
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Costo unitario de mensajería automatizada (WhatsApp/SMS) aplicada
              al total de ausencias detectadas por el modelo (Recall).
            </p>
          </div>
        </div>

        {/* Palanca operativa activa */}
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
            Palanca operativa requerida para lograr {recoveryPct}% de recuperación
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-950 sm:text-sm">
            {activeLeverText}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] md:grid-cols-3">
          <div
            className={`rounded-lg border p-2.5 transition-colors ${
              recoveryTier === 'basic'
                ? 'border-emerald-400 bg-emerald-50/60 font-semibold text-slate-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <span className="font-mono font-bold text-slate-800">10% – 25%:</span>{' '}
            Nivel Básico — Solo recordatorio automático SMS/WhatsApp 48 h antes.
          </div>
          <div
            className={`rounded-lg border p-2.5 transition-colors ${
              recoveryTier === 'recommended'
                ? 'border-emerald-400 bg-emerald-50/60 font-semibold text-slate-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <span className="font-mono font-bold text-slate-800">26% – 45%:</span>{' '}
            Nivel Recomendado (Base 40%) — WhatsApp + auto-liberación 24 h + tope 15 días.
          </div>
          <div
            className={`rounded-lg border p-2.5 transition-colors ${
              recoveryTier === 'integral'
                ? 'border-emerald-400 bg-emerald-50/60 font-semibold text-slate-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <span className="font-mono font-bold text-slate-800">46% – 60%:</span>{' '}
            Nivel Integral — Pre-pago particulares/EPS + tope 15 días SIS/EsSalud + sobrecupo controlado.
          </div>
        </div>
      </div>

      {/* Fórmula auditable */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        <p className="mb-1.5 font-semibold text-slate-900">
          Fórmula transparente (auditabilidad financiera):
        </p>
        <div className="space-y-1 font-mono text-[11px] leading-relaxed text-slate-700 tabular-nums">
          <p>
            noShowsMes = {fmtInt.format(noShowsTotales)} / {fmtDec1.format(meses)}{' '}
            meses = <strong>{fmtDec1.format(noShowsMes)}</strong> citas/mes
          </p>
          <p>
            detectadasMes = {fmtDec1.format(noShowsMes)} × Recall (
            {modelRecall.toFixed(4)}) ={' '}
            <strong>{fmtDec1.format(detectadasMes)}</strong> citas/mes
          </p>
          <p>
            recuperadasMes = {fmtDec1.format(detectadasMes)} × {recoveryPct}% ={' '}
            <strong>{fmtDec1.format(recuperadasMes)}</strong> citas/mes
          </p>
          <p>
            horasMes = {fmtDec1.format(recuperadasMes)} × {CONFIG.HOURS_PER_APPT} h ={' '}
            <strong>{fmtDec1.format(horasMes)} h</strong> ({fmtDec1.format(jornadasMes)}{' '}
            jornadas de 8 h) · solesMes = {fmtDec1.format(recuperadasMes)} × S/{' '}
            {CONFIG.COST_PER_APPT} = <strong>{fmtPEN.format(solesMes)}</strong> ·
            costoRecordatorios = <strong>{fmtPEN2.format(costoRecordatoriosMes)}</strong>{' '}
            → Neto = <strong>{fmtPEN.format(beneficioNetoMes)}/mes</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
