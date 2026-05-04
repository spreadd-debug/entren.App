// MET (Metabolic Equivalent of Task) reference values
// kcal = MET × peso(kg) × horas
// Fuente: Compendium of Physical Activities (Ainsworth et al.)
const MET_TABLE: Record<string, number> = {
  run: 8.3,         // 8 km/h sostenido
  trail_run: 9.0,   // terreno mixto
  virtual_run: 8.0,
  tennis: 7.3,      // singles, intensidad moderada
};

const DEFAULT_MET = 6.0;
const DEFAULT_WEIGHT_KG = 75;

export function estimateKcal(params: {
  sportType: string;
  durationSeconds: number | null | undefined;
  weightKg?: number | null;
}): number | null {
  const seconds = params.durationSeconds ?? 0;
  if (seconds <= 0) return null;
  const met = MET_TABLE[params.sportType] ?? DEFAULT_MET;
  const weight = params.weightKg && params.weightKg > 0 ? params.weightKg : DEFAULT_WEIGHT_KG;
  return Math.round(met * weight * (seconds / 3600));
}
