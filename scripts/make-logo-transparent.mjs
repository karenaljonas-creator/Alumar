import fs from "node:fs"
import zlib from "node:zlib"

const SRC = "public/images/atlas-copco-logo.png"
const OUT = "public/images/atlas-copco-logo-clean.png"

// ---- CRC32 ----
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---- Decode PNG ----
const buf = fs.readFileSync(SRC)
let pos = 8
let w, h, colorType, bitDepth
const idat = []
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos)
  const type = buf.toString("ascii", pos + 4, pos + 8)
  const data = buf.slice(pos + 8, pos + 8 + len)
  if (type === "IHDR") {
    w = data.readUInt32BE(0)
    h = data.readUInt32BE(4)
    bitDepth = data[8]
    colorType = data[9]
  } else if (type === "IDAT") {
    idat.push(data)
  } else if (type === "IEND") break
  pos += 12 + len
}
if (bitDepth !== 8) throw new Error("bitDepth != 8 nao suportado: " + bitDepth)
const srcChannels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
const raw = zlib.inflateSync(Buffer.concat(idat))
const stride = w * srcChannels

// unfilter -> RGBA
const rgba = Buffer.alloc(w * h * 4)
let prev = Buffer.alloc(stride)
for (let y = 0; y < h; y++) {
  const ft = raw[y * (stride + 1)]
  const line = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
  const cur = Buffer.alloc(stride)
  for (let x = 0; x < stride; x++) {
    const a = x >= srcChannels ? cur[x - srcChannels] : 0
    const b = prev[x]
    const c = x >= srcChannels ? prev[x - srcChannels] : 0
    let v = line[x]
    if (ft === 1) v = (v + a) & 255
    else if (ft === 2) v = (v + b) & 255
    else if (ft === 3) v = (v + ((a + b) >> 1)) & 255
    else if (ft === 4) {
      const p = a + b - c
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
      const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      v = (v + pr) & 255
    }
    cur[x] = v
  }
  for (let x = 0; x < w; x++) {
    const si = x * srcChannels
    const di = (y * w + x) * 4
    rgba[di] = cur[si]
    rgba[di + 1] = cur[si + 1]
    rgba[di + 2] = cur[si + 2]
    rgba[di + 3] = srcChannels === 4 ? cur[si + 3] : 255
  }
  prev = cur
}

// ---- Chroma key: fundo azul -> transparente, mantém prata/branco ----
for (let i = 0; i < w * h; i++) {
  const di = i * 4
  const r = rgba[di], g = rgba[di + 1], b = rgba[di + 2]
  // azul-ciano do fundo: canal azul e verde dominam sobre o vermelho
  const blueness = b - r
  const cyanness = g - r
  // prata/branco: canais parecidos (baixa diferença azul-vermelho)
  if (blueness > 22 || (cyanness > 22 && b > r)) {
    // pixel de fundo -> transparente
    rgba[di + 3] = 0
  } else if (blueness > 10) {
    // borda anti-aliased -> alfa parcial proporcional
    const t = (blueness - 10) / 12
    rgba[di + 3] = Math.round(255 * (1 - Math.min(t, 1)))
  }
}

// ---- Encode RGBA PNG ----
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, "ascii")
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(w, 0)
ihdr.writeUInt32BE(h, 4)
ihdr[8] = 8 // bitDepth
ihdr[9] = 6 // colorType RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const outStride = w * 4
const rawOut = Buffer.alloc(h * (outStride + 1))
for (let y = 0; y < h; y++) {
  rawOut[y * (outStride + 1)] = 0 // filter none
  rgba.copy(rawOut, y * (outStride + 1) + 1, y * outStride, (y + 1) * outStride)
}
const compressed = zlib.deflateSync(rawOut, { level: 9 })
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const out = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))])
fs.writeFileSync(OUT, out)
console.log("OK ->", OUT, w + "x" + h)
