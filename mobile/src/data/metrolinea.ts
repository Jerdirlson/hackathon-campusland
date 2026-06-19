/**
 * Datos del prototipo Metrolínea.
 *
 * Modelo mock que alimenta todas las pantallas (portado 1:1 desde el diseño
 * `Metrolinea App.dc.html` de Claude Design). En producción estas estructuras
 * se reemplazarían por las respuestas del módulo `ai/` (ver DESIGN_BRIEF.md):
 *   - ROUTES  → GET /routes
 *   - ARR     → GET /arrivals/{stop_id}
 *   - BUSES   → GET /occupancy/{bus_id}
 */

export type OccLevel = 'low' | 'mid' | 'high'

export interface Occupancy {
  id: OccLevel
  label: string
  color: string
  bg: string
  pct: number
}

export interface Stop {
  id: string
  name: string
  zone: string
  lines: string[]
}

export interface Route {
  id: string
  name: string
  type: string
  color: string
  from: string
  to: string
  stops: number
  headway: number
}

export interface Arrival {
  route: string
  bus: string
  min: number
  occ: OccLevel
  dest: string
}

export interface BusOnRoute {
  bus: string
  at: string
  next: string
  occ: OccLevel
  min: number
}

export interface TerminalRow {
  route: string
  dest: string
  plat: string
  min: number
  occ: OccLevel
  status: string
}

export interface PathNode {
  name: string
  x: number
  y: number
}

export interface OnboardingSlide {
  eye: string
  title: string
  body: string
  icon: string
  cta: string
}

export const OCC: Record<OccLevel, Occupancy> = {
  low: { id: 'low', label: 'Baja', color: '#3F7A14', bg: '#D9F0C4', pct: 28 },
  mid: { id: 'mid', label: 'Media', color: '#9A6800', bg: '#FBE9C0', pct: 62 },
  high: { id: 'high', label: 'Alta', color: '#D43A1F', bg: '#F8D7CF', pct: 91 },
}

export const STOPS: Stop[] = [
  { id: 'PROV', name: 'Provenza', zone: 'Sur', lines: ['P1', 'T2', 'A8'] },
  { id: 'CANA', name: 'Cañaveral', zone: 'Floridablanca', lines: ['P1', 'P8', 'T2'] },
  { id: 'REAL', name: 'Real de Minas', zone: 'Occidente', lines: ['P8', 'A8'] },
  { id: 'QUEB', name: 'Quebradaseca', zone: 'Centro', lines: ['P1', 'P8', 'T2', 'A8'] },
  { id: 'CENT', name: 'Centro', zone: 'Centro', lines: ['P1', 'P8', 'T2', 'A8'] },
  { id: 'UIS', name: 'UIS / Universidad', zone: 'Centro', lines: ['P1', 'T2'] },
  { id: 'FLOR', name: 'Floridablanca', zone: 'Floridablanca', lines: ['P8', 'T2'] },
  { id: 'NORTE', name: 'Portal Norte', zone: 'Norte', lines: ['P1', 'A8'] },
]

export const ROUTES: Route[] = [
  { id: 'P1', name: 'Provenza – Portal Norte', type: 'Pretroncal', color: '#6FBA2C', from: 'Provenza', to: 'Portal Norte', stops: 14, headway: 6 },
  { id: 'P8', name: 'Girón – Floridablanca', type: 'Pretroncal', color: '#0E6BA8', from: 'Girón', to: 'Floridablanca', stops: 18, headway: 8 },
  { id: 'T2', name: 'Cañaveral – UIS', type: 'Troncal', color: '#3F7A14', from: 'Cañaveral', to: 'UIS', stops: 11, headway: 5 },
  { id: 'A8', name: 'Piedecuesta – Real de Minas', type: 'Alimentadora', color: '#96BD0D', from: 'Piedecuesta', to: 'Real de Minas', stops: 22, headway: 12 },
]

