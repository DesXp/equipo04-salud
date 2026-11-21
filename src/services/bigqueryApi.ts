import type {
  AgendaRow,
  ChannelRow,
  GovernanceRow,
  HeatmapRow,
  InsuranceRow,
  KpiSummaryRow,
  LeadRangeRow,
  PredictionResult,
  PriorNoShowRow,
  SimulatorFeatures,
  SpecialtyRow,
} from '../types/clinical';

export const API_BASE = 'https://api-equipo04-186984133933.us-central1.run.app';
export const TABLE_FQN = '`datathon-dsc-uni.curated_equipo04.curated_appointments_gold`';

export const CONFIG = {
  HOURS_PER_APPT: 0.5,
  COST_PER_APPT: 120,
  RECALL: 0.6723,
  ROC_AUC: 0.6408,
  ACCURACY: 0.5715,
  RISK_HIGH: 70,
  RISK_MEDIUM: 50,
  REMINDER_COST: 0.15,
  SNAPSHOT: {
    total: 75000,
    shows: 61448,
    noShows: 13552,
    noShowRate: 18.07,
    avgLead: 29.8,
  },
} as const;

export const DEFAULT_FEATURES: SimulatorFeatures = {
  lead_time_days: 30,
  prior_no_shows: 2,
  systolic_bp: 125,
  chronic_conditions: 1,
  age: 45,
  capacity_daily: 120,
  appointment_channel: 'CALL_CENTER',
  specialty: 'TRAUMA',
  center_city: 'Lima',
  insurance_type: 'PUBLIC_SIS',
  gender: 'F',
};

