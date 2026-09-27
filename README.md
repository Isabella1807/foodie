# foodie

Lille privat app. Kræver login.

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

## Database

Kør `sql/schema.sql` i Supabase SQL Editor. Nye dele står nederst efter en
"kør kun herfra og ned"-markering og skal køres, før appen bruger dem.

## Deploy

Push til `main`, så bygger GitHub Actions appen og lægger den på GitHub Pages.

## Data

Fødevaretal fra Den Danske Fødevaredatabase (fcdb.fooddata.dk), version 6.1,
DTU Fødevareinstituttet, udgivet under CC BY 4.0. `src/data/frida.json` laves
med `scripts/frida_to_json.py`.
