# foodie — alle funktioner

Dette er en beskrivelse af ALT, appen kan, uden noget om det nuværende udseende.
Den er skrevet, så en designer (eller et designværktøj) kan lave nye forslag til,
hvordan det hele kan sættes op mere overskueligt.

## Kontekst

- Privat app til én bruger, der vil tabe sig i et roligt, bæredygtigt tempo.
- Bruges næsten kun på telefonen (installeret som app fra browseren, en PWA). Virker også på computer.
- Alle tekster er på dansk. Tonen er støttende, aldrig skældende: en høj dag er ikke en fejl, en hyggedag er planlagt.
- Virker uden net: alt vises fra en lokal kopi, og ændringer sendes op, når nettet er tilbage. Der er en lille tekst, når noget venter på at blive sendt.
- Login med email og kodeord, første gang. Log ud ligger på madliste-siden.

## Hvad der bruges hvor tit (til at prioritere)

- Flere gange dagligt: logge et måltid, se hvor mange kalorier der er tilbage i dag, se om protein og fibre følger med.
- Én gang dagligt: sætte kryds for bevægelse, veje sig (hver anden dag), evt. markere dagen som hyggedag eller som mere aktiv end normalt.
- Et par gange om ugen: kigge i kalenderen (ugen og måneden), se vægtgrafen og tempoet.
- Sjældent: rette mål, udfylde krops-tal, rydde op i madlisten, slå notifikation til.

## Navigation

Tre faner i bunden: **I dag**, **Kalender**, **Mad**.

---

## Fane 1: I dag

### Øverst: dagens tal
- Dagens dato med ugedag.
- Stort tal: kalorier spist i dag / dagens mål. Dagens mål kan være højere end det normale, hvis dagen er sat som mere aktiv (se "aktivitet").
- Fire små målere for protein, kulhydrat, fedt og fibre: gram spist / dagens mål i gram. Protein og fibre skal NÅS (bliver "grøn" når man er der), fedt og kulhydrat er en øvre grænse (markeres når man er over). En note fortæller, hvis nogle af dagens måltider ikke har tal for et næringsstof, så tallet er i underkanten.
- En lille markering: "I underskud denne uge" eller "Over målet denne uge".
- To målere: "X kcal tilbage af Y i dag" (eller "X kcal over dagens Y") og "X kcal under/over målet i denne uge". Ugen regnes kun på de dage, der faktisk er logget.
- Tekst "Gemmes online, når du har net igen", når der ligger ændringer i kø.

### Start-hjælp
- Er madlisten tom, tilbydes en startliste med almindelige madvarer, der kan hentes med ét tryk.

### Log et måltid ("Hvad har du spist?")
- Et søgefelt. Uden søgning vises de 6 senest brugte varer som knapper. Med søgning vises varer, hvor et ord begynder med det skrevne, først; højst 8 ad gangen med et link "vis alle N varer".
- En knap til at skanne stregkode (kameraet åbner i fuld skærm og leder efter EAN/UPC). Kendes koden, hopper man direkte til "hvor meget?". Kendes den ikke, slås den op i Open Food Facts (gratis, åben database) og lander som udkast i den fulde formular med navn, kalorier, protein/kulhydrat/fedt/fibre pr. 100 g og evt. portionsstørrelse. Kan kameraet ikke bruges, kan tallene under stregkoden tastes manuelt.
- Skriver man mindst to bogstaver, foreslås også op til 5 almindelige fødevarer fra Den Danske Fødevaredatabase (Frida, DTU), fx "Gulerod, dansk, rå · 24 kcal", med kalorier, protein, kulhydrat, fedt og fibre pr. 100 gram. Ét tryk lægger varen på ens egen liste og går til "hvor meget?". Kilden nævnes over forslagene. Basen har ingen stregkoder.
- Skriver man et navn, der ikke findes i listen, kan man oprette det på stedet:
  - Vælg hvad tallet gælder for: 1 portion, 1 styk, 100 gram eller 100 milliliter.
  - Skriv kalorier (pr. portion / pr. styk / pr. 100 g eller ml).
  - Valgfrit: hvad vejer ét styk eller én hel/portion (ikke hele pakken). Et hint siger, at feltet skal stå tomt for varer, man tager lidt af ad gangen (remoulade, havregryn).
  - En hjælpetekst viser, hvad appen har regnet ud (fx "Én hel ≈ 460 kcal").
  - Knapper: "Log X kcal" (portion logges direkte) eller "Vælg mængde" (gram/ml/styk går videre til mængde-valget), "Gem kun i listen", "Tilføj med protein, kulhydrat, fedt og fibre i stedet" (fuld formular), "Byg … som en ret af flere varer".
- Uden søgning er der også et link "Byg en ret af flere varer".

