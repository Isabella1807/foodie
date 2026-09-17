// Hvad bevægelse koster, ud over det man alligevel ville brænde ved at sidde ned.
//
// Tallene er NETTO: en time på sofaen koster også noget, og det er trukket fra,
// for det ligger allerede i det målte forbrug. Derfor ser tallene mindre ud end
// dem, et ur viser.
//
// Enheden er kcal pr. minut pr. kilo kropsvægt, så den samme træning koster mindre,
// efterhånden som man bliver lettere. Det er skøn, ikke facit.

// Vi VED ikke, hvad en bestemt træning har kostet. Derfor bruger appen ÉN sats for
// al bevægelse: minutter gange satsen. Slagsen (gåtur, VR-spil, badminton) er
// kun en etiket, man kan kigge tilbage på — den ændrer ikke regnestykket.
//
// Før havde hver slags sin egen sats, så en gåtur på 50 minutter blev til
// "0,76 træning" og en time badminton til "0,71". Det er en præcision, der ikke
// findes. Vi kan bede om en intensitet — gå 5,5 km i timen, hold pulsen oppe —
// men vi kan ikke måle, om den blev ramt.
//
// Det rigtige kalorietal kommer et andet sted fra: det MÅLTE forbrug, som
// regnes ud af vægtens udvikling sammenholdt med det, der er logget. Det fanger
// over et par uger, hvad bevægelsen reelt har givet, uanset hvad vi antog her.
// Satsen nedenfor er derfor kun et udgangspunkt for at kunne tegne en plan.
const PER_MIN_PER_KG = 0.056

export const PLAN_RATE = PER_MIN_PER_KG

// Standard, hvis man ikke selv har sat noget: en time, seks dage om ugen.
// Begge dele kan ændres under "Mine mål", så planen passer til det, man
// faktisk gør, i stedet for til et tal appen har fundet på.
export const PLAN_MINUTES = 60
export const PLAN_DAYS_PER_WEEK = 6

// Samme sats for alt — se forklaringen ovenfor
export function ratePerMinute() {
  return PER_MIN_PER_KG
}

// Hvad én træning kostede
export function kcalForMovement(entry, kg) {
  const minutes = Number(entry?.minutes)
  if (!(minutes > 0) || !(kg > 0)) return 0
  return minutes * PER_MIN_PER_KG * kg
}

// Gennemsnittet pr. dag i en periode — inkl. de dage uden bevægelse, for det
// er det tal, der skal sammenlignes med planens time hver dag
export function movementPerDay(movement, from, to, kg) {
  if (!from || !to || !(kg > 0)) return 0
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1
  if (days < 1) return 0
  let total = 0
  for (const [date, entry] of Object.entries(movement || {})) {
    if (date >= from && date <= to) total += kcalForMovement(entry, kg)
  }
  return total / days
}

// Én træning udtrykt pr. kilo kropsvægt, så kurven selv kan skalere det ned,
// efterhånden som vægten falder
export function planPerKg(minutes = PLAN_MINUTES) {
  return (Math.round(Number(minutes)) || PLAN_MINUTES) * PLAN_RATE
}

// Hvad ÉN træning giver
export function oneSessionKcal(kg, minutes = PLAN_MINUTES) {
  return kg > 0 ? planPerKg(minutes) * kg : 0
}

// Et PAS tælles i TID, ikke i kalorier.
//
// Det var før energi: en træning skulle være 80 % af 45 minutters hårdt arbejde.
// Men så blev en gåtur på 50 minutter til 0,76 træning, og appen bad om 3 minutter
// mere for at krydse en usynlig streg. Det er noget vrøvl at sige til nogen, der
// lige har været ude at gå i 50 minutter.
//
// Nu tæller en træning, når man har bevæget sig nogenlunde så længe, man havde sat
// sig for. Intensiteten forsvinder ikke af den grund: den tæller stadig fuldt ud
// i kalorierne, altså i hygge-kontoen og i måldatoen. Der SKAL den tælle, for en
// gåtur brænder mindre end Beat Saber. Men den skal ikke fratage én æren for at
// have lavet sin træning.
export const ENOUGH_SHARE = 0.8

// Så mange minutter skal der til, før dagen tæller som en træning
export function enoughMinutes(minutes = PLAN_MINUTES) {
  return Math.round((Math.round(Number(minutes)) || PLAN_MINUTES) * ENOUGH_SHARE)
}

export function enoughKcal(kg, minutes = PLAN_MINUTES) {
  return oneSessionKcal(kg, minutes) * ENOUGH_SHARE
}

// Tæller dagen som en træning? Måles på minutter.
export function isHardEnough(entry, kg, minutes = PLAN_MINUTES) {
  return (Math.round(Number(entry?.minutes)) || 0) >= enoughMinutes(minutes)
}

// Hvor mange minutter mere der mangler, før dagen er en træning
export function minutesToGo(entry, kg, minutes = PLAN_MINUTES) {
  const had = Math.round(Number(entry?.minutes)) || 0
  return Math.max(0, enoughMinutes(minutes) - had)
}

// Hvad planen forventer pr. dag i snit — ugens træninger fordelt på syv dage
export function planMovementPerDay(kg, minutes = PLAN_MINUTES, days = PLAN_DAYS_PER_WEEK) {
  const d = Math.round(Number(days)) || PLAN_DAYS_PER_WEEK
  return kg > 0 ? (planPerKg(minutes) * kg * d) / 7 : 0
}

// Hvor hårdt planens time skal være, sagt som puls.
//
// Den højeste puls, en krop kan nå, falder med alderen, så et pulstal kun giver
// mening sammen med en alder. Tommelfingerreglen er 220 minus alderen, og
// planens time ligger i 70 til 85 procent af det. Det er skøn: medicin, form og
// dagsform flytter det, og tallet er til at pejle efter, ikke at ramme præcist.
export function pulseZone(age) {
  const a = Math.round(Number(age))
  if (!(a > 0) || a > 120) return null
  const max = 220 - a
  return { low: Math.round((max * 0.7) / 5) * 5, high: Math.round((max * 0.85) / 5) * 5, max }
}
