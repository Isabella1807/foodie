// Stregkode-læseren. Bruger telefonens indbyggede læser, hvis den findes og
// kan EAN-koder (Chrome på Android). Ellers en medfølgende udgave (ZXing som
// WebAssembly), som også virker på iPhone. Dens fil ligger med i appen, så
// den ikke skal hentes fra en fremmed server.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

export async function createDetector(formats) {
  const Native = globalThis.BarcodeDetector
  if (typeof Native === 'function') {
    try {
      const supported = await Native.getSupportedFormats()
      const usable = formats.filter((f) => supported.includes(f))
      if (usable.length) return new Native({ formats: usable })
    } catch {
      /* den indbyggede virker ikke her — brug den medfølgende */
    }
  }
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')
  prepareZXingModule({
    overrides: {
      locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
  })
  return new BarcodeDetector({ formats })
}
