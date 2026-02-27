/**
 * PWA Icon Generation Script
 *
 * Generates PNG icons at all required sizes from the source SVG.
 *
 * Prerequisites:
 *   npm install sharp (add as devDependency)
 *
 * Usage:
 *   npx tsx scripts/generate-icons.ts
 *
 * This script reads the source SVG icon at public/icons/icon.svg and
 * produces PNG files at every size referenced in public/manifest.json.
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_SVG = path.resolve(__dirname, '../public/icons/icon.svg');
const OUTPUT_DIR = path.resolve(__dirname, '../public/icons');

async function generateIcons() {
  // Ensure the output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(SOURCE_SVG);

  console.log(`Generating PWA icons from: ${SOURCE_SVG}`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Created icon-${size}.png (${size}x${size})`);
  }

  console.log('\nAll icons generated successfully.');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
