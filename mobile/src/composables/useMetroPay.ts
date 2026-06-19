import { computed, reactive, watch } from 'vue'

export type Movimiento = {
  type: 'recarga' | 'gasto'
  title: string
  date: string
  amount: number
}

interface MetroPayState {
  last4: string
  balance: number
  movimientos: Movimiento[]
}

const STORAGE_KEY = 'ml.metropay'

const initial: MetroPayState = {
  last4: '4821',
  balance: 12_400,
  movimientos: [
    { type: 'recarga', title: 'Recarga en CADE Centro',         date: 'Hoy, 8:14 a. m.',  amount: 10_000 },
    { type: 'gasto',   title: 'Ruta P1 · Cabecera ↔ UIS',       date: 'Hoy, 7:42 a. m.',  amount: 2_900 },
    { type: 'gasto',   title: 'Ruta T2 · Provenza ↔ Centro',    date: 'Ayer, 6:10 p. m.', amount: 2_900 },
    { type: 'recarga', title: 'Recarga app MetroPay',           date: 'Jue 13 jun',       amount: 20_000 },
    { type: 'gasto',   title: 'Ruta R3 · Floridablanca ↔ UIS',  date: 'Mié 12 jun',       amount: 2_900 },
  ],
}

function loadFromStorage(): MetroPayState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<MetroPayState>
    return {
      last4: parsed.last4 || initial.last4,
      balance: typeof parsed.balance === 'number' ? parsed.balance : initial.balance,
      movimientos: Array.isArray(parsed.movimientos) ? parsed.movimientos : initial.movimientos,
    }
  } catch {
    return initial
  }
}

// Estado singleton: una sola fuente de verdad para HomePage, AjustesPage y
// MetroPayPage.
const state = reactive<MetroPayState>(loadFromStorage())

watch(
  state,
  (v) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch { /* ignore */ }
  },
  { deep: true },
)

function formatNumber(n: number) {
  return new Intl.NumberFormat('es-CO').format(n)
}

function recargar(monto: number, label = 'Recarga desde la app', date = 'Justo ahora') {
  if (!Number.isFinite(monto) || monto <= 0) return
  state.balance += monto
  state.movimientos.unshift({ type: 'recarga', title: label, date, amount: monto })
}

export function useMetroPay() {
  return {
    last4: computed(() => state.last4),
    balance: computed(() => state.balance),
    movimientos: computed(() => state.movimientos),
    formattedBalance: computed(() => formatNumber(state.balance)),
    formatNumber,
    recargar,
  }
}
