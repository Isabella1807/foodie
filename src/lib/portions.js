// Husmål for almindelige danske madvarer.
//
// Varer fra Fødevaredatabasen har kun tal pr. 100 gram, og de fleste af os
// aner ikke, hvad en skive rugbrød vejer — slet ikke i en kantine, hvor der
// ikke står en vægt. Derfor får de varer, man kan tælle i stedet for at veje,
// en fast vægt her, så man kan logge "2 skiver rugbrød" og få rigtige tal for
// kalorier, protein og fibre med.
//
// Vægtene er almindelige danske gennemsnit. De er skøn, ikke facit: vil man
// være præcis, kan man stadig taste gram.

const PORTIONS = [
  // Brød skæres i skiver
  { re: /^rugbrød/i, not: /revet/i, g: 45, one: 'skive', many: 'skiver' },
  { re: /^(grov)?franskbrød/i, g: 30, one: 'skive', many: 'skiver' },
  { re: /^hvedebrød, (sandwich|toastbrød)/i, g: 30, one: 'skive', many: 'skiver' },
  { re: /^knækbrød/i, g: 10, one: 'styk', many: 'styk' },

  // Pålæg ligger i skiver
  { re: /^(salami|spegepølse|rullepølse|roastbeef|hamburgerryg)/i, g: 15, one: 'skive', many: 'skiver' },
  { re: /^ost, fast/i, g: 20, one: 'skive', many: 'skiver' },
  { re: /^skæreost/i, g: 20, one: 'skive', many: 'skiver' },

  // Det man smører på, måles i skefulde
  { re: /^leverpostej/i, g: 20, one: 'skefuld', many: 'skefulde' },
  { re: /^(remoulade|mayonnaise|tomatketchup)/i, g: 15, one: 'spiseskefuld', many: 'spiseskefulde' },
  { re: /^dressing, mayonnaise/i, g: 15, one: 'spiseskefuld', many: 'spiseskefulde' },
  { re: /^smør, (saltet|usaltet)/i, g: 5, one: 'teskefuld', many: 'teskefulde' },

  // Hele stykker frugt og grønt
  { re: /^æg, høne/i, not: /blomme|hvide|tørret|pasteuriseret|saltet|røræg|langæg|mix/i, g: 55, one: 'styk', many: 'styk' },
  { re: /^gulerod/i, not: /konserves|saft|juice/i, g: 70, one: 'styk', many: 'styk' },
  { re: /^banan, rå/i, g: 120, one: 'styk', many: 'styk' },
  { re: /^æble, uspec/i, g: 150, one: 'styk', many: 'styk' },
  { re: /^kartoffel, (ny|gammel|efterår|uspec|kogt)/i, g: 100, one: 'styk', many: 'styk' },
  { re: /^tomat, (dansk|importeret|uspec)/i, g: 90, one: 'styk', many: 'styk' },
  { re: /^agurk, rå/i, g: 10, one: 'skive', many: 'skiver' },
]

// Husmålet for en vare, ud fra navnet — eller null, hvis den kun giver mening
// at veje. { g: vægten af ét stykke, one: 'skive', many: 'skiver' }
export function portionFor(name) {
  if (!name) return null
  const n = String(name).trim()
  for (const p of PORTIONS) {
    if (p.re.test(n) && !(p.not && p.not.test(n))) return { g: p.g, one: p.one, many: p.many }
  }
  return null
}

// Navnet på ét stykke af varen: "skive", "spiseskefuld" — og "styk" for alt
// andet, så teksten i appen passer til det, man rent faktisk tæller
export function pieceWord(name, count = 1) {
  const p = portionFor(name)
  if (!p) return count === 1 ? 'styk' : 'styk'
  return count === 1 ? p.one : p.many
}