export const OFFLINE_FALLBACK: {
  governance: GovernanceRow;
  kpi: KpiSummaryRow;
  byChannel: ChannelRow[];
  bySpecialty: SpecialtyRow[];
  byLeadRange: LeadRangeRow[];
  byPrior: PriorNoShowRow[];
  byInsurance: InsuranceRow[];
  heatmap: HeatmapRow[];
  agenda: AgendaRow[];
} = {
  governance: {
    total: 75000,
    unique_bookings: 75000,
    pii_invalid: 0,
    negative_lead: 0,
    triage_nulls: 0,
    min_date: '2024-01-01',
    max_date: '2024-12-31',
  },
  kpi: {
    total: 75000,
    shows: 61448,
    no_shows: 13552,
    no_show_rate: 0.1807,
    avg_lead: 29.8,
    rate_prior_ge2: 0.342,
    rate_prior_0: 0.114,
    min_age: 0,
    max_age: 90,
    min_capacity: 50,
    max_capacity: 300,
  },
  byChannel: [
    { appointment_channel: 'CALL_CENTER', total: 21000, no_shows: 4620, no_show_rate: 0.22 },
    { appointment_channel: 'WEB', total: 22500, no_shows: 4275, no_show_rate: 0.19 },
    { appointment_channel: 'WALK_IN', total: 15000, no_shows: 2475, no_show_rate: 0.165 },
    { appointment_channel: 'APP_MOBILE', total: 16500, no_shows: 2182, no_show_rate: 0.132 },
  ],
  bySpecialty: [
    { specialty: 'TRAUMA', total: 15200, no_shows: 3268, no_show_rate: 0.215 },
    { specialty: 'GENERAL', total: 18500, no_shows: 3515, no_show_rate: 0.19 },
    { specialty: 'CARDIOLOGY', total: 14800, no_shows: 2664, no_show_rate: 0.18 },
    { specialty: 'PEDIATRICS', total: 14000, no_shows: 2310, no_show_rate: 0.165 },
    { specialty: 'ONCOLOGY', total: 12500, no_shows: 1795, no_show_rate: 0.144 },
  ],
  byLeadRange: [
    { lead_bucket: '0–7 días', sort_order: 1, total: 10000, no_shows: 1050, no_show_rate: 0.105 },
    { lead_bucket: '8–15 días', sort_order: 2, total: 10500, no_shows: 1470, no_show_rate: 0.14 },
    { lead_bucket: '16–30 días', sort_order: 3, total: 18500, no_shows: 3330, no_show_rate: 0.18 },
    { lead_bucket: '31–60 días', sort_order: 4, total: 36000, no_shows: 7702, no_show_rate: 0.214 },
  ],
  byPrior: [
    { prior_no_shows: 0, total: 36000, no_shows: 4104, no_show_rate: 0.114 },
    { prior_no_shows: 1, total: 19500, no_shows: 3510, no_show_rate: 0.18 },
    { prior_no_shows: 2, total: 11000, no_shows: 2970, no_show_rate: 0.27 },
    { prior_no_shows: 3, total: 5500, no_shows: 1815, no_show_rate: 0.33 },
    { prior_no_shows: 4, total: 3000, no_shows: 1153, no_show_rate: 0.384 },
  ],
  byInsurance: [
    { insurance_type: 'PUBLIC_SIS', total: 24000, no_shows: 5160, no_show_rate: 0.215 },
    { insurance_type: 'ESSALUD', total: 25500, no_shows: 4845, no_show_rate: 0.19 },
    { insurance_type: 'SELF_PAY', total: 13500, no_shows: 2160, no_show_rate: 0.16 },
    { insurance_type: 'PRIVATE_EPS', total: 12000, no_shows: 1387, no_show_rate: 0.116 },
  ],
  heatmap: [
    { center_name: 'Sede Lima Norte', center_city: 'Lima', specialty: 'TRAUMA', total: 1840, no_shows: 442, no_show_rate: 0.24, capacity_daily: 140 },
    { center_name: 'Sede Arequipa Sur', center_city: 'Arequipa', specialty: 'TRAUMA', total: 1320, no_shows: 304, no_show_rate: 0.23, capacity_daily: 110 },
    { center_name: 'Sede Trujillo Centro', center_city: 'Trujillo', specialty: 'GENERAL', total: 1650, no_shows: 366, no_show_rate: 0.222, capacity_daily: 130 },
    { center_name: 'Sede Piura Este', center_city: 'Piura', specialty: 'CARDIOLOGY', total: 1180, no_shows: 254, no_show_rate: 0.215, capacity_daily: 95 },
    { center_name: 'Sede Lima Centro', center_city: 'Lima', specialty: 'GENERAL', total: 2150, no_shows: 452, no_show_rate: 0.21, capacity_daily: 160 },
  ],
  agenda: [
    {
      national_id_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeef9e8',
      appointment_date: '2024-12-28',
      center_name: 'Sede Lima Norte',
      center_city: 'Lima',
      specialty: 'TRAUMA',
      appointment_channel: 'CALL_CENTER',
      prior_no_shows: 4,
      lead_time_days: 58,
      no_show_label: 1,
      age: 52,
      gender: 'F',
      insurance_type: 'PUBLIC_SIS',
      systolic_bp: 142,
      chronic_conditions: 2,
      capacity_daily: 140,
    },
    {
      national_id_hash: '9f8e7d6c5b4a39281706f5e4d3c2b1a099887766554433221100ffeeddcc4412',
      appointment_date: '2024-12-27',
      center_name: 'Sede Arequipa Sur',
      center_city: 'Arequipa',
      specialty: 'GENERAL',
      appointment_channel: 'WEB',
      prior_no_shows: 4,
      lead_time_days: 54,
      no_show_label: 1,
      age: 38,
      gender: 'M',
      insurance_type: 'ESSALUD',
      systolic_bp: 128,
      chronic_conditions: 1,
      capacity_daily: 110,
    },
  ],
};

