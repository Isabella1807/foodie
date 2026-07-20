# foodie

Lille privat kalorie- og vægt-tracker (PWA) med fokus på et bæredygtigt vægttab.
Log hvad du spiser, se dagens total og en støttende "dagens status", følg ugens
gennemsnit, og se en farvekalender der viser hver dag som under/omkring/over dit
mål. Følg vægten med en graf og glidende gennemsnit, milepæle og fremskridt mod
målvægten — og marker hygge-/festdage, så en planlagt dag ikke ligner en fejl.
Virker også uden net og sender data op til Supabase, når nettet er tilbage.

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

Har du allerede databasen kørende fra før, så kør kun den nederste del af
`sql/schema.sql` (fra kommentaren om ældre udgaver og ned) — den tilføjer
tabellerne til vægt og mål.

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
