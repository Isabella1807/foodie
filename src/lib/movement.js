// Bevægelse pr. dag: hvor mange minutter og evt. hvad (gåtur, VR-spil …).
// Et kryds for dagen, ikke en kalorie-udregning: bevægelsen lægges IKKE oveni
// dagens mål, for så spises den op igen. Den viser sig i stedet i dit målte
// forbrug, når vægten følger med over et par uger.
import { weekStart } from './dates'

// Målet for én dag: mindst så mange minutter, så tæller dagen som "gjort"
export const MOVE_GOAL_MIN = 30

// Realistisk uge: de fleste dage, ikke alle
export const MOVE_DAYS_PER_WEEK = 5

export const MOVE_MINUTES = [15, 30, 45, 60]

// label: på knappen. text: midt i en sætning ("30 min gåtur i dag")
export const MOVE_KINDS = [
  { value: 'gang', label: 'Gåtur', text: 'gåtur' },
  { value: 'vr', label: 'VR-spil', text: 'VR-spil' },
  { value: 'cykel', label: 'Cykel', text: 'cykel' },
  { value: 'andet', label: 'Andet', text: 'andet' },
]

export function kindText(value) {
  return MOVE_KINDS.find((k) => k.value === value)?.text ?? ''
}

// Datoen n dage efter en dato-tekst (YYYY-MM-DD), som dato-tekst
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  const pad = (v) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// De syv datoer i ugen omkring en dato, mandag først
export function weekDates(dateStr) {
  const start = weekStart(dateStr)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// Tæller dagen som gjort? (mindst målet i minutter)
export function isDone(entry) {
  return !!entry && Number(entry.minutes) >= MOVE_GOAL_MIN
}
