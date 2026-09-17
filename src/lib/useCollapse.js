// Kort, man kan folde sammen. Hvert kort husker selv, om det er åbent, så
// forsiden kan skæres ned til det, man faktisk kigger på hver dag.
//
// Tilstanden ligger kun i browseren: den er en visnings-indstilling, ikke data,
// og skal ikke fylde i databasen eller følge med til en anden telefon.
import { ref, computed, reactive } from 'vue'

const PREFIX = 'foodie.card.'

function load(key) {
  try {
    return localStorage.getItem(PREFIX + key) !== 'lukket'
  } catch {
    return true // privat vindue eller blokeret lager: vis kortet
  }
}

function save(key, open) {
  try {
    localStorage.setItem(PREFIX + key, open ? 'aabent' : 'lukket')
  } catch {
    // kan ikke gemmes — kortet åbner bare igen næste gang
  }
}

export function useCollapse(key) {
  const open = ref(load(key))

  function toggle() {
    open.value = !open.value
    save(key, open.value)
  }

  // Spredes ud på kortets overskrift: gør den klikbar og til en rigtig knap
  // for tastatur og skærmlæser
  const head = computed(() => ({
    role: 'button',
    tabindex: 0,
    'aria-expanded': String(open.value),
    onClick: toggle,
    onKeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        toggle()
      }
    },
  }))

  // reactive() og ikke et almindeligt objekt: så pakkes ref'erne selv ud i
  // skabelonen, og man skriver box.open i stedet for box.open.value. Et
  // almindeligt objekt ville give selve ref'en, som ALTID er sand.
  return reactive({ open, toggle, head })
}
