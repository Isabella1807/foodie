// Bevægelse pr. dag: hvor mange minutter og evt. hvad (gåtur, VR-spil …).
// Et kryds for dagen, ikke en kalorie-udregning: bevægelsen lægges IKKE oveni
// dagens mål, for så spises den op igen. Den viser sig i stedet i dit målte
// forbrug, når vægten følger med over et par uger.
import { weekStart, addDays } from './dates'

// Målet for én dag: mindst så mange minutter, så tæller dagen som "gjort"
export const MOVE_GOAL_MIN = 30

// Realistisk uge: de fleste dage, ikke alle
export const MOVE_DAYS_PER_WEEK = 5

export const MOVE_MINUTES = [15, 30, 45, 60]

// De faste slags på knapperne. label: på knappen. text: midt i en sætning
// ("30 min gåtur i dag"). Vælger man "Andet", kan man skrive selv, hvad det
// var (fx svømning) — så gemmes den tekst som slags i stedet for "andet".
export const MOVE_KINDS = [
  { value: 'gang', label: 'Gåtur', text: 'gåtur' },
  { value: 'vr', label: 'VR-spil', text: 'VR-spil' },
  { value: 'cykel', label: 'Cykel', text: 'cykel' },
  { value: 'badminton', label: 'Badminton', text: 'badminton' },
  { value: 'andet', label: 'Andet', text: 'andet' },
]

// Er det en af de faste slags (og ikke noget, hun selv har skrevet)?
export function isKnownKind(value) {
  return MOVE_KINDS.some((k) => k.value === value)
}

// Teksten midt i en sætning: en fast slags oversættes ("gang" -> "gåtur"),
// selvskrevet tekst vises som den er
export function kindText(value) {
  if (!value) return ''
  return MOVE_KINDS.find((k) => k.value === value)?.text ?? value
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