### "Hvor meget?" (mængde-valget, efter man har trykket på en vare)
- Hurtigvalg som knapper med kalorietal på hver:
  - Portionsvare: en kvart, en halv, en hel, 2, 3.
  - Vare med kendt styk-vægt (fx en kiks på 13 g): en kvart, en halv, 1 styk, 2 styk, 3 styk (med gram i navnet).
  - Vare i gram/ml uden styk-vægt: 25, 50, 100, 200, 300 gram (eller ml).
  - Stor pakke (over 350 g/ml, fx en liter mælk, en pose havregryn, en hel melon): en kvart, en halv, en hel — ikke 2 og 3.
  - Drikkevarer (ml uden styk-vægt, eller en stor karton): ekstra hurtigvalg i glas (ca. 200 ml: et halvt, 1, 2 glas) og i tår (ca. 30 ml: 1, 3, 5, 10 tår).
  - En ret bygget af flere varer logges i portioner: en kvart, en halv, 1 portion, 2 portioner, 3 portioner.
- "Eller skriv selv": et felt til antal gram/milliliter (eller antal portioner med komma, fx 1,5, for portionsvarer), plus felter til antal styk (kun rigtige styk), antal glas og antal tår (kun drikkevarer). Knappen viser kalorierne for det skrevne, fx "Log 218 kcal".
- Links: "Annullér" og "Ret varen, fx et forkert tal" (åbner varens fulde formular direkte herfra, og man kommer tilbage til mængde-valget med de nye tal).
- Måltidet gemmes med navn, mængde i navnet (fx "Letmælk (500 milliliter)"), kalorier og næringsstoffer.

### Forslag (vises kun når det er relevant)
- Når protein eller fibre halter bagefter dagens kalorier (dagen er godt i gang, og andelen af målet ligger klart under andelen af kalorierne), ELLER når man samlet er bagud fra de sidste 7 dage, vises et kort med:
  - En forklaring: "Protein halter bagefter. Du mangler X g i dag (og er Y g bagud fra de sidste dage) og har Z kcal tilbage i dag." Eller: "Protein haltede de sidste dage. Du er Y g bagud i alt, spis lidt ekstra i dag, så hentes noget af det."
  - Op til 3 konkrete portioner fra ens egen madliste med meget af det manglende for få kalorier, hver med mængde, "+X g protein", kalorier og en "Log"-knap (logges med ét tryk).
  - Op til 2 ideer, der ikke er på listen endnu (ca.-tal), med "Tilføj og log".
  - En note, hvis kun nogle af dagens måltider har tal for næringsstoffet.
  - Et link "Ikke i dag", der skjuler kortet resten af dagen.

### Bevægelse
- En linje om ugen: "3 af 7 dage, 2 dage mere, så er ugens 5 nået" / "ugens mål er nået".
- Ugen som syv prikker (Ma–Sø): fyldt = mindst 30 min den dag, halv = noget men under 30, tom = intet, markering af i dag, fremtidige dage svage.
- Er dagen ikke sat: knapper for slags (Gåtur, VR-spil, Cykel, Badminton, Andet). Vælges "Andet", kommer et tekstfelt "hvad lavede du? fx svømning". Knapper for minutter (15, 30, 45, 60) og et felt "eller skriv antal minutter" med Gem. Under: "Mindst 30 minutter tæller som en dag. Målet er 5 dage om ugen, X minutter i alt indtil nu."
- Er dagen sat: "45 min badminton i dag ✓" (eller "20 min i dag, 10 min mere, så tæller dagen") med links "ret" og "fjern".
- Slagsen er kun en tekst. Bevægelsen lægger IKKE kalorier oveni dagens mål (med vilje).

### Dagens måltider
- Liste over alt logget i dag: navn (inkl. mængde), en lille linje med protein/kulhydrat/fedt/fibre hvis kendt, kalorier, og en slet-knap (med bekræftelse).
- Tom tilstand: "Du har ikke logget noget i dag endnu."

### Dagens status
- Ugens gennemsnit i kcal/dag (farves når ugen samlet ligger over budgettet).
- Procent af vejen mod målvægten med en lille bjælke (eller bare den nuværende vægt, hvis der ikke er en målvægt).
- "Hvor aktiv var du i dag?": fire knapper (Stillesiddende, Let aktiv, Moderat, Meget aktiv). Ens generelle niveau er valgt som standard. En mere aktiv dag giver ekstra plads i dagens mål ("+180 kcal ekstra plads i dag"), en roligere dag giver mindre. Kræver at krops-tallene er udfyldt, ellers en hjælpetekst om det.
- Knap: "Marker i dag som hyggedag" / "🎉 I dag er en hyggedag". En hyggedag får en beroligende tekst i kalenderen og et flag på dagen.

