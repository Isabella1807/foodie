# Min plan — hvad den skal kunne

En beskrivelse til design. Her står hvad funktionen gør, hvilke tal der findes,
og hvilke tilstande der skal tegnes. Der står IKKE hvordan det skal se ud.

## Hvad det er til

Isabella vil tabe sig fra 94 kg til 65 kg. Det tager år, ikke måneder, og det
er dét, der slider. Vægten svinger 0,6 kg fra vejning til vejning, så et enkelt
tal siger ingenting. Funktionen skal svare på tre spørgsmål, hurtigt og uden at
man skal regne:

1. Er jeg på sporet i dag?
2. Hvornår er jeg i mål, hvis det fortsætter sådan her?
3. Hvad har jeg sparet op, som jeg kan bruge på en hyggedag?

Tonen skal være rolig og faktuel. Ingen peptalk, ingen skældud. Når hun er
bagud, skal det stå der uden drama.

## Tallene, der findes

Alt herunder regnes allerede i appen. Design skal bare vise det.

| Tal | Eksempel | Hvad det betyder |
|---|---|---|
| Status mod planen | −0,3 kg | Minus = foran planen. Plus = bagud. |
| Planens vægt i dag | 93,9 kg | Hvad kurven siger, hun bør veje i dag |
| Hendes vægt nu | 94,2 kg | Seneste vejning |
| Måldato | juli 2028 | Hvornår 65 kg nås, hvis planen holdes |
| Måldato ud fra målinger alene | januar 2030 | Vises kun lige efter en omlagt rutine |
| Hygge-konto | +840 kcal | Sparet op i forhold til planen |
| Kontoen i dage | 2,4 dage | Hvor meget hurtigere det gør måldatoen |
| Kontoen delt op | mad +310, træning +530 | Hvor gevinsten kom fra |
| Ugens timer | 4 af 6 | Hårde timer denne uge |
| Dagens time | 218 af 317 kcal | Hvad dagens træning var værd |
| Dagens kalorier | 1.240 af 1.550 | Spist mod dagens mål |
| Dage siden vejning | 1 | Hun vejer sig hver anden dag |

## Reglerne bag

- **En time tæller efter værdi, ikke tid.** En hård time er ca. 317 kcal ved
  hendes vægt. En dag tæller ved 80 % af det. En almindelig gåtur på en time er
  218 og tæller ikke; 75 minutter gør.
- **Seks dage om ugen.** Den syvende er fridag og er regnet ind i planen.
- **Hyggedag hver 14. dag** på op til 2.500 kcal, og den dag trænes der heller
  ikke. Begge dele er betalt på forhånd i kurven.
- **Bruges de ikke, lægger de sig på hygge-kontoen** og kan bruges en anden dag,
  uden at måldatoen skrider.
- **Forbrændingen falder ca. 13 kcal pr. tabt kilo.** Derfor går de sidste kilo
  langsommere, og det skal ikke ligne, at noget er gået galt.

## Tilstande, der skal tegnes

1. **Ingen plan endnu** — en knap "Start planen i dag" og én sætning om hvad det gør.
2. **Plan sat, men for få vejninger** — appen kan ikke regne endnu. Kort besked.
3. **Kørende, foran planen** — det normale, gode tilfælde.
4. **Kørende, bagud** — samme layout, andet fortegn. Må ikke føles som en straf.
5. **Lige efter omlagt rutine** — to måldatoer samtidig, med en forklaring på hvorfor.
6. **Planen flader ud** — med det nuværende indtag nås målet aldrig. Skal siges pænt.
7. **Kontoen er tom** (første dag) — "Begynder i morgen".

## Det, der er galt med det nuværende

- For meget tekst. Forklaringerne fylder mere end tallene.
- Alt står lige tæt. Der er ingen forskel på, hvad der er vigtigt.
- Fire afkrydsninger, en konto, to datoer og tre forklaringer på ét kort.
- Tallene står i sætninger i stedet for i et opslag, man kan aflæse.

## Idéer, der er værd at overveje

- **Tallene som opslag** i stedet for i sætninger: status, måldato og konto som
  tre store tal med en lille tekst under, ikke som prosa.
- **Hyggedagen i kalenderen.** Kalenderen farver allerede dagene. Den næste
  hyggedag kunne stå der som en markeret dag, man kan flytte til en anden dato,
  fx den dag man skal til bryllup. Så bliver den noget, man planlægger efter,
  i stedet for en regel, man læser om.
- **Ugens seks timer som seks felter**, så man ser med det samme, hvor mange der
  er tilbage, og hvilken dag fridagen blev brugt.
- **Forklaringerne ét sted**, fx en "sådan virker planen"-side, i stedet for
  spredt ud som småtekst under hvert tal.
- **Kontoen som noget, man bruger.** I dag er den et tal. Den kunne være en
  knap: "brug 900 kcal på i dag".


## Senere: mål hvad ET pas er værd for hende

Appen gætter i dag ikke længere på kalorier pr. slags bevægelse, fordi vi ikke
kan vide det. Men vi kan MÅLE det, når der er data nok. Det er den rigtige vej,
og den kræver ikke nye tal fra hende — kun tid.

**Metoden.** `estimateBurn` regner allerede det samlede daglige forbrug ud af
vægtens udvikling sammenholdt med det, der er logget. Det tal indeholder
bevægelsen. Har man perioder med FORSKELLIG mængde bevægelse, kan forskellen
tilskrives bevægelsen:

    forbrug i en periode med mange pas − forbrug i en periode med få pas
    ───────────────────────────────────────────────────────────────────
              forskellen i pas pr. dag mellem de to perioder

Det giver kcal pr. pas for præcis hendes krop og hendes måde at træne på, uden
at nogen skal gætte på METs.

**Hvad der skal være opfyldt, før tallet er brugbart:**

- Mindst to perioder på hver ca. fire uger. Kortere, og vægtens støj på ±0,3 kg
  pr. vejning æder signalet.
- En reel forskel i mængden af bevægelse mellem perioderne, gerne to pas om ugen
  eller mere. Sker af sig selv: ferier, sygdom, travle uger.
- Mad logget på mindst 80 % af dagene i begge perioder.
- Vejninger mindst hver anden dag.

**Hvornår.** Planen startede 2026-09-17. Med den slags variation, der opstår af
sig selv, er der data nok omkring årsskiftet 2026/2027.

**Alt det nødvendige gemmes allerede:** `entries` (mad pr. dag), `weights`
(vejninger) og `movement` (minutter og slags pr. dag). Der skal ikke ændres i
databasen for at kunne lave analysen senere.

**Vis det forsigtigt.** Tallet skal først frem, når betingelserne ovenfor er
opfyldt, og det skal stå som et interval og ikke som ét tal — fx "et pas er
værd omkring 200 til 300 kcal for dig". Ét præcist tal ville være samme fejl som
det, der lige er fjernet.
