// Ripulisce il logo Librò: toglie il fondo bianco (che sull'app crema si vedeva
// come un riquadro), ritaglia i margini vuoti e genera le icone PWA.
// Uso: node scripts/logo-transparent.mjs
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'

const SRC = 'public/logo-original.png'
const OUT = 'public/logo.png'
const CREAM = { r: 0xf5, g: 0xf1, b: 0xe8, alpha: 1 }

// Primo giro: mette da parte l'originale, così lo script resta rieseguibile.
if (!existsSync(SRC)) copyFileSync(OUT, SRC)

// Un pixel è "fondo" quanto più è vicino al bianco puro: sotto LOW sparisce del
// tutto, sopra HIGH resta pieno, in mezzo l'alfa sfuma (bordi antialiasati).
const LOW = 10
const HIGH = 42

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = info
let minX = width, minY = height, maxX = -1, maxY = -1

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const dist = Math.max(255 - r, 255 - g, 255 - b)
  let a
  if (dist <= LOW) a = 0
  else if (dist >= HIGH) a = 255
  else a = Math.round(((dist - LOW) / (HIGH - LOW)) * 255)

  if (a === 0) {
    data[i] = data[i + 1] = data[i + 2] = 255
  } else if (a < 255) {
    // Scompone il colore osservato dal bianco su cui era stato composto.
    const f = 255 / a
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.max(0, Math.min(255, Math.round(255 + (data[i + c] - 255) * f)))
    }
  }
  data[i + 3] = a

  if (a > 8) {
    const px = (i / 4) % width
    const py = Math.floor(i / 4 / width)
    if (px < minX) minX = px
    if (px > maxX) maxX = px
    if (py < minY) minY = py
    if (py > maxY) maxY = py
  }
}

const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
const cleaned = sharp(data, { raw: { width, height, channels: 4 } }).extract(box)

// Logo per l'interfaccia: trasparente, largo 720px, ~30 volte più leggero.
await cleaned.clone().resize({ width: 720 }).png({ compressionLevel: 9 }).toFile(OUT)

// Icone PWA/favicon: quadrate, con lo stesso crema dell'app al posto del bianco.
for (const size of [512, 192]) {
  const inner = Math.round(size * 0.86)
  const logo = await cleaned.clone().resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(`public/icon-${size}.png`)
}

// Favicon: .ico con PNG dentro (16/32/48), così sostituisce quella di default di Next.
const icoSizes = [16, 32, 48]
const icoPngs = []
for (const size of icoSizes) {
  const inner = Math.round(size * 0.92)
  const logo = await cleaned.clone().resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer()
  icoPngs.push(await sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer())
}
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4)
let offset = 6 + 16 * icoSizes.length
const dir = icoSizes.map((size, i) => {
  const e = Buffer.alloc(16)
  e[0] = size === 256 ? 0 : size
  e[1] = size === 256 ? 0 : size
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(icoPngs[i].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += icoPngs[i].length
  return e
})
writeFileSync('src/app/favicon.ico', Buffer.concat([header, ...dir, ...icoPngs]))

const kb = (p) => Math.round(readFileSync(p).length / 1024)
console.log(`crop ${JSON.stringify(box)} da ${width}x${height}`)
console.log(`logo.png ${kb(OUT)}KB · icon-512 ${kb('public/icon-512.png')}KB · icon-192 ${kb('public/icon-192.png')}KB`)