### Protein og fibre over tid
- En lille tabel: protein og fibre for "denne uge" og "denne måned": "X g bagud" / "X g foran" / "på målet", og under hvert tal "fået af forventet" i gram. Regnet på de dage, der er logget mad, og kun på måltider, der har tal.
- En kort forklaring af, hvad "bagud" betyder, og at man kan spise lidt ekstra af det de næste dage.

### Vægt
- Seneste vægt stort, med "vejet i dag / i går / dato".
- "Siden sidste uge: −0,4 kg" (mod den nærmeste vejning mindst 7 dage tilbage). Før der er nok vejninger: en note om det.
- Fremskridt: "Du har tabt X kg, Y % af vejen til Z kg", en bjælke fra startvægt til målvægt.
- Påmindelse kun efter to dage uden vejning: "Du har ikke vejet dig siden mandag d. 14. september ⚖️". Efter en vejning i dag: "Vejet i dag ✓".
- Knapper: "Vej nu" (et felt til kg, komma virker; kan også rette dagens vægt) og "Tidligere vejning" (dato + kg, til at efterregistrere).

### Mine mål
- Dagligt mål i kcal med "ret". Ved rettelse vælger man "Fast tal" eller "Regn det ud for mig" (hvor mange kg om ugen man vil tabe). Med det automatiske valg regner appen dagsmålet ud fra det målte forbrug hver mandag, gældende ugen ud, aldrig under 1200 kcal. Er forbruget ikke sikkert nok endnu (for få vejninger), gælder det faste tal, og en note forklarer det. Noter forklarer regnestykket ("dit forbrug mandag 1.700 minus 300").
- Ugentligt budget (dagsmål × 7).
- Dit forbrug: "ca. 1.700 kcal/dag, målt over de sidste 4 uger ud fra din logning og vægt". Plus hvad dagsmålet så betyder: "du spiser ca. 300 mindre, end du forbrænder, det svarer til ca. 0,27 kg om ugen". Advarer hvis målet ligger over forbruget. Nævner hvis dage i perioden ikke er logget.
- Protein, kulhydrat og fedt pr. dag i gram, hver med "ret". Standard er 25/45/30 % af kalorierne, og en note forklarer det (og at man kan slette sit eget tal for at gå tilbage).
- Fibre pr. dag med "ret". Standard regnes ud fra køn, vægt, højde og alder (3 g pr. 239 kcal man forbrænder, mindst 25 g for kvinder / 35 g for mænd). Noten viser regnestykket eller beder om krops-tal.
- Målvægt i kg med "ret"/"sæt".
- Vejning: "et par gange om ugen" (kun tekst).
- Fast notifikation: til/fra. Slået til viser telefonen en fast, lydløs notifikation med "1.240 / 1.500 kcal, 260 tilbage i dag", der opdateres ved hvert måltid. Kræver tilladelse; en besked forklarer, hvis den mangler.

---

## Fane 2: Kalender

### Månedskalender
- Pile til forrige/næste måned (ikke frem i fremtiden), månedens navn.
- Uger fra mandag til søndag, plus en kolonne "uge".
- Hver dag viser dagens kalorier og farves i fire trin målt mod DAGENS eget budget: til og med budgettet (grøn), op til 100 over (lysegrøn), op til 200 over (gul), derover (rød). Dage uden mad er neutrale, fremtidige dage kan ikke trykkes. I dag er markeret.
- Et flag 🎉 på hyggedage og en prik på dage med mindst 30 minutters bevægelse.
- I uge-kolonnen: ugens samlede over/under mod budgettet for de dage, der er logget ("−1.200" / "+340").
- En forklaring af farver, bevægelsesprik og uge-tal.

### Åben dag (tryk på en dag)
- Dagens navn ("i går", "mandag d. 14. september"), evt. 🎉, og dagens samlede kalorier.
- De fire målere for protein/kulhydrat/fedt/fibre for den dag.
- Dagens måltider med næringsstof-linje, kalorier og slet-knap. Tom tilstand: "Intet mad logget denne dag."
- En støttende besked, hvis dagen var over målet ("Du spiste X kcal mere end dit mål. Det svarer ikke til at have ødelagt dit vægttab, din uge ser stadig fin ud.") eller var en hyggedag.
- "Hvor aktiv var du den dag?" (samme fire knapper som på forsiden, med ekstra plads).
- Bevægelse for den dag (samme kort som på forsiden, med ugens prikker omkring den dag).
- Knap: "Marker som hyggedag" / "Fjern hyggedag".
- Et fuldt "Hvad har du spist?"-felt, der logger på DEN dag (med teksten "Tilføjer til mandag d. 14. september").

### Vægtudvikling
- Graf over alle vejninger over tid (linje med punkter) og en vandret linje for målvægten. "94,3 kg nu" i hjørnet.
- Milepæle: en række med hele kg-trin ned mod målet, hvor de nåede er markeret.
- Tom tilstand: "Vej dig et par gange, så tegner grafen din udvikling her."