export const SQL_QUERIES = {
  GOVERNANCE: `SELECT COUNT(*) AS total,
  COUNT(DISTINCT booking_uuid) AS unique_bookings,
  COUNTIF(NOT REGEXP_CONTAINS(national_id_hash, r'^[0-9a-f]{64}$')) AS pii_invalid,
  COUNTIF(lead_time_days < 0) AS negative_lead,
  COUNTIF(systolic_bp IS NULL OR prior_no_shows IS NULL) AS triage_nulls,
  MIN(appointment_date) AS min_date, MAX(appointment_date) AS max_date
FROM ${TABLE_FQN}`,

  KPI_SUMMARY: `SELECT
  COUNT(*) AS total,
  COUNTIF(no_show_label = 0) AS shows,
  COUNTIF(no_show_label = 1) AS no_shows,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1), COUNT(*)) AS no_show_rate,
  AVG(lead_time_days) AS avg_lead,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1 AND prior_no_shows >= 2), NULLIF(COUNTIF(prior_no_shows >= 2), 0)) AS rate_prior_ge2,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1 AND prior_no_shows = 0), NULLIF(COUNTIF(prior_no_shows = 0), 0)) AS rate_prior_0,
  MIN(age) AS min_age,
  MAX(age) AS max_age,
  MIN(capacity_daily) AS min_capacity,
  MAX(capacity_daily) AS max_capacity
FROM ${TABLE_FQN}`,

  BY_CHANNEL: `SELECT
  appointment_channel,
  COUNT(*) AS total,
  COUNTIF(no_show_label = 1) AS no_shows,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1), COUNT(*)) AS no_show_rate
FROM ${TABLE_FQN}
GROUP BY appointment_channel
HAVING COUNT(*) >= 500
ORDER BY no_show_rate DESC`,

  BY_SPECIALTY: `SELECT
  specialty,
  COUNT(*) AS total,
  COUNTIF(no_show_label = 1) AS no_shows,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1), COUNT(*)) AS no_show_rate
FROM ${TABLE_FQN}
GROUP BY specialty
HAVING COUNT(*) >= 500
ORDER BY no_show_rate DESC`,

  BY_LEAD_RANGE: `SELECT
  CASE
    WHEN lead_time_days <= 7 THEN '0–7 días'
    WHEN lead_time_days <= 15 THEN '8–15 días'
    WHEN lead_time_days <= 30 THEN '16–30 días'
    ELSE '31–60 días'
  END AS lead_bucket,
  CASE
    WHEN lead_time_days <= 7 THEN 1
    WHEN lead_time_days <= 15 THEN 2
    WHEN lead_time_days <= 30 THEN 3
    ELSE 4
  END AS sort_order,
  COUNT(*) AS total,
  COUNTIF(no_show_label = 1) AS no_shows,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1), COUNT(*)) AS no_show_rate
FROM ${TABLE_FQN}
GROUP BY lead_bucket, sort_order
ORDER BY sort_order ASC`,

  BY_PRIOR_NOSHOWS: `SELECT
  prior_no_shows,
  COUNT(*) AS total,
  COUNTIF(no_show_label = 1) AS no_shows,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1), COUNT(*)) AS no_show_rate
FROM ${TABLE_FQN}
GROUP BY prior_no_shows
ORDER BY prior_no_shows ASC`,

  BY_INSURANCE: `SELECT
  insurance_type,
  COUNT(*) AS total,
  COUNTIF(no_show_label = 1) AS no_shows,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1), COUNT(*)) AS no_show_rate
FROM ${TABLE_FQN}
GROUP BY insurance_type
ORDER BY no_show_rate DESC`,

  HEATMAP_CENTER_SPECIALTY: `SELECT
  center_name,
  center_city,
  specialty,
  COUNT(*) AS total,
  COUNTIF(no_show_label = 1) AS no_shows,
  SAFE_DIVIDE(COUNTIF(no_show_label = 1), COUNT(*)) AS no_show_rate,
  CAST(ROUND(AVG(capacity_daily)) AS INT64) AS capacity_daily
FROM ${TABLE_FQN}
GROUP BY center_name, center_city, specialty
HAVING COUNT(*) >= 100
ORDER BY no_show_rate DESC
LIMIT 10`,

  CRITICAL_AGENDA: `SELECT
  national_id_hash,
  appointment_date,
  center_name,
  center_city,
  specialty,
  appointment_channel,
  prior_no_shows,
  lead_time_days,
  no_show_label,
  age,
  gender,
  insurance_type,
  systolic_bp,
  chronic_conditions,
  capacity_daily
FROM ${TABLE_FQN}
ORDER BY prior_no_shows DESC, lead_time_days DESC, appointment_date DESC
LIMIT 12`,
} as const;

export const fmtInt = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
export const fmtDec1 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtDec2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtPEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 });
export const fmtPEN2 = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function parseBqDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return String((val as { value: unknown }).value);
  }
  return String(val);
}

export function calcMonthsBetween(minStr: string, maxStr: string): number {
  const d1 = new Date(minStr);
  const d2 = new Date(maxStr);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 12;
  const diffDays = Math.max(1, (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24) + 1);
  return Math.max(1, Number((diffDays / 30.4375).toFixed(2)));
}

export function truncateHash(hash: string): string {
  const s = String(hash || '');
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`El servidor de analítica respondió con error temporal (código ${response.status}).`);
        }
        if (response.status === 404) {
          throw new Error('El servicio solicitado no se encuentra disponible en este momento.');
        }
        throw new Error(`No se pudo completar la solicitud (código ${response.status}).`);
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error('Tiempo de espera agotado (30 s). Cloud Run o BigQuery tardaron en responder.');
      } else if (err instanceof TypeError) {
        lastError = new Error('No se pudo establecer conexión con el backend en Cloud Run. Verifica tu red.');
      } else {
        lastError = new Error(err instanceof Error ? err.message : 'Error inesperado al consultar el servicio.');
      }

      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 1200));
      }
    }
  }

  throw lastError ?? new Error('Error desconocido al consultar el servicio.');
}

