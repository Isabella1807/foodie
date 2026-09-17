// De fleste badevægte viser ikke det samme to gange i træk. Hvor man står på
// pladen, og hvor jævnt gulvet er, kan flytte tallet en halv kilo. Vejer man
// derfor flere gange, er midtertallet et bedre bud på den rigtige vægt end
// hver enkelt aflæsning.

// Midtertallet af de tal, der er tastet: ét tal er tallet selv, to giver
// gennemsnittet, tre giver det midterste. Så trækker én skæv vejning ikke
// resultatet med sig. Afrundes til ét decimal, som vægtene selv viser.
export function middleWeight(values) {
  const nums = values.filter((n) => typeof n === 'number' && n > 0)
  if (!nums.length) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const half = Math.floor(sorted.length / 2)
  const v = sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2
  return Math.round(v * 10) / 10
}