### Statistik
- "Tabt i alt" i kg og "dit tempo" i kg/uge (regnet over hele perioden).
- Fremskridtsbjælke start → mål.
- "Med dit tempo når du 65 kg om ca. 40 uger, omkring juni 2027."
- "Dit forbrug er ca. 1.700 kcal/dag, målt over de sidste 4 uger. I den periode har du tabt ca. 0,3 kg/uge."

### Forventet tid til målet
- En tekst, der regner ud, hvornår målvægten nås med det nuværende dagsmål: ud fra det målte forbrug, hvis det findes, ellers ud fra kroppen (højde, alder, køn, aktivitetsniveau) og indtaget. Kan også sige, hvor vægten vil gå i stå ("du når ned omkring 78 kg om ca. 9 måneder, derefter står vægten stille, fordi man forbrænder mindre, når man bliver lettere").
- Link "tilføj dine krops-tal" / "ret dine tal": en formular med højde (cm), alder, køn (Kvinde/Mand) og generelt aktivitetsniveau (Stillesiddende, Let aktiv, Moderat, Meget aktiv). Tallene bruges også til fiber-målet og til ekstra plads på aktive dage.

---

## Fane 3: Mad (madlisten)

- Knapper øverst: "Tilføj" (ny vare) og "Byg en ret".
- Søgefelt og filtre: Alle, Retter, Portioner, Stk, Gram, Milliliter.
- Liste over alle varer: navn, "ret af 4 varer" for retter, næringsstof-linje (protein/kulhydrat/fedt/fibre pr. 100 g eller pr. portion), kalorie-tekst ("263 kcal / 100 gram", "94 kcal/styk", "775 kcal"), knapper "Ret" og slet (med bekræftelse; allerede loggede måltider ændres ikke).
- Link til at hente nye varer fra standardlisten, hvis der er kommet nogen, man ikke har.
- Nederst: ens email og "Log ud".

### Formular til en vare (ny eller ret)
- Skan stregkode (udfylder felterne fra Open Food Facts), viser koden hvis der er en.
- Navn.
- "Tallene gælder for": 1 portion / 1 styk / 100 gram / 100 milliliter.
- Kalorier (pr. portion / pr. styk / pr. 100 g eller ml).
- Valgfrit: vægt pr. styk eller pr. hel/portion (ikke hele pakken), med hint.
- Hjælpetekst med det, appen har regnet ud.
- Protein, kulhydrat, fedt og fibre i gram (valgfrit), på samme grundlag som kalorierne.
- Annullér / Gem.

### Byg en ret af flere varer
- Navn på retten.
- Tilføj varer ved at søge i madlisten eller skanne stregkoden på hver vare. Almindelige råvarer (løg, gulerod, hakket oksekød) foreslås fra Fødevaredatabasen (DTU) med tal pr. 100 gram. Findes varen ikke, kan den oprettes med tal fra etiketten undervejs.
- For hver vare: mængde i den enhed varen har (gram, milliliter, styk med "1 styk ≈ 13 gram", eller portioner), kalorier for mængden, fjern-knap.
- Valgfrit: færdig rets vægt i gram (hvis den fx koger ind) og antal portioner.
- Opsummering: hele rettens kalorier og næringsstoffer, og hvordan retten gemmes (pr. 100 g med "1 portion ≈ 296 gram ≈ 420 kcal", eller pr. portion hvis vægten ikke kendes). Hints hvis noget mangler.
- Retten gemmes som én vare i madlisten og kan logges i portioner (kvart/halv/hel osv.) eller gram. Ingredienserne huskes, så retten kan rettes igen.

---

## Uden for appen

- Et lille tal på app-ikonet: dagens kalorier (når appen er installeret på hjemmeskærmen).
- Den faste notifikation (se "Mine mål"), der opdateres ved hvert måltid.

## Regler bag tallene (kort, så designeren ved hvad der skal forklares)

- Kalorie-målet er enten et fast tal eller regnet automatisk pr. uge ud fra det målte forbrug.
- Det målte forbrug = det man spiser i snit + det man taber (1 kg ≈ 7.700 kcal), regnet med en tendenslinje gennem de seneste ugers vejninger, så en enkelt skæv vejning ikke vælter tallet. Kræver mindst tre vejninger over to uger; "sikkert" efter otte vejninger over tre uger.
- Bevægelse og aktivitetsniveau er to forskellige ting: bevægelse er et kryds (minutter og slags) uden effekt på målet; aktivitetsniveau (stillesiddende … meget aktiv) giver ekstra plads i dagens mål ud fra kropsvægten.
- Protein og fibre regnes kun på måltider, der har tal, så gamle varer uden tal ikke ligner "0 g".
- Alle enheder skrives helt ud (gram, milliliter, styk), og tal skrives med dansk komma.
