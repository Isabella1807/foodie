// Almindelige varer med meget protein eller mange fibre pr. kalorie — bruges
// KUN som forslag ("ikke på din liste endnu"), når dagens protein eller fibre
// halter bagefter. Ca.-tal pr. 100 gram/milliliter fra almindelige
// næringstabeller; pakken kan sige noget andet, og så retter man varen, når
// den er tilføjet. `match` er det ord, der afgør, om hun allerede har varen
// på sin liste (så foreslås den indbyggede ikke).
export const suggestFoods = [
  { match: 'skyr', name: 'Skyr naturel', kcal: 63, protein: 10.5, carbs: 4, fat: 0.2, fiber: 0, per_unit: 'g' },
  { match: 'hytteost', name: 'Hytteost', kcal: 95, protein: 11, carbs: 3.5, fat: 4, fiber: 0, per_unit: 'g' },
  { match: 'græsk', name: 'Græsk yoghurt 2 %', kcal: 75, protein: 8.5, carbs: 4, fat: 2, fiber: 0, per_unit: 'g' },
  { match: 'æg', name: 'Æg', kcal: 143, protein: 12.5, carbs: 0.7, fat: 10, fiber: 0, per_unit: 'g', piece_size: 55 },
  { match: 'kylling', name: 'Kyllingebryst (rå)', kcal: 106, protein: 22.5, carbs: 0, fat: 1.5, fiber: 0, per_unit: 'g' },
  { match: 'tun', name: 'Tun i vand (dåse, drænet)', kcal: 105, protein: 24, carbs: 0, fat: 0.8, fiber: 0, per_unit: 'g' },
  { match: 'torsk', name: 'Torsk (rå)', kcal: 80, protein: 18, carbs: 0, fat: 0.7, fiber: 0, per_unit: 'g' },
  { match: 'laks', name: 'Laks (rå)', kcal: 200, protein: 20, carbs: 0, fat: 13, fiber: 0, per_unit: 'g' },
  { match: 'rejer', name: 'Rejer (kogte, pillede)', kcal: 85, protein: 19, carbs: 0, fat: 0.8, fiber: 0, per_unit: 'g' },
  { match: 'hakket okse', name: 'Hakket oksekød 5 %', kcal: 125, protein: 21, carbs: 0, fat: 5, fiber: 0, per_unit: 'g' },
  { match: 'kalkun', name: 'Kalkunbryst (pålæg)', kcal: 100, protein: 20, carbs: 1, fat: 1.5, fiber: 0, per_unit: 'g' },
  { match: 'tofu', name: 'Tofu', kcal: 120, protein: 13, carbs: 2, fat: 7, fiber: 0.5, per_unit: 'g' },
  { match: 'edamame', name: 'Edamame-bønner', kcal: 120, protein: 11, carbs: 9, fat: 5, fiber: 5, per_unit: 'g' },
  { match: 'letmælk', name: 'Letmælk', kcal: 46, protein: 3.5, carbs: 4.8, fat: 1.5, fiber: 0, per_unit: 'ml' },
  { match: 'kikært', name: 'Kikærter (kogte/dåse)', kcal: 140, protein: 7.5, carbs: 18, fat: 2.5, fiber: 7, per_unit: 'g' },
  { match: 'linser', name: 'Røde linser (kogte)', kcal: 115, protein: 9, carbs: 17, fat: 0.4, fiber: 6, per_unit: 'g' },
  { match: 'bønner', name: 'Sorte bønner (kogte/dåse)', kcal: 130, protein: 8.5, carbs: 20, fat: 0.5, fiber: 8.5, per_unit: 'g' },
  { match: 'rugbrød', name: 'Rugbrød, fuldkorn', kcal: 210, protein: 6.5, carbs: 38, fat: 1.5, fiber: 8.5, per_unit: 'g', piece_size: 50 },
  { match: 'havregryn', name: 'Havregryn', kcal: 370, protein: 13, carbs: 58, fat: 7, fiber: 10, per_unit: 'g' },
  { match: 'knækbrød', name: 'Fuldkornsknækbrød', kcal: 340, protein: 10, carbs: 60, fat: 2, fiber: 16, per_unit: 'g', piece_size: 12 },
  { match: 'fuldkornspasta', name: 'Fuldkornspasta (kogt)', kcal: 150, protein: 6, carbs: 28, fat: 1, fiber: 5, per_unit: 'g' },
  { match: 'ærter', name: 'Grønne ærter (frosne)', kcal: 80, protein: 5.5, carbs: 9, fat: 0.7, fiber: 5.5, per_unit: 'g' },
  { match: 'broccoli', name: 'Broccoli', kcal: 35, protein: 3, carbs: 3.5, fat: 0.4, fiber: 3, per_unit: 'g' },
  { match: 'gulerod', name: 'Gulerod', kcal: 40, protein: 0.8, carbs: 7, fat: 0.2, fiber: 2.8, per_unit: 'g', piece_size: 80 },
  { match: 'hindbær', name: 'Hindbær (frosne)', kcal: 45, protein: 1.2, carbs: 5, fat: 0.6, fiber: 6.5, per_unit: 'g' },
  { match: 'pære', name: 'Pære', kcal: 55, protein: 0.4, carbs: 12, fat: 0.1, fiber: 3, per_unit: 'g', piece_size: 170 },
  { match: 'æble', name: 'Æble', kcal: 52, protein: 0.3, carbs: 12, fat: 0.2, fiber: 2.4, per_unit: 'g', piece_size: 150 },
  { match: 'chia', name: 'Chiafrø', kcal: 450, protein: 17, carbs: 4, fat: 31, fiber: 34, per_unit: 'g' },
  { match: 'hørfrø', name: 'Hørfrø', kcal: 500, protein: 18, carbs: 2, fat: 42, fiber: 27, per_unit: 'g' },
  { match: 'mandler', name: 'Mandler', kcal: 600, protein: 21, carbs: 6, fat: 52, fiber: 12, per_unit: 'g' },
]
