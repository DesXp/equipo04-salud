import { useState } from 'react';
import { Calculator } from 'lucide-react';
import {
  CONFIG,
  fmtDec1,
  fmtInt,
  fmtPEN,
  fmtPEN2,
} from '../services/bigqueryApi';

interface RoiCalculatorSectionProps {
  noShowsTotales: number;
  mesesVentana: number;
}

export function RoiCalculatorSection({
  noShowsTotales,
  mesesVentana,
}: RoiCalculatorSectionProps) {
  const [recoveryPct, setRecoveryPct] = useState<number>(40);

  const meses = Math.max(1, mesesVentana);
  const noShowsMes = noShowsTotales / meses;
  const detectadasMes = noShowsMes * CONFIG.RECALL;
  const recuperadasMes = detectadasMes * (recoveryPct / 100);

  const horasMes = recuperadasMes * CONFIG.HOURS_PER_APPT;
  const solesMes = recuperadasMes * CONFIG.COST_PER_APPT;
  const solesAnio = solesMes * 12;
  const jornadasMes = horasMes / 8;

  const costoRecordatoriosMes = detectadasMes * CONFIG.REMINDER_COST;
  const beneficioNetoMes = solesMes - costoRecordatoriosMes;
  const beneficioNetoAnio = beneficioNetoMes * 12;

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
          <p className="mt-1 text-xs text-slate-600">
            Impacto financiero y operativo mensual proyectado al intervenir
            proactivamente las citas detectadas por el modelo (Recall 67.23%).
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Supuestos: 0.5 h/cita · S/ 120/cita · Costo recordatorio: S/ 0.15/cita detectada
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
            detectadasMes = {fmtDec1.format(noShowsMes)} × Recall ({CONFIG.RECALL}) ={' '}
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
