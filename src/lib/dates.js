const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']

// 'sv-SE' giver formatet YYYY-MM-DD i telefonens egen tidszone.
// Brug ALDRIG toISOString() til dette — den regner i UTC, så et måltid
// kl. 00:30 ville lande på den forkerte dag.
export function localToday() {
  return new Date().toLocaleDateString('sv-SE')
}

function toDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatFullDate(dateStr) {
  const date = toDate(dateStr)
  return `${WEEKDAYS[date.getDay()]} d. ${date.getDate()}. ${MONTHS[date.getMonth()]}`
}

export function formatDayLabel(dateStr) {
  if (dateStr === localToday()) return 'i dag'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === yesterday.toLocaleDateString('sv-SE')) return 'i går'
  const year = toDate(dateStr).getFullYear()
  const suffix = year !== new Date().getFullYear() ? ` ${year}` : ''
  return `${formatFullDate(dateStr)}${suffix}`
}
