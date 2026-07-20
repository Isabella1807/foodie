// Støttende tekster. Appen skal føles som en hjælpsom sundhedsassistent,
// ikke en streng diæt-app: aldrig straf, altid fokus på balance og fremskridt.

const fmt = (n) => Math.round(n).toLocaleString('da-DK')

// Beroligende besked når en enkelt dag har været over målet
export function highDayMessage(over) {
  return `Du spiste ${fmt(over)} kcal mere end dit mål. Det svarer ikke til at have ødelagt dit vægttab — din uge ser stadig fin ud.`
}

// Besked på en dag markeret som hyggedag
export function celebrationMessage() {
  return 'Hyggedag 🎉 En planlagt festdag er en del af en bæredygtig balance — ikke en fejl.'
}
