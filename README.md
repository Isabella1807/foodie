# foodie

Lille privat kalorie- og vægt-tracker (PWA) med fokus på et bæredygtigt vægttab.
Log hvad du spiser, se dagens total og en støttende "dagens status", følg ugens
gennemsnit, og se en farvekalender der viser hver dag som under/omkring/over dit
mål. Vej dig et par gange om ugen og følg vægten med graf, milepæle og fremskridt mod
målvægten — og marker hygge-/festdage, så en planlagt dag ikke ligner en fejl.
Man behøver ikke veje sig hver dag; appen minder først om det efter to dage uden.
Sæt en målvægt og et vægttab pr. uge, og start planen: så viser forsiden et kort
med hvor du bør ligge i dag, om du er foran eller bagud, og hvornår du rammer
målet. Kurven regner med, at forbrændingen falder, efterhånden som du bliver
lettere, og der er en hyggedag hver 14. dag lagt ind i den med vilje.
Vægtgrafen kan vises som en tabel med dato, vægt og ændring pr. vejning, og
kopieres direkte over i et regneark. Kortene kan foldes sammen ved at trykke på
deres overskrift, så forsiden kan skæres ned til det, man kigger på hver dag.
De fleste badevægte viser forskellige tal alt efter hvor man står på pladen, så
under "Vej nu" kan man taste tre vejninger og lade appen gemme midtertallet. En
vejning taget på en fremmed vægt kan slettes igen under "Tidligere vejning".
Et lille kort "til dig" på forsiden siger én sand, opmuntrende ting ud fra dine
egne tal — fx at vægten har stået stille i to uger, men at dit snit ligger under
dit målte forbrug, så underskuddet er der. Det er faste regler (se
`src/lib/encourage.js`), ikke en AI, så det koster ikke noget og virker uden net.
Beskeden står også i den faste notifikation, hvis den er slået til.
Varer fra Den Danske Fødevaredatabase kan logges i husmål i stedet for gram —
rugbrød og pålæg i skiver, remoulade i spiseskefulde, smør i teskefulde, æg og
gulerødder i styk — så protein og fibre kommer med uden at man skal veje noget.
Skan stregkoden på en vare, så slår appen den op i Open Food Facts og henter
kalorier, protein, kulhydrat, fedt og fibre; dagens protein, kulhydrat, fedt og
fibre vises under dagens tal, mod et dagligt mål du kan rette (fiber-målet
regnes ud fra køn, vægt, højde og alder). Halter protein eller fibre bagefter
kalorierne, foreslår forsiden konkrete portioner fra din egen liste (og et par
ideer udenfor den), som du kan logge med ét tryk — forslaget bliver stående
dagen efter, hvis du kom bagud, så du kan hente lidt af det. Et lille kort viser,
hvor langt du er bagud (eller foran) på protein og fibre for ugen og måneden. Sæt et kryds for dagens
bevægelse (tryk på 15 til 60 minutter eller skriv tallet selv, og evt. hvad det
var: gåtur, VR, cykel, badminton eller noget du selv skriver), se ugen som syv prikker og
dagene i kalenderen — bevægelsen lægges ikke oveni dagens mål, den viser sig i
dit målte forbrug. Byg en ret af flere varer
(skan eller vælg dem og skriv mængden af hver), så retten gemmes som én vare,
du logger i gram eller portioner. Appen regner også dit faktiske daglige forbrug ud løbende fra
de seneste ugers logning og vejninger.
Virker også uden net og sender data op til Supabase, når nettet er tilbage.

## Fødevaredatabasen (Frida)

Skriver du et navn, der ikke er i din egen liste (fx "gulerod"), foreslår appen
almindelige fødevarer fra Den Danske Fødevaredatabase (Frida) fra DTU
Fødevareinstituttet, med kalorier, protein, kulhydrat, fedt og fibre pr. 100 gram.
Ét tryk lægger varen på din liste og går til "hvor meget?". Det samme sker, når
du bygger en ret. Basen har ingen stregkoder — dem slår Open Food Facts op.

Tallene ligger i `src/data/frida.json` (ca. 1.400 fødevarer, deklarations-tal)
og hentes først, når der bliver søgt. Filen laves ud fra DTU's regneark:

```bash
pip install openpyxl
python scripts/frida_to_json.py FCDB_6.1_Dataset.xlsx
```

Regnearket hentes fra https://doi.org/10.11583/DTU.32312844 (nyeste version).
Data er udgivet under CC BY 4.0: Den Danske Fødevaredatabase (fcdb.fooddata.dk),
version 6.1, maj 2026, DTU Fødevareinstituttet. Kilden vises i appen, hvor tallene foreslås.

## Teknik

Vue 3 + Vite + Pinia · Supabase (database + login) · vite-plugin-pwa · hostes på GitHub Pages.

## Kør lokalt

```bash
npm install
npm run dev
```

Kræver en `.env.local` med:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Værdierne findes i Supabase-dashboardet under Project Settings → API.

## Database-opsætning (én gang)

1. Opret et Supabase-projekt
2. Kør `sql/schema.sql` i SQL Editor
3. Opret din bruger under Authentication → Users → Add user (sæt "Auto Confirm")
4. Slå nye tilmeldinger fra: Authentication → Sign In / Providers → "Allow new users to sign up" → fra

Har du allerede databasen kørende fra før, så kør kun de dele, du mangler.
`sql/schema.sql` har otte "kør kun herfra og ned"-markeringer: den første tilføjer
tabellerne til vægt og mål, den anden krops-tal og aktivitet pr. dag (så de
matcher på alle enheder), den tredje protein/kulhydrat/fedt og stregkode på
madvarer og måltider, den fjerde daglige mål for protein/kulhydrat/fedt og
ingredienser på retter, den femte det automatiske dagsmål (kg om ugen), den
sjette fibre på madvarer, måltider og mål, den syvende tabellen til bevægelse
pr. dag, og den sidste fjerner den faste liste over slags bevægelse, så man
selv kan skrive fx badminton eller svømning. Kør den eller de dele, din database
ikke har endnu — og kør dem FØR du bruger den nye del i appen, ellers afviser
databasen ændringen, og den går tabt ved næste hentning.

## Sådan virker offline-delen

Alt vises fra en lokal kopi i telefonens localStorage. Hver ændring lægges i en kø
(`foodie:outbox`) og sendes til Supabase når der er net (ved app-start, når nettet
kommer tilbage, og når appen vågner). Alle id'er laves på telefonen og sendes med
upsert, så en ændring der bliver sendt to gange, ikke laver dubletter.

## Deploy

Push til `main` → GitHub Actions bygger og lægger appen på GitHub Pages:
https://isabella1807.github.io/foodie/

Workflowet ligger i `.github/workflows/deploy.yml` (env-værdierne står direkte
deri — de er offentlige af design).
