/**
 * Tokens UI para ocupación. No son datos del dominio — son la traducción
 * visual del `occupancy_ratio` que devuelve el backend en daily_trips.
 */

export type OccLevel = 'low' | 'mid' | 'high'

export interface Occupancy {
  id: OccLevel
  label: string
  /** Color del texto/fondo principal */
  color: string
  /** Color del badge/fondo tenue */
  bg: string
  /** % aproximado al que se mapea (para la barra) */
  pct: number
}

export const OCC: Record<OccLevel, Occupancy> = {
  low:  { id: 'low',  label: 'Baja',  color: '#3F7A14', bg: '#D9F0C4', pct: 30 },
  mid:  { id: 'mid',  label: 'Media', color: '#9A6800', bg: '#FBE9C0', pct: 65 },
  high: { id: 'high', label: 'Alta',  color: '#D43A1F', bg: '#F8D7CF', pct: 95 },
}

/** Convierte un porcentaje (0..1) de ocupación al nivel UI correspondiente. */
export function levelFromRatio(ratio: number | null | undefined): OccLevel {
  if (ratio == null || ratio < 0.5) return 'low'
  if (ratio < 0.85) return 'mid'
  return 'high'
}

/** Devuelve `{ level, ratio }` a partir de current_occupancy y capacity del backend. */
export function occupancyOf(
  current: number | null | undefined,
  capacity: number | null | undefined,
): { level: OccLevel; ratio: number | null } {
  if (capacity == null || capacity <= 0 || current == null) {
    return { level: 'low', ratio: null }
  }
  const ratio = Math.max(0, Math.min(1, current / capacity))
  return { level: levelFromRatio(ratio), ratio }
}

/** Color hash por código de ruta. */
const PALETTE = ['#6FBA2C', '#3F7A14', '#0E6BA8', '#F4B400', '#D43A1F', '#7A4A99']
export function colorForRoute(code: string): string {
  let n = 0
  for (const c of code) n = (n + c.charCodeAt(0)) % PALETTE.length
  return PALETTE[n]
}
