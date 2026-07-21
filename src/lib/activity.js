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
