// Fulde enhedsnavne til visning — ingen forkortelser i brugerfladen
export function unitName(unit) {
  if (unit === 'g') return 'gram'
  if (unit === 'ml') return 'milliliter'
  if (unit === 'stk') return 'styk'
  return unit || ''
}