export async function runQuery<T>(sql: string): Promise<T[]> {
  const res = await apiPost<{ rows?: T[] }>('/api/v1/analytics/query', { sql });
  if (!res || !Array.isArray(res.rows)) {
    throw new Error('Formato de respuesta inesperado desde BigQuery.');
  }
  return res.rows;
}

export function extractNoShowProb(prediction: unknown): PredictionResult {
  let obj: unknown = prediction;
  if (Array.isArray(obj)) {
    if (obj.length === 0) throw new Error('El modelo devolvió una respuesta vacía.');
    obj = obj[0];
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('No se pudo interpretar la predicción recibida del modelo.');
  }

  const record = obj as Record<string, unknown>;
  let rawProb: number | null = null;

  let probsArr = Array.isArray(record.predicted_no_show_label_probs)
    ? (record.predicted_no_show_label_probs as Array<{ label?: unknown; prob?: unknown }>)
    : null;

  if (!probsArr) {
    const probsKey = Object.keys(record).find((k) => k.endsWith('_probs') && Array.isArray(record[k]));
    if (probsKey) {
      probsArr = record[probsKey] as Array<{ label?: unknown; prob?: unknown }>;
    }
  }

  if (Array.isArray(probsArr)) {
    const match = probsArr.find((item) => item && String(item.label) === '1');
    if (match && match.prob !== undefined && match.prob !== null) {
      rawProb = Number(match.prob);
    }
  }

  if (rawProb === null || Number.isNaN(rawProb)) {
    for (const k of ['prob', 'probability', 'score']) {
      if (record[k] !== undefined && record[k] !== null && !Number.isNaN(Number(record[k]))) {
        rawProb = Number(record[k]);
        break;
      }
    }
  }

  if (rawProb === null || Number.isNaN(rawProb)) {
    throw new Error('La respuesta del modelo no contiene una probabilidad de No-Show válida.');
  }

  const pct = rawProb <= 1 ? rawProb * 100 : rawProb;
  const clampedPct = Math.max(0, Math.min(100, pct));

  const predClass =
    record.predicted_no_show_label !== undefined && record.predicted_no_show_label !== null
      ? String(record.predicted_no_show_label)
      : null;

  return { probPct: clampedPct, predClass };
}

export async function predictAppointmentRisk(features: SimulatorFeatures): Promise<PredictionResult> {
  const res = await apiPost<{ prediction?: unknown }>('/api/v1/ml/predict', {
    model_name: 'health_noshow_classifier',
    dataset: 'curated_equipo04',
    features,
  });
  if (!res || res.prediction === undefined) {
    throw new Error('El endpoint de predicción no devolvió el objeto esperado.');
  }
  return extractNoShowProb(res.prediction);
}

export interface RiskDescriptor {
  level: 'ALTO' | 'MEDIO' | 'BAJO';
  color: string;
  badgeCls: string;
  cardCls: string;
  textCls: string;
  action: string;
}

export function getRiskLevel(scorePct: number): RiskDescriptor {
  if (scorePct >= CONFIG.RISK_HIGH) {
    return {
      level: 'ALTO',
      color: '#dc2626',
      badgeCls: 'bg-red-50 text-red-800 border-red-200',
      cardCls: 'border-red-200 bg-red-50/70',
      textCls: 'text-red-900',
      action: 'Reconfirmación WhatsApp 48 h + lista de espera / sobrecupo controlado',
    };
  }
  if (scorePct >= CONFIG.RISK_MEDIUM) {
    return {
      level: 'MEDIO',
      color: '#d97706',
      badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
      cardCls: 'border-amber-200 bg-amber-50/70',
      textCls: 'text-amber-900',
      action: 'Recordatorio automático App/SMS 24 h antes con botón de cancelación en 1 clic para liberar el cupo',
    };
  }
  return {
    level: 'BAJO',
    color: '#059669',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    cardCls: 'border-emerald-200 bg-emerald-50/70',
    textCls: 'text-emerald-900',
    action: 'Cita estable — confirmación estándar',
  };
}
