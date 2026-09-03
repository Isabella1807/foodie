<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Fuldskærms-kamera, der leder efter en stregkode (EAN/UPC — dem på bagsiden
// af madvarer). Når den finder én, sendes koden op, og kameraet slukkes.
// Kan kameraet ikke bruges, kan tallene under stregkoden tastes i stedet.
const emit = defineEmits(['detected', 'cancel'])

const video = ref(null)
const status = ref('Starter kameraet…')
const failed = ref(false)
const manual = ref('')

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']
let stream = null
let timer = null
let stopped = false

async function start() {
  try {
    // Læseren hentes først, når den skal bruges — den fylder en del
    const { createDetector } = await import('../lib/barcode')
    const detector = await createDetector(FORMATS)
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    if (stopped) return stop()
    video.value.srcObject = stream
    await video.value.play()
    status.value = 'Hold stregkoden inden for rammen'
    tick(detector)
  } catch (err) {
    failed.value = true
    status.value =
      err?.name === 'NotAllowedError'
        ? 'Appen har ikke lov til at bruge kameraet. Giv lov i telefonens indstillinger — eller skriv tallene under stregkoden herunder.'
        : 'Kameraet kunne ikke startes. Skriv tallene under stregkoden herunder i stedet.'
  }
}

// Kig på et billede fra kameraet ca. 6 gange i sekundet, til der er en kode
async function tick(detector) {
  if (stopped) return
  try {
    if (video.value && video.value.readyState >= 2) {
      const codes = await detector.detect(video.value)
      const hit = codes.find((c) => c.rawValue)
      if (hit) return finish(hit.rawValue)
    }
  } catch {
    /* et enkelt billede kunne ikke læses — prøv igen */
  }
  timer = setTimeout(() => tick(detector), 150)
}

function finish(code) {
  stop()
  emit('detected', String(code).trim())
}

function stop() {
  stopped = true
  clearTimeout(timer)
  if (stream) stream.getTracks().forEach((t) => t.stop())
  stream = null
}

function submitManual() {
  const code = manual.value.replace(/\D/g, '')
  if (code.length >= 8) finish(code)
}

function cancel() {
  stop()
  emit('cancel')
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <Teleport to="body">
    <div class="scanner" role="dialog" aria-label="Skan stregkode">
      <video v-show="!failed" ref="video" class="scanner-video" playsinline muted autoplay></video>
      <div v-if="!failed" class="scanner-frame" aria-hidden="true"></div>

      <div class="scanner-panel">
        <p class="scanner-status">{{ status }}</p>
        <form class="scanner-manual" @submit.prevent="submitManual">
          <input
            v-model="manual"
            type="text"
            inputmode="numeric"
            placeholder="eller skriv tallene under stregkoden"
            aria-label="Stregkodens tal"
          />
          <button class="btn-primary" :disabled="manual.replace(/\D/g, '').length < 8">Slå op</button>
        </form>
        <button type="button" class="btn-ghost scanner-cancel" @click="cancel">Annullér</button>
      </div>
    </div>
  </Teleport>
</template>
