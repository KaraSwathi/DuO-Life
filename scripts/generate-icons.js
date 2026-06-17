#!/usr/bin/env node
/**
 * generate-icons.js
 * Run: node scripts/generate-icons.js
 * Requires: npm install -D sharp  (one-off, not in main deps)
 *
 * Alternatively, use https://realfavicongenerator.net or Figma to export
 * icons/icon-192.png and icons/icon-512.png into the public/icons/ folder.
 */
const fs   = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// Minimal SVG icon — replace with your real branded icon
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#6C63FF"/>
  <text x="${size/2}" y="${size * 0.68}" font-size="${size * 0.5}"
    text-anchor="middle" font-family="system-ui">💞</text>
</svg>`

try {
  const sharp = require('sharp')
  ;[192, 512].forEach(s => {
    sharp(Buffer.from(svg(s)))
      .png()
      .toFile(path.join(outDir, `icon-${s}.png`), (err) => {
        if (err) console.error(`icon-${s} failed:`, err.message)
        else      console.log(`✓ public/icons/icon-${s}.png`)
      })
  })
} catch {
  // fallback: write SVG files if sharp is not installed
  ;[192, 512].forEach(s => {
    fs.writeFileSync(path.join(outDir, `icon-${s}.png`), svg(s))
    console.log(`⚠ sharp not found — wrote SVG as icon-${s}.png (install sharp for real PNGs)`)
  })
}
