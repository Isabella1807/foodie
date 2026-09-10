// Aktivitets-niveauer ét sted, så både "forventet tid til målet" og den ekstra
// plads på aktive dage bruger de samme niveauer.
//
// To tal pr. niveau:
//  - factor: den klassiske livsstils-faktor ganget på hvile-forbruget (BMR).
//    Bruges KUN til det lange skøn "forventet tid til målet".
//  - kcalPerKg: cirka ekstra forbrænding pr. kg kropsvægt, som niveauet lægger
//    oveni en stillesiddende dag. Bruges til den ekstra plads på en enkelt dag,
//    hvor "hvor længe og hvor hårdt bevægede du dig" betyder mest — det giver et
//    mere retvisende skøn for én dag end livsstils-faktoren.
//    Cirka-tal (for en person på ~75 kg): let ≈ 150, moderat ≈ 375, aktiv ≈ 750.
export const ACTIVITY_LEVELS = [
  { value: 'stille', label: 'Stillesiddende', factor: 1.2, kcalPerKg: 0 },
  { value: 'let', label: 'Let aktiv', factor: 1.375, kcalPerKg: 2 },
  { value: 'moderat', label: 'Moderat', factor: 1.55, kcalPerKg: 5 },
  { value: 'aktiv', label: 'Meget aktiv', factor: 1.725, kcalPerKg: 10 },
]

// Livsstils-faktoren for et niveau — falder tilbage på "let aktiv", hvis niveauet mangler
export function factorOf(value) {
  return ACTIVITY_LEVELS.find((a) => a.value === value)?.factor ?? 1.375
}

// Ekstra kalorier pr. kg for et niveau — 0 hvis niveauet mangler
export function kcalPerKgOf(value) {
  return ACTIVITY_LEVELS.find((a) => a.value === value)?.kcalPerKg ?? 0
}

// Dit daglige forbrug anslået ud fra kroppen: den klassiske formel
// (Mifflin-St Jeor) for hvile-forbruget ud fra vægt, højde, alder og køn,
// ganget med livsstils-faktoren. null, hvis et af tallene mangler.
export function bodyBurn({ kg, height_cm, age, sex, activity }) {
  if (!kg || !height_cm || !age || !sex) return null
  const s = sex === 'mand' ? 5 : -161
  return Math.round((10 * kg + 6.25 * height_cm - 5 * age + s) * factorOf(activity))
}
