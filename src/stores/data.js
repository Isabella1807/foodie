import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { load, save, remove } from '../lib/storage'
import { localToday, weekStart, addDays } from '../lib/dates'
import { kcalPerKgOf, bodyBurn } from '../lib/activity'
import { estimateBurn, goalForRate } from '../lib/burn'
import { planCurve, planStatus, treatPerDay } from '../lib/plan'
import { movementPerDay, planMovementPerDay, kcalForMovement, oneSessionKcal, enoughKcal, isHardEnough, minutesToGo, PLAN_PER_KG, PLAN_DAYS_PER_WEEK } from '../lib/activityKcal'
import { MOVE_GOAL_MIN, MOVE_DAYS_PER_WEEK, isDone } from '../lib/movement'
import { sumMacros, defaultMacroGoals, MACROS, REACH_GOALS } from '../lib/nutrition'
import { balance } from '../lib/balance'
import { encouragements } from '../lib/encourage'

const now = () => new Date().toISOString()

// Dato-tekst (YYYY-MM-DD) til lokal dato, og antal dage fra a til b
const parseDay = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const daysBetween = (a, b) => Math.round((b - a) / 86400000)

// Kopi uden de valgfrie felter, der er tomme
function withoutEmpty(obj, optional) {
  const copy = { ...obj }
  for (const key of optional) if (copy[key] == null) delete copy[key]
  return copy
}

