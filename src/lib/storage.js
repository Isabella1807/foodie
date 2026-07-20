// Alt lokalt data ligger i localStorage under disse tre nøgler
const KEYS = {
  cache: 'foodie:cache', // { foods, entries, weights, goals } — det skærmen viser
  outbox: 'foodie:outbox', // kø af ændringer der endnu ikke er sendt til Supabase
  user: 'foodie:user', // { id, email } — hvem det lokale data tilhører
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(KEYS[key])
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  localStorage.setItem(KEYS[key], JSON.stringify(value))
}

export function remove(key) {
  localStorage.removeItem(KEYS[key])
}
