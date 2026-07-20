// Viser dagens kalorier uden for appen: et lille tal på app-ikonet (badge)
// og en fast notifikation. Begge dele opdateres, hver gang dagens tal skifter.
// Alt er pakket ind i feature-tjek, så det bare intet gør, hvor det ikke findes.

const TAG = 'foodie-kcal'
const fmt = (n) => n.toLocaleString('da-DK')
const iconUrl = `${import.meta.env.BASE_URL}pwa-192x192.png`

// Lille tal på app-ikonet = hvad du har spist i dag (kun når appen er installeret)
export function updateBadge(eaten) {
  if (!('setAppBadge' in navigator)) return
  try {
    if (eaten > 0) navigator.setAppBadge(eaten)
    else if ('clearAppBadge' in navigator) navigator.clearAppBadge()
  } catch {
    /* ikke understøttet lige her — ignorér */
  }
}

// Bed om lov til notifikationer (kun når hun selv slår det til)
export async function askNotifyPermission() {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

// Vis/opdatér (eller fjern) den faste notifikation med dagens tal
export async function updateNotification(enabled, eaten, goal) {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return
  let reg
  try {
    reg = await navigator.serviceWorker.ready
  } catch {
    return
  }
  // Slået fra eller ingen tilladelse → fjern en evt. eksisterende notifikation
  if (!enabled || Notification.permission !== 'granted') {
    try {
      const open = await reg.getNotifications({ tag: TAG })
      open.forEach((n) => n.close())
    } catch {
      /* ignorér */
    }
    return
  }
  const left = goal - eaten
  const body = left >= 0
    ? `${fmt(eaten)} / ${fmt(goal)} kcal — ${fmt(left)} tilbage i dag`
    : `${fmt(eaten)} / ${fmt(goal)} kcal — ${fmt(-left)} over dagens mål`
  try {
    await reg.showNotification('foodie', {
      tag: TAG,
      body,
      silent: true, // ingen lyd/vibration ved hver opdatering
      renotify: false,
      requireInteraction: true, // bliver liggende i stedet for at forsvinde
      ongoing: true, // Android: gør den fast (understøttes hvor det kan)
      badge: iconUrl,
      icon: iconUrl,
    })
  } catch {
    /* ignorér */
  }
}