export const ARR: Record<string, Arrival[]> = {
  PROV: [
    { route: 'P1', bus: 'ML-1042', min: 2, occ: 'low', dest: 'Portal Norte' },
    { route: 'T2', bus: 'ML-2210', min: 6, occ: 'mid', dest: 'UIS' },
    { route: 'A8', bus: 'ML-3318', min: 9, occ: 'high', dest: 'Real de Minas' },
    { route: 'P1', bus: 'ML-1077', min: 13, occ: 'low', dest: 'Portal Norte' },
  ],
  CANA: [
    { route: 'T2', bus: 'ML-2204', min: 1, occ: 'high', dest: 'UIS' },
    { route: 'P1', bus: 'ML-1031', min: 4, occ: 'mid', dest: 'Portal Norte' },
    { route: 'P8', bus: 'ML-5120', min: 8, occ: 'low', dest: 'Floridablanca' },
  ],
  CENT: [
    { route: 'P8', bus: 'ML-5101', min: 3, occ: 'mid', dest: 'Floridablanca' },
    { route: 'T2', bus: 'ML-2218', min: 5, occ: 'low', dest: 'UIS' },
    { route: 'P1', bus: 'ML-1090', min: 7, occ: 'high', dest: 'Portal Norte' },
    { route: 'A8', bus: 'ML-3340', min: 11, occ: 'mid', dest: 'Real de Minas' },
  ],
}

export const BUSES: Record<string, BusOnRoute[]> = {
  P1: [
    { bus: 'ML-1042', at: 'Cañaveral', next: 'Quebradaseca', occ: 'low', min: 2 },
    { bus: 'ML-1077', at: 'Centro', next: 'UIS', occ: 'mid', min: 7 },
    { bus: 'ML-1090', at: 'Portal Norte', next: 'Provenza', occ: 'high', min: 13 },
  ],
  P8: [
    { bus: 'ML-5101', at: 'Real de Minas', next: 'Centro', occ: 'mid', min: 3 },
    { bus: 'ML-5120', at: 'Girón', next: 'Cañaveral', occ: 'low', min: 8 },
  ],
  T2: [
    { bus: 'ML-2204', at: 'Provenza', next: 'Cañaveral', occ: 'high', min: 1 },
    { bus: 'ML-2218', at: 'Centro', next: 'UIS', occ: 'low', min: 5 },
  ],
  A8: [
    { bus: 'ML-3318', at: 'Piedecuesta', next: 'Provenza', occ: 'high', min: 9 },
  ],
}

export const TERMINAL: TerminalRow[] = [
  { route: 'P1', dest: 'Portal Norte', plat: 'A1', min: 1, occ: 'low', status: 'Llegando' },
  { route: 'T2', dest: 'UIS', plat: 'B2', min: 2, occ: 'mid', status: 'En ruta' },
  { route: 'P8', dest: 'Floridablanca', plat: 'A3', min: 4, occ: 'high', status: 'En ruta' },
  { route: 'A8', dest: 'Real de Minas', plat: 'C1', min: 6, occ: 'mid', status: 'En ruta' },
  { route: 'P1', dest: 'Portal Norte', plat: 'A1', min: 9, occ: 'low', status: 'Programado' },
  { route: 'T2', dest: 'UIS', plat: 'B2', min: 11, occ: 'low', status: 'Programado' },
  { route: 'P8', dest: 'Girón', plat: 'A4', min: 14, occ: 'mid', status: 'Programado' },
  { route: 'A8', dest: 'Piedecuesta', plat: 'C2', min: 17, occ: 'low', status: 'Programado' },
]

export const ROUTE_PATH: Record<string, PathNode[]> = {
  P1: [
    { name: 'Provenza', x: 42, y: 180 }, { name: 'Cañaveral', x: 92, y: 150 },
    { name: 'Quebradaseca', x: 150, y: 148 }, { name: 'Centro', x: 192, y: 108 },
    { name: 'UIS', x: 232, y: 70 }, { name: 'Portal Norte', x: 282, y: 32 },
  ],
  P8: [
    { name: 'Girón', x: 34, y: 118 }, { name: 'Real de Minas', x: 84, y: 158 },
    { name: 'Centro', x: 150, y: 164 }, { name: 'Cañaveral', x: 214, y: 120 },
    { name: 'Floridablanca', x: 282, y: 84 },
  ],
  T2: [
    { name: 'Cañaveral', x: 48, y: 172 }, { name: 'Quebradaseca', x: 110, y: 142 },
    { name: 'Centro', x: 174, y: 120 }, { name: 'UIS', x: 270, y: 70 },
  ],
  A8: [
    { name: 'Piedecuesta', x: 40, y: 52 }, { name: 'Provenza', x: 96, y: 104 },
    { name: 'Centro', x: 160, y: 140 }, { name: 'Quebradaseca', x: 212, y: 160 },
    { name: 'Real de Minas', x: 282, y: 150 },
  ],
}

