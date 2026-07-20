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

// Mandagen i den uge datoen ligger i — ugen går fra mandag til søndag
export function weekStart(dateStr) {
  const date = toDate(dateStr)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date.toLocaleDateString('sv-SE')
}

// Overskrift til kalenderen, fx "juli 2026" (month er 0-baseret)
export function monthLabel(year, month) {
  return `${MONTHS[month]} ${year}`
}

// Byg kalenderen for en måned: en liste af uger (mandag–søndag), hvor hver
// dag er { date, inMonth }. Ugerne fyldes ud med kant-dage fra nabomånederne,
// så alle rækker har syv dage.
export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // dage tilbage til mandag
  const cursor = new Date(year, month, 1 - startOffset)
  const weeks = []
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push({ date: cursor.toLocaleDateString('sv-SE'), inMonth: cursor.getMonth() === month })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  // Fjern hele uger der kun består af dage fra nabomånederne
  return weeks.filter((week) => week.some((day) => day.inMonth))
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