// Lokal-først: skærmen viser altid cachen; hver ændring lægges i en kø
// (outbox) og sendes til Supabase når der er net. Alle id'er laves på
// telefonen, og der bruges upsert — så gør det ikke noget, hvis samme
// ændring bliver sendt to gange.
export const useDataStore = defineStore('data', {
  state: () => {
    // Ældre cacher mangler weights/goals — derfor fallback pr. felt
    const cache = load('cache', {})
    return {
      foods: cache.foods || [],
      entries: cache.entries || [],
      weights: cache.weights || [],
      // Mål: dagligt kalorie-mål, målvægt og gram protein/kulhydrat/fedt/fibre pr. dag
      // (tomt = appen regner et udgangspunkt ud fra kalorie-målet og kroppen).
      // loss_per_week: sat = appen regner selv dagsmålet ud fra dit målte
      // forbrug, så du taber så mange kg om ugen; kcal_goal er så kun reserven
      goals: { kcal_goal: 1500, goal_kg: null, protein_goal: null, carbs_goal: null, fat_goal: null, fiber_goal: null, loss_per_week: null, plan_start_on: null, plan_start_kg: null, ...(cache.goals || {}) },
      celebrations: cache.celebrations || [], // dage markeret som hygge-/festdag: { id, date }
      // Krops-tal til at anslå tid til målet og ekstra plads på aktive dage.
      // Synces nu, så de samme tal gælder på alle enheder
      profile: cache.profile || { height_cm: null, age: null, sex: null, activity: null },
      // Valgt aktivitet pr. dag, fx { '2026-07-20': 'moderat' } — en mere aktiv
      // dag giver ekstra plads i dagens mål. Synces også
      dayActivity: cache.dayActivity || {},
      // Bevægelse pr. dag, fx { '2026-09-10': { minutes: 30, kind: 'vr' } } — et kryds
      // for dagen, som IKKE ændrer dagens mål. Synces
      movement: cache.movement || {},
      notify: cache.notify || false, // fast notifikation med dagens kalorier (pr. enhed)
      nudgeHiddenOn: cache.nudgeHiddenOn || null, // dagen hun trykkede "ikke i dag" på forslagene (pr. enhed)
      noteHidden: cache.noteHidden || {}, // "tak" på en besked "til dig": nøgle → dagen, så den holder pause et par dage (pr. enhed)
      dismissedStarters: cache.dismissedStarters || [], // slettede varenavne — foreslås ikke igen
      outbox: load('outbox', []),
      flushing: false,
    }
  },

  getters: {
    todayEntries(state) {
      const today = localToday()
      return state.entries
        .filter((e) => e.eaten_on === today)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    },

    todayTotal() {
      return this.todayEntries.reduce((sum, e) => sum + e.kcal, 0)
    },

    // Alt spist siden mandag — bruges til ugens budget (dagligt mål × 7)
    weekTotal(state) {
      const start = weekStart(localToday())
      return state.entries
        .filter((e) => e.eaten_on >= start && e.eaten_on <= localToday())
        .reduce((sum, e) => sum + e.kcal, 0)
    },

    // Datoerne i denne uge, hvor der er logget noget — så ugens over/under
    // kun regnes på de dage, hun faktisk har tastet ind
    weekLoggedDates(state) {
      const start = weekStart(localToday())
      const today = localToday()
      const days = new Set()
      for (const e of state.entries) {
        if (e.eaten_on >= start && e.eaten_on <= today) days.add(e.eaten_on)
      }
      return [...days]
    },

    weekLoggedDays() {
      return this.weekLoggedDates.length
    },

    // Ugens gennemsnit pr. logget dag — det tal, der viser om ugen samlet
    // holder, selv om en enkelt dag har været høj
    weekAverage() {
      return this.weekLoggedDays ? Math.round(this.weekTotal / this.weekLoggedDays) : 0
    },

    // Opslag: er en bestemt dato markeret som hyggedag?
    isCelebration(state) {
      return (date) => state.celebrations.some((c) => c.date === date)
    },

    // Vejninger, nyeste først
    weighIns(state) {
      return [...state.weights].sort((a, b) => {
        if (a.measured_on !== b.measured_on) return a.measured_on < b.measured_on ? 1 : -1
        return new Date(b.created_at) - new Date(a.created_at)
      })
    },

    latestWeight() {
      return this.weighIns[0] ?? null
    },

    // Den første vejning er startvægten — den vægttabet regnes fra
    startWeight() {
      return this.weighIns[this.weighIns.length - 1] ?? null
    },

    // Det faste daglige mål — 1500 kcal som standard, indtil hun selv sætter et andet
    fixedGoal(state) {
      return state.goals.kcal_goal ?? 1500
    },

    // Dit forbrug, som det så ud på en bestemt dato: kun vejninger til og med
    // den dag tæller med. Bruges til ugens automatiske mål
    burnAsOf(state) {
      return (date) => estimateBurn(state.weights.filter((w) => w.measured_on <= date), state.entries)
    },

    // Ugens automatiske mål for en dato. Har hun bedt appen regne målet ud
    // (loss_per_week sat), regnes det ud fra forbruget, som det så ud mandag i
    // den uge — så tallet står fast hele ugen og først flytter sig næste mandag.
    // Er forbruget ikke solidt nok endnu (for få vejninger), gælder det faste tal.
    // Giver { auto: false } eller { auto: true, ready, goal, burn, floored, weekStart }
    autoGoalFor(state) {
      return (date) => {
        const rate = state.goals.loss_per_week
        if (!rate) return { auto: false }
        const monday = weekStart(date)
        const burn = this.burnAsOf(monday)
        if (!burn.ready || !burn.solid) return { auto: true, ready: false, goal: this.fixedGoal, burn, floored: false, weekStart: monday }
        const { goal, floored } = goalForRate(burn.kcal, rate)
        return { auto: true, ready: true, goal, burn, floored, weekStart: monday }
      }
    },

    // Ugens automatiske mål lige nu (til teksten under "Mine mål")
    autoGoal() {
      return this.autoGoalFor(localToday())
    },

    // Dagligt mål for en bestemt dato: ugens automatiske mål, ellers det faste tal
    goalFor() {
      return (date) => this.autoGoalFor(date).goal ?? this.fixedGoal
    },

    // Dagens mål
    dailyGoal() {
      return this.goalFor(localToday())
    },

    // Den vægt beregningerne bruger: den seneste vejning, ellers startvægten
    bodyWeight() {
      return this.currentWeight ?? this.startWeight?.kg ?? null
    },

    // Kan vi regne ekstra plads ud? Kræver højde, alder, køn, et generelt
    // aktivitetsniveau og en vægt — ellers er der ikke nok tal
    canComputeBurn(state) {
      const p = state.profile
      return !!(p.height_cm && p.age && p.sex && p.activity && this.bodyWeight)
    },

    // Ekstra kalorier en dags aktivitet giver oveni dagsmålet, i forhold til
    // dit generelle niveau: en mere aktiv dag forbrænder mere, så du kan spise
    // tilsvarende mere og stadig ligge i samme underskud. Regnes ud fra din
    // vægt og hvor meget hvert niveau dækker (kcal pr. kg). 0 hvis tallene
    // mangler eller dagen svarer til dit generelle niveau.
    activityBonus(state) {
      return (date) => {
        if (!this.canComputeBurn) return 0
        const base = state.profile.activity
        const level = state.dayActivity[date] || base
        return Math.round(this.bodyWeight * (kcalPerKgOf(level) - kcalPerKgOf(base)))
      }
    },

    // Dagens samlede budget = dagsmålet + evt. ekstra plads for den dags aktivitet
    dayBudget() {
      return (date) => this.goalFor(date) + this.activityBonus(date)
    },

    // I dags budget (dagsmål + ekstra plads, hvis i dag er sat til mere aktiv)
    todayBudget() {
      return this.dayBudget(localToday())
    },

    // Ugens samlede budget hen over de dage, der er logget — så en aktiv dag
    // med ekstra plads tæller rigtigt med, når ugen gøres op
    weekBudgetLogged() {
      return this.weekLoggedDates.reduce((sum, d) => sum + this.dayBudget(d), 0)
    },

    // Ugens over/under mod budgettet (+ = over, − = under). null hvis intet logget
    weekOver() {
      return this.weekLoggedDays ? this.weekTotal - this.weekBudgetLogged : null
    },

    // Har hun vejet sig i dag?
    weighedToday() {
      return this.latestWeight?.measured_on === localToday()
    },

    // Dage siden seneste vejning (0 = i dag) — null uden vejninger
    daysSinceWeighIn() {
      const latest = this.latestWeight
      return latest ? daysBetween(parseDay(latest.measured_on), parseDay(localToday())) : null
    },

    // Den vægt der vises og regnes med: den seneste vejning
    currentWeight() {
      const latest = this.latestWeight
      return latest ? Number(latest.kg) : null
    },

    // Ændring siden for en uge siden: den seneste vejning mod den nyeste
    // vejning, der ligger mindst 7 dage tidligere (null, hvis der ikke er en)
    weekChange() {
      const latest = this.latestWeight
      if (!latest) return null
      const end = parseDay(latest.measured_on)
      const previous = this.weighIns.find((w) => daysBetween(parseDay(w.measured_on), end) >= 7)
      return previous ? Math.round((Number(latest.kg) - Number(previous.kg)) * 10) / 10 : null
    },

    // Kg tabt fra startvægten til den seneste vejning
    weightLost() {
      const now = this.currentWeight
      const start = this.startWeight
      return now != null && start ? Math.round((start.kg - now) * 10) / 10 : null
    },

    // Hvor langt mod målvægten, i procent (0 % ved start, 100 % ved målet)
    weightProgress() {
      const now = this.currentWeight
      const start = this.startWeight
      const goal = this.goals.goal_kg
      if (!goal || !start || now == null) return null
      const total = start.kg - goal
      if (total <= 0) return null
      return Math.max(0, Math.min(100, Math.round(((start.kg - now) / total) * 100)))
    },

    // Kg der stadig mangler til målvægten
    weightToGo() {
      const now = this.currentWeight
      const goal = this.goals.goal_kg
      if (!goal || now == null) return null
      return Math.max(0, Math.round((now - goal) * 10) / 10)
    },

    // Dit faktiske daglige forbrug, regnet løbende ud fra de seneste ugers
    // logning og vejninger — se lib/burn.js for hvordan
    measuredBurn(state) {
      return estimateBurn(state.weights, state.entries)
    },

    // Kurven, som de sidste ugers MÅLINGER alene peger på. Kender kun den
    // bevægelse, der allerede er logget, så den er for pessimistisk lige efter
    // en omlagt rutine. Vises som kontrast til planen, ikke som planen selv.
    planMeasured(state) {
      const g = state.goals
      const burn = this.measuredBurn
      const atKg = this.currentWeight
      if (!g.plan_start_on || !g.plan_start_kg || !g.goal_kg || !g.loss_per_week) return null
      if (!burn.ready || !atKg) return null
      const curve = planCurve({
        start: { on: g.plan_start_on, kg: Number(g.plan_start_kg) },
        targetKg: Number(g.goal_kg),
        rate: Number(g.loss_per_week),
        burn: { kcal: burn.kcal, kg: atKg },
        movementPerKg: PLAN_PER_KG,
      })
      return curve.ready ? curve : null
    },

    // Det målte forbrug bagud i tid kender kun den bevægelse, der ALLEREDE er
    // logget. Har man lige lagt rutinen om, undervurderer det derfor forbruget
    // fremad. Her regnes forskellen ud: hvad planens time giver, minus hvad
    // bevægelsen faktisk gav i den periode, forbruget blev målt over.
    // Giver null, når forskellen er lille nok til ikke at betyde noget.
    planBoost(state) {
      const burn = this.measuredBurn
      const kg = this.currentWeight
      if (!burn.ready || !kg) return null
      const had = movementPerDay(state.movement, burn.from, burn.to, kg)
      const planned = planMovementPerDay(kg)
      const extra = Math.round(planned - had)
      if (extra < 50) return null
      return { extra, had: Math.round(had), planned: Math.round(planned), from: burn.from, to: burn.to }
    },

    // DIN PLAN: kurven, som den ser ud, når rutinen holdes. Det er den, alt
    // andet måles mod — det er jo den, du har sagt ja til. Er der ingen forskel
    // på rutinen og det målte, er de to ens.
    plan(state) {
      const g = state.goals
      const burn = this.measuredBurn
      const kg = this.currentWeight
      const boost = this.planBoost
      if (!g.plan_start_on || !g.plan_start_kg || !g.goal_kg || !g.loss_per_week) return null
      if (!burn.ready || !kg) return null
      if (!boost) return this.planMeasured
      const curve = planCurve({
        start: { on: g.plan_start_on, kg: Number(g.plan_start_kg) },
        targetKg: Number(g.goal_kg),
        rate: Number(g.loss_per_week),
        burn: { kcal: burn.kcal + boost.extra, kg },
        movementPerKg: PLAN_PER_KG,
      })
      return curve.ready ? curve : null
    },

    // Alt spist pr. dag, regnet én gang — saldoen nedenfor skal ellers løbe
    // entries igennem for hver eneste dag siden planen startede
    totalsByDay(state) {
      const out = {}
      for (const e of state.entries) out[e.eaten_on] = (out[e.eaten_on] || 0) + e.kcal
      return out
    },

    // Hygge-kontoen: hvor mange kalorier du har til gode i forhold til planen.
    //
    // Planen giver dig dit dagsmål PLUS hyggedagens tillæg hver dag, og regner
    // med en times bevægelse hver dag. Spiser du mindre, eller bevæger du dig
    // mere, står forskellen her — og kan bruges en anden dag uden at måldatoen
    // skrider. Er tallet negativt, er der brugt af fremtiden.
    //
    // Dage uden mad-logning springes over på mad-siden: en dag uden tal er
    // ukendt, ikke en dag uden mad. Bevægelse tælles derimod på alle dage, for
    // en dag uden kryds er en dag uden træning.
    planBalance(state) {
      const g = state.goals
      const kg = this.currentWeight
      if (!this.plan || !g.plan_start_on || !kg) return null
      const today = localToday()
      const totals = this.totalsByDay
      const plannedMove = planMovementPerDay(kg)
      const goalCache = {}
      let food = 0
      let move = 0
      let days = 0
      let loggedDays = 0
      let movedDays = 0
      // Dagsmålet står fast hele ugen, så det slås kun op én gang pr. uge
      for (let d = g.plan_start_on; d < today; d = addDays(d, 1)) {
        if (++days > 1200) break
        const wk = weekStart(d)
        if (!(wk in goalCache)) goalCache[wk] = this.goalFor(d)
        const goal = goalCache[wk]
        const eaten = totals[d] || 0
        if (eaten > 0) {
          loggedDays++
          food += goal + treatPerDay(goal, oneSessionKcal(kg)) - eaten
        }
        const moved = kcalForMovement(state.movement[d], kg)
        if (moved > 0) movedDays++
        move += moved - plannedMove
      }
      const total = Math.round(food + move)
      // Hvad saldoen er værd i TID: hver kalorie i overskud er en kalorie, der
      // ikke skal spares op senere, så måldatoen rykker sig tilsvarende
      const perDay = this.planDeficitPerDay
      return {
        total,
        food: Math.round(food),
        move: Math.round(move),
        days,
        loggedDays,
        movedDays,
        daysWon: perDay > 0 ? Math.round((total / perDay) * 10) / 10 : null,
      }
    },

    // Det underskud planen regner med pr. dag lige nu — altså hvor hurtigt
    // saldoen omsættes til dage på måldatoen
    planDeficitPerDay(state) {
      const kg = this.currentWeight
      const burn = this.measuredBurn
      const boost = this.planBoost
      if (!kg || !burn.ready) return 0
      const total = burn.kcal + (boost?.extra ?? 0)
      const goal = this.dailyGoal
      return Math.round(total - goal - treatPerDay(goal, oneSessionKcal(kg)))
    },

    // Det forbrug, planen regner med: det målte plus den del af rutinen, målingen
    // endnu ikke kender. Ét sted, så prislisten og kurven bruger samme tal.
    planBurn(state) {
      const burn = this.measuredBurn
      if (!burn.ready) return null
      return burn.kcal + (this.planBoost?.extra ?? 0)
    },

    // Prisliste: hvad hver ting koster eller vinder på måldatoen.
    //
    // Skelnen, der betyder alt: noget sker ÉN gang (en sprunget træning), og
    // noget sker HVER dag (man spiser 100 mere fremover). Det sidste er mange
    // gange dyrere, og det er svært at mærke, før man ser det.
    planPrices(state) {
      const g = state.goals
      const kg = this.currentWeight
      const burn = this.planBurn
      const curve = this.plan
      const perDay = this.planDeficitPerDay
      if (!curve?.arriveOn || !burn || !kg || !(perDay > 0)) return null

      const one = oneSessionKcal(kg)
      const treat = treatPerDay(this.dailyGoal, one)
      const base = Date.parse(curve.arriveOn)

      // Varige ændringer: kør kurven igen med et andet dagligt regnskab
      const shifted = (delta) => {
        const c = planCurve({
          start: { on: g.plan_start_on, kg: Number(g.plan_start_kg) },
          targetKg: Number(g.goal_kg),
          rate: Number(g.loss_per_week),
          burn: { kcal: burn + delta, kg },
          movementPerKg: PLAN_PER_KG,
        })
        if (!c.arriveOn) return null
        return Math.round((Date.parse(c.arriveOn) - base) / 86400000)
      }

      // Engangs-ting: kalorierne delt med dagens underskud
      const once = (kcal) => Math.round((kcal / perDay) * 10) / 10

      return {
        // Måneden måldatoen falder i — så overskriften kan sige, hvor lang
        // "resten af vejen" faktisk er
        until: curve.arriveOn,
        // Kalorierne er det egentlige. Tiden er bare den ene af to måder at
        // betale dem på — den anden er mindre mad, fordi appen sætter dagsmålet
        // ned, når forbrændingen falder.
        once: [
          { text: 'Én sprunget træning', kcal: -Math.round(one), days: once(one), bad: true },
          { text: 'Én ekstra time', kcal: Math.round(one), days: -once(one), bad: false },
          { text: 'Én dag 500 kcal over målet', kcal: -500, days: once(500), bad: true },
          { text: 'Én sprunget hyggedag', kcal: Math.round(treat * 14), days: -once(treat * 14), bad: false },
        ],
        daily: [
          { text: '100 kcal mere om dagen', kcal: -700, days: shifted(-100), bad: true },
          { text: '100 kcal mindre om dagen', kcal: 700, days: shifted(100), bad: false },
          { text: 'Syv timer om ugen i stedet for seks', kcal: Math.round(one), days: shifted(one / 7), bad: false },
          { text: 'Kun fem timer om ugen', kcal: -Math.round(one), days: shifted(-one / 7), bad: true },
        ],
      }
    },

    // Ugens bevægelse målt i TIMER, ikke i dage der tæller.
    //
    // Planen regner i kalorier pr. uge, ikke i hele dage, så det er også sådan
    // det skal vises. Tælles der dage, falder 45 minutters VR (238 kcal) under
    // dagsgrænsen (253) og bliver til nul — selvom den er 3/4 af en time. Det
    // er både forkert og nedslående. Ugen vises derfor som "2,8 af 6 timer".
    planWeek(state) {
      const kg = this.currentWeight
      const one = oneSessionKcal(kg)
      if (!kg || !(one > 0)) return null
      const start = weekStart(localToday())
      const today = localToday()
      let kcal = 0
      let days = 0
      for (const [date, entry] of Object.entries(state.movement)) {
        if (date < start || date > today) continue
        const v = kcalForMovement(entry, kg)
        if (v > 0) {
          kcal += v
          days++
        }
      }
      return {
        hours: Math.round((kcal / one) * 10) / 10,
        target: PLAN_DAYS_PER_WEEK,
        kcal: Math.round(kcal),
        targetKcal: Math.round(one * PLAN_DAYS_PER_WEEK),
        days,
        done: kcal >= one * PLAN_DAYS_PER_WEEK,
      }
    },

    // Ugens bevægelses-mål. Er der lagt en plan, er det PLANENS mål, der gælder,
    // så appen ikke står og siger to forskellige ting. Uden en plan gælder det
    // gamle, lempeligere kryds på 30 minutter.
    movementGoal(state) {
      const kg = this.currentWeight
      if (this.plan && kg) {
        return {
          fromPlan: true,
          daysPerWeek: PLAN_DAYS_PER_WEEK,
          sessionKcal: Math.round(oneSessionKcal(kg)),
          enoughKcal: Math.round(enoughKcal(kg)),
          done: (entry) => isHardEnough(entry, kg),
          toGo: (entry) => minutesToGo(entry, kg),
        }
      }
      return {
        fromPlan: false,
        daysPerWeek: MOVE_DAYS_PER_WEEK,
        minMinutes: MOVE_GOAL_MIN,
        done: (entry) => isDone(entry),
        toGo: (entry) => Math.max(0, MOVE_GOAL_MIN - (Number(entry?.minutes) || 0)),
      }
    },

    // Foran eller bagud i forhold til planen i dag
    planToday(state) {
      const curve = this.plan
      const kg = this.currentWeight
      if (!curve || !kg) return null
      return planStatus(curve, localToday(), kg)
    },

    // Det grundlag fiber-målet regnes ud fra: køn, og forbruget anslået ud fra
    // køn, vægt, højde og alder (null, når krops-tallene ikke er udfyldt)
    fiberBasis(state) {
      const kg = this.currentWeight
      return { ...state.profile, kg, kcalNeed: bodyBurn({ ...state.profile, kg }) }
    },

    // Dagens mål for protein, kulhydrat, fedt og fibre i gram: hendes egne tal,
    // ellers et udgangspunkt — protein/kulhydrat/fedt ud fra kalorie-målet
    // (25/45/30 % af kalorierne), fibre ud fra køn og kroppens forbrug
    macroGoals(state) {
      const defaults = defaultMacroGoals(this.dailyGoal, this.fiberBasis)
      const out = {}
      for (const k of MACROS) out[k] = state.goals[`${k}_goal`] ?? defaults[k]
      return out
    },

    // Protein, kulhydrat og fedt for en dag — og hvor mange af dagens
    // måltider der overhovedet havde tal for det
    macrosFor(state) {
      return (date) => sumMacros(state.entries.filter((e) => e.eaten_on === date))
    },

    todayMacros() {
      return this.macrosFor(localToday())
    },

    // Protein og fibre samlet over en periode (fra og med from, til og med to):
    // fået mod det, hun skulle have haft på de dage, der er logget — se lib/balance.js
    balanceBetween(state) {
      return (from, to) => balance(state.entries.filter((e) => e.eaten_on >= from && e.eaten_on <= to), this.macroGoals)
    },

    // Gram protein/fibre hun er bagud over de sidste 7 dage (ikke i dag) — så
    // forslaget kan blive stående dagen efter en dag, hvor det haltede
    carryBehind() {
      const today = localToday()
      const b = this.balanceBetween(addDays(today, -7), addDays(today, -1))
      const out = {}
      for (const k of REACH_GOALS) out[k] = Math.max(0, b[k].behind)
      return out
    },

    // Små sande beskeder "til dig" ud fra hendes egne tal, mest relevante
    // først — se lib/encourage.js. Beskeder hun har sagt "tak" til, holder pause
    notes(state) {
      const today = localToday()
      return encouragements({
        today,
        weighIns: [...this.weighIns].reverse(),
        entries: state.entries,
        dayBudget: this.dayBudget,
        goal: this.dailyGoal,
        burn: this.measuredBurn,
        movement: state.movement,
        weekBalance: this.balanceBetween(weekStart(today), today),
        lost: this.weightLost,
        hidden: state.noteHidden,
      })
    },

    // Den ene besked, der vises lige nu (null = ingen)
    currentNote() {
      return this.notes[0] ?? null
    },

    // Til hurtig logning: senest brugte øverst
    recentFoods(state) {
      return [...state.foods].sort((a, b) => {
        if (a.last_used_at && b.last_used_at) return a.last_used_at < b.last_used_at ? 1 : -1
        if (a.last_used_at) return -1
        if (b.last_used_at) return 1
        return a.name.localeCompare(b.name, 'da')
      })
    },

    // Til madlisten: alfabetisk
    foodsByName(state) {
      return [...state.foods].sort((a, b) => a.name.localeCompare(b.name, 'da'))
    },
  },

  actions: {
    persist() {
      save('cache', {
        foods: this.foods,
        entries: this.entries,
        weights: this.weights,
        goals: this.goals,
        celebrations: this.celebrations,
        profile: this.profile,
        dayActivity: this.dayActivity,
        movement: this.movement,
        notify: this.notify,
        nudgeHiddenOn: this.nudgeHiddenOn,
        noteHidden: this.noteHidden,
        dismissedStarters: this.dismissedStarters,
      })
    },

    queue(type, payload) {
      this.outbox.push({ opId: crypto.randomUUID(), type, payload, queuedAt: now() })
      save('outbox', this.outbox)
      this.flush()
    },

    // Tomme valgfrie felter udelades af payload, så en database uden de
    // nyeste kolonner ikke afviser almindelige varer og måltider
    foodPayload(food) {
      return withoutEmpty(food, ['per_unit', 'piece_size', 'protein', 'carbs', 'fat', 'fiber', 'barcode', 'ingredients'])
    },

    entryPayload(entry) {
      return withoutEmpty(entry, ['protein', 'carbs', 'fat', 'fiber'])
    },

    // protein/carbs/fat/fiber: gram på samme grundlag som kcal. barcode: så en
    // skannet vare genkendes næste gang. ingredients: sat når varen er en ret
    // bygget af flere varer ({ items, total_weight, portions })
    addFood({ name, kcal, per_unit = null, piece_size = null, protein = null, carbs = null, fat = null, fiber = null, barcode = null, ingredients = null }) {
      const food = {
        id: crypto.randomUUID(),
        name,
        kcal,
        per_unit,
        piece_size,
        protein,
        carbs,
        fat,
        fiber,
        barcode,
        ingredients,
        last_used_at: null,
        created_at: now(),
      }
      this.foods.push(food)
      this.persist()
      this.queue('upsert_food', this.foodPayload(food))
      return food
    },

    updateFood(id, { name, kcal, per_unit = null, piece_size = null, protein = null, carbs = null, fat = null, fiber = null, barcode = null, ingredients = null }) {
      const food = this.foods.find((f) => f.id === id)
      if (!food) return
      food.name = name
      food.kcal = kcal
      food.per_unit = per_unit
      food.piece_size = piece_size
      food.protein = protein
      food.carbs = carbs
      food.fat = fat
      food.fiber = fiber
      food.barcode = barcode
      food.ingredients = ingredients
      this.persist()
      this.queue('upsert_food', this.foodPayload(food))
    },

    deleteFood(id) {
      // Husk navnet, så en slettet standard-vare ikke foreslås igen
      const food = this.foods.find((f) => f.id === id)
      if (food) {
        const name = food.name.toLowerCase()
        if (!this.dismissedStarters.includes(name)) this.dismissedStarters.push(name)
      }
      this.foods = this.foods.filter((f) => f.id !== id)
      this.persist()
      this.queue('delete_food', { id })
    },

    // eaten_on kan gives, hvis man taster et glemt måltid ind på en tidligere
    // dag; ellers lander det på dagens lokale kalenderdag
    // protein/carbs/fat/fiber: de gram der faktisk blev spist (regnet ud af mængden)
    logEntry({ name, kcal, protein = null, carbs = null, fat = null, fiber = null, foodId = null, eaten_on = localToday() }) {
      const entry = {
        id: crypto.randomUUID(),
        food_name: name,
        kcal,
        protein,
        carbs,
        fat,
        fiber,
        eaten_on, // lokal kalenderdag — kl. 00:30 tæller stadig som "i nat"
        created_at: now(),
      }
      this.entries.push(entry)
      const food = foodId ? this.foods.find((f) => f.id === foodId) : null
      if (food) food.last_used_at = entry.created_at
      this.persist()
      this.queue('upsert_entry', this.entryPayload(entry))
      if (food) this.queue('upsert_food', this.foodPayload(food))
    },

    // Skjul forslagene (protein/fibre halter bagefter) for resten af dagen
    // "Tak" på en besked "til dig": den holder pause et par dage, så den næste kommer frem
    hideNote(key) {
      this.noteHidden = { ...this.noteHidden, [key]: localToday() }
      this.persist()
    },

    hideNudgeToday() {
      this.nudgeHiddenOn = localToday()
      this.persist()
    },

    deleteEntry(id) {
      this.entries = this.entries.filter((e) => e.id !== id)
      this.persist()
      this.queue('delete_entry', { id })
    },

    // Én vejning pr. dag — vejer hun sig igen samme dag, rettes dagens tal.
    // date kan gives, hvis man vil taste en tidligere vejning ind.
    logWeight(kg, date = localToday()) {
      let weight = this.weights.find((w) => w.measured_on === date)
      if (weight) {
        weight.kg = kg
      } else {
        weight = { id: crypto.randomUUID(), kg, measured_on: date, created_at: now() }
        this.weights.push(weight)
      }
      this.persist()
      this.queue('upsert_weight', { ...weight })
    },

    // Fjern en vejning helt, fx hvis den er taget på en anden vægt end den
    // normale. Et forkert tal er værre end intet tal: det trækker i både
    // ugeforskellen og i det målte forbrug.
    removeWeight(date) {
      const weight = this.weights.find((w) => w.measured_on === date)
      if (!weight) return
      this.weights = this.weights.filter((w) => w.measured_on !== date)
      this.persist()
      this.queue('delete_weight', { id: weight.id, date })
    },

    setGoals(changes) {
      this.goals = { ...this.goals, ...changes }
      this.persist()
      // Alle felter sendes — også tomme, så et slettet protein-mål også
      // nulstilles på serveren (kræver at databasen har de nye kolonner)
      this.queue('upsert_goals', { ...this.goals })
    },

    // Krops-tal — gemmes lokalt og sendes op, så de matcher på alle enheder
    setProfile(changes) {
      this.profile = { ...this.profile, ...changes }
      this.persist()
      this.queue('upsert_profile', { ...this.profile })
    },

    // Sæt (eller ryd) aktiviteten for en enkelt dag. Svarer valget til dit
    // generelle niveau, fjernes markeringen igen — så følger dagen bare det
    // generelle niveau uden ekstra plads.
    setDayActivity(date, level) {
      const next = { ...this.dayActivity }
      const had = date in next
      if (!level || level === this.profile.activity) {
        delete next[date]
        this.dayActivity = next
        this.persist()
        if (had) this.queue('delete_day_activity', { date })
      } else {
        next[date] = level
        this.dayActivity = next
        this.persist()
        this.queue('upsert_day_activity', { date, level })
      }
    },

    // Læg minutter TIL dagens bevægelse i stedet for at erstatte dem. To gange
    // 30 minutter er også en time, og man logger den anden tur senere på dagen.
    // Er slagsen en anden end den, der står, gemmes begge, fx "vr og gåtur".
    addMovement(date, minutes, kind = null) {
      const n = Math.round(Number(minutes))
      if (!(n > 0)) return
      const had = this.movement[date]
      if (!had) return this.setMovement(date, n, kind)
      const total = (Math.round(Number(had.minutes)) || 0) + n
      // Slagsene samles uden gentagelser: to gåture samme dag er stadig "gang"
      const parts = String(had.kind || '')
        .split(' og ')
        .map((k) => k.trim())
        .filter(Boolean)
      const next = String(kind || '').trim()
      if (next && !parts.includes(next)) parts.push(next)
      this.setMovement(date, total, parts.join(' og ') || null)
    },

    // Sæt (eller ryd, med minutes = null) dagens bevægelse: minutter og evt. slags
    setMovement(date, minutes, kind = null) {
      const next = { ...this.movement }
      const had = date in next
      const n = Math.round(Number(minutes))
      if (!n || n <= 0) {
        delete next[date]
        this.movement = next
        this.persist()
        if (had) this.queue('delete_movement', { date })
      } else {
        next[date] = { minutes: n, kind: kind || null }
        this.movement = next
        this.persist()
        this.queue('upsert_movement', { date, minutes: n, kind: kind || null })
      }
    },

    // Fast notifikation med dagens kalorier — til/fra pr. enhed (kun lokalt)
    setNotify(on) {
      this.notify = on
      this.persist()
    },

    // Slå hyggedag til/fra for en dato — over-farven på den dag dæmpes så en
    // planlagt festdag ikke ser ud som en fejl
    toggleCelebration(date) {
      const existing = this.celebrations.find((c) => c.date === date)
      if (existing) {
        this.celebrations = this.celebrations.filter((c) => c.date !== date)
        this.persist()
        this.queue('delete_celebration', { id: existing.id })
      } else {
        const celebration = { id: crypto.randomUUID(), date }
        this.celebrations.push(celebration)
        this.persist()
        this.queue('upsert_celebration', { ...celebration })
      }
    },

    reset() {
      this.foods = []
      this.entries = []
      this.weights = []
      this.goals = { kcal_goal: 1500, goal_kg: null, protein_goal: null, carbs_goal: null, fat_goal: null, fiber_goal: null, loss_per_week: null, plan_start_on: null, plan_start_kg: null }
      this.celebrations = []
      this.profile = { height_cm: null, age: null, sex: null, activity: null }
      this.dayActivity = {}
      this.movement = {}
      this.notify = false
      this.nudgeHiddenOn = null
      this.noteHidden = {}
      this.dismissedStarters = []
      this.outbox = []
      remove('cache')
      remove('outbox')
    },

    // Send køen, én ændring ad gangen, ældste først
    async flush() {
      if (this.flushing) return
      this.flushing = true
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        while (this.outbox.length) {
          const op = this.outbox[0]
          let result
          try {
            result = await this.send(op)
          } catch {
            return // ingen net — køen venter til næste forsøg
          }
          if (result.error) {
            const { error, status } = result
            if (status === 401 || error.code === 'PGRST301') return // session udløbet — vent på nyt login
            if (!error.code) return // intet svar fra serveren — sandsynligvis netværk
            // Serveren har aktivt afvist ændringen — den bliver aldrig god,
            // så den droppes for ikke at blokere resten af køen
            console.warn('foodie: server afviste en ændring, springer den over', op, error)
          }
          this.outbox.shift()
          save('outbox', this.outbox)
        }

        await this.refresh()
      } finally {
        this.flushing = false
      }
    },

    send(op) {
      switch (op.type) {
        case 'upsert_food':
          return supabase.from('foods').upsert(op.payload)
        case 'delete_food':
          return supabase.from('foods').delete().eq('id', op.payload.id)
        case 'upsert_entry':
          return supabase.from('entries').upsert(op.payload)
        case 'delete_entry':
          return supabase.from('entries').delete().eq('id', op.payload.id)
        case 'upsert_weight':
          return supabase.from('weights').upsert(op.payload)
        case 'delete_weight':
          // Slet på dato, ikke på id — en vejning tastet på to enheder kan
          // have fået hvert sit id, og der må kun være én pr. dag
          return supabase.from('weights').delete().eq('measured_on', op.payload.date)
        case 'upsert_goals':
          // Én række pr. bruger — databasen sætter selv user_id ud fra login
          return supabase.from('goals').upsert(op.payload, { onConflict: 'user_id' })
        case 'upsert_celebration':
          return supabase.from('celebrations').upsert(op.payload)
        case 'delete_celebration':
          return supabase.from('celebrations').delete().eq('id', op.payload.id)
        case 'upsert_profile':
          // Én række pr. bruger — databasen sætter selv user_id ud fra login
          return supabase.from('profiles').upsert(op.payload, { onConflict: 'user_id' })
        case 'upsert_day_activity':
          // Én række pr. dag — databasen sætter selv user_id ud fra login
          return supabase.from('day_activity').upsert(op.payload, { onConflict: 'user_id,date' })
        case 'delete_day_activity':
          return supabase.from('day_activity').delete().eq('date', op.payload.date)
        case 'upsert_movement':
          // Én række pr. dag — databasen sætter selv user_id ud fra login
          return supabase.from('movement').upsert(op.payload, { onConflict: 'user_id,date' })
        case 'delete_movement':
          return supabase.from('movement').delete().eq('date', op.payload.date)
        default:
          return { error: { code: 'unknown_op' } }
      }
    },

    // Hent alt fra serveren og erstat cachen — men KUN når køen er tom,
    // ellers ville usendte ændringer forsvinde fra skærmen
    async refresh() {
      if (this.outbox.length) return
      try {
        const [foods, entries, weights, goals, celebrations, profiles, dayActivity, movement] = await Promise.all([
          supabase.from('foods').select('*'),
          supabase.from('entries').select('*'),
          supabase.from('weights').select('*'),
          supabase.from('goals').select('*'),
          supabase.from('celebrations').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('day_activity').select('*'),
          supabase.from('movement').select('*'),
        ])
        if (foods.error || entries.error) return
        this.foods = foods.data
        this.entries = entries.data
        // De nye tabeller kan mangle i en ældre database — så beholdes de lokale tal
        if (!weights.error) this.weights = weights.data
        if (!celebrations.error) this.celebrations = celebrations.data
        if (!goals.error && goals.data.length) {
          const g = goals.data[0]
          this.goals = {
            kcal_goal: g.kcal_goal,
            goal_kg: g.goal_kg,
            protein_goal: g.protein_goal ?? null,
            carbs_goal: g.carbs_goal ?? null,
            fat_goal: g.fat_goal ?? null,
            fiber_goal: g.fiber_goal ?? null,
            loss_per_week: g.loss_per_week ?? null,
            plan_start_on: g.plan_start_on ?? null,
            plan_start_kg: g.plan_start_kg ?? null,
          }
        }
        // Krops-tal: behold et lokalt tal, hvor serveren ikke har nogen — så et
        // tal tastet her ikke forsvinder, før det er nået at blive sendt op
        if (!profiles.error && profiles.data.length) {
          const p = profiles.data[0]
          this.profile = {
            height_cm: p.height_cm ?? this.profile.height_cm,
            age: p.age ?? this.profile.age,
            sex: p.sex ?? this.profile.sex,
            activity: p.activity ?? this.profile.activity,
          }
        }
        // Dag-aktivitet: læg serverens dage oveni de lokale (serveren vinder pr. dag)
        if (!dayActivity.error) {
          const serverDays = Object.fromEntries(dayActivity.data.map((d) => [d.date, d.level]))
          this.dayActivity = { ...this.dayActivity, ...serverDays }
        }
        // Bevægelse: samme princip — serverens dage lægges oveni de lokale
        if (!movement.error) {
          const serverDays = Object.fromEntries(movement.data.map((m) => [m.date, { minutes: m.minutes, kind: m.kind ?? null }]))
          this.movement = { ...this.movement, ...serverDays }
        }
        this.persist()
      } catch {
        /* offline — cachen gælder stadig */
      }
    },
  },
})
