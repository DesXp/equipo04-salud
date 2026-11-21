export type ConnectionStatus = 'reconnecting' | 'live' | 'offline';

export interface GovernanceRow {
  total: number;
  unique_bookings: number;
  pii_invalid: number;
  negative_lead: number;
  triage_nulls: number;
  min_date: string | { value: string };
  max_date: string | { value: string };
}

export interface KpiSummaryRow {
  total: number;
  shows: number;
  no_shows: number;
  no_show_rate: number;
  avg_lead: number;
  rate_prior_ge2: number;
  rate_prior_0: number;
  min_age: number;
  max_age: number;
  min_capacity: number;
  max_capacity: number;
}

export interface ChannelRow {
  appointment_channel: string;
  total: number;
  no_shows: number;
  no_show_rate: number;
}

export interface SpecialtyRow {
  specialty: string;
  total: number;
  no_shows: number;
  no_show_rate: number;
}

export interface LeadRangeRow {
  lead_bucket: string;
  sort_order: number;
  total: number;
  no_shows: number;
  no_show_rate: number;
}

export interface PriorNoShowRow {
  prior_no_shows: number;
  total: number;
  no_shows: number;
  no_show_rate: number;
}

export interface InsuranceRow {
  insurance_type: string;
  total: number;
  no_shows: number;
  no_show_rate: number;
}

export interface HeatmapRow {
  center_name: string;
  center_city: string;
  specialty: string;
  total: number;
  no_shows: number;
  no_show_rate: number;
  capacity_daily: number;
}

export interface AgendaRow {
  national_id_hash: string;
  appointment_date: string | { value: string };
  center_name: string;
  center_city: string;
  specialty: string;
  appointment_channel: string;
  prior_no_shows: number;
  lead_time_days: number;
  no_show_label: number;
  age: number;
  gender: 'F' | 'M' | string;
  insurance_type: string;
  systolic_bp: number;
  chronic_conditions: number;
  capacity_daily: number;
}

export interface SimulatorFeatures {
  lead_time_days: number;
  appointment_channel: string;
  systolic_bp: number;
  prior_no_shows: number;
  age: number;
  gender: string;
  insurance_type: string;
  chronic_conditions: number;
  specialty: string;
  capacity_daily: number;
  center_city: string;
}

export interface PredictionResult {
  probPct: number;
  predClass: string | null;
}

export interface SimHistoryItem {
  features: SimulatorFeatures;
  scorePct: number;
  predClass: string | null;
  timestamp: string;
}

export interface WhatIfResult {
  baseScore: number;
  appScore: number;
  lead7Score: number;
}

export interface SectionStatus {
  loading: boolean;
  isOffline: boolean;
  errorMsg?: string;
}