export const ONB: OnboardingSlide[] = [
  { eye: 'BIENVENIDO', title: 'Tu bus, sin sorpresas', body: 'Sabemos que el tiempo cuenta. Mira cuándo llega tu próximo bus y qué tan lleno viene, en tiempo real.', icon: 'bus-front', cta: 'Continuar' },
  { eye: 'UBICACIÓN', title: 'La parada más cercana, al instante', body: 'Activa tu ubicación y te mostramos las llegadas de tu parada y tus rutas favoritas apenas abres la app.', icon: 'map-pin', cta: 'Permitir ubicación' },
  { eye: 'LISTO', title: 'Datos medidos por IA', body: 'La ocupación de cada bus la miden las cámaras a bordo. Verás qué tan lleno viene antes de subirte.', icon: 'sparkles', cta: 'Empezar a viajar' },
]

export function routeById(id: string): Route {
  return ROUTES.find((r) => r.id === id) || ROUTES[0]
}

export function stopById(id: string): Stop {
  return STOPS.find((s) => s.id === id) || STOPS[0]
}

/* ── View-models (datos listos para pintar en componentes) ───────── */

export interface ArrivalVM {
  key: string
  route: string
  routeColor: string
  dest: string
  bus: string
  min: number
  minLabel: string
  unit: string
  occ: OccLevel
}

export interface BusVM {
  key: string
  bus: string
  at: string
  next: string
  minLabel: string
  unit: string
  occ: OccLevel
}

const minLabel = (min: number) => (min <= 0 ? 'Ya' : String(min))
const minUnit = (min: number) => (min <= 0 ? 'llegando' : 'min')

export function arrivalsFor(stopId: string, n?: number): ArrivalVM[] {
  const list = (ARR[stopId] || ARR.PROV).slice(0, n ?? 99)
  return list.map((a, i) => ({
    key: a.bus + i,
    route: a.route,
    routeColor: routeById(a.route).color,
    dest: a.dest,
    bus: a.bus,
    min: a.min,
    minLabel: minLabel(a.min),
    unit: minUnit(a.min),
    occ: a.occ,
  }))
}

export function busesFor(routeId: string): BusVM[] {
  return (BUSES[routeId] || BUSES.P1).map((b, i) => ({
    key: b.bus + i,
    bus: b.bus,
    at: b.at,
    next: b.next,
    minLabel: minLabel(b.min),
    unit: minUnit(b.min),
    occ: b.occ,
  }))
}

export interface RouteGeometry {
  color: string
  points: string
  nodes: { key: string; x: number; y: number; r: number; fill: string; stroke: string }[]
  endLabels: { key: string; label: string; left: string; top: string; transform: string }[]
  bus: { left: string; top: string }
}

const VB_W = 320
const VB_H = 200

export function routeGeometry(routeId: string): RouteGeometry {
  const color = routeById(routeId).color
  const path = ROUTE_PATH[routeId] || ROUTE_PATH.P1
  const last = path.length - 1
  const nodes = path.map((p, i) => {
    const end = i === 0 || i === last
    return { key: p.name + i, x: p.x, y: p.y, r: end ? 6.5 : 4.5, fill: end ? color : '#fff', stroke: color }
  })
  const endLabels = path
    .map((p, i) => ({ p, i }))
    .filter((o) => o.i === 0 || o.i === last)
    .map((o) => ({
      key: o.p.name,
      label: o.p.name,
      left: `${((o.p.x / VB_W) * 100).toFixed(1)}%`,
      top: `${((o.p.y / VB_H) * 100).toFixed(1)}%`,
      transform: o.p.y < 60 ? 'translate(-50%,60%)' : 'translate(-50%,-150%)',
    }))
  const bn = path[1] || path[0]
  return {
    color,
    points: path.map((p) => `${p.x},${p.y}`).join(' '),
    nodes,
    endLabels,
    bus: { left: `${((bn.x / VB_W) * 100).toFixed(1)}%`, top: `${((bn.y / VB_H) * 100).toFixed(1)}%` },
  }
}
