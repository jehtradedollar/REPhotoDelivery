// Draws simple placeholder photos for the demo seed and writes them to local
// storage with the same derivatives real uploads get (thumb, watermarked
// preview, MLS/web copy), so downloads, zips and property sites all work.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(process.env.LOCAL_STORAGE_DIR ?? ".uploads");

export async function writeLocal(key: string, data: Buffer) {
  const p = path.resolve(ROOT, key);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("Bad key");
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, data);
}

function rand(seed: number) {
  let x = seed * 9301 + 49297;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

const INTERIOR = /(kitchen|living|bed|bath|dining|room|office|laundry|entry)/;

/** An SVG scene: an exterior with sky and house, an interior room, or a landscape. */
export function sceneSvg(seed: number, name: string, w = 3000, h = 2000, kind?: "landscape") {
  const r = rand(seed + 7);
  const hue = Math.floor(r() * 360);
  if (kind === "landscape") {
    const ridge = Array.from({ length: 9 }, (_, i) => `${(i / 8) * w},${h * (0.45 + r() * 0.15)}`).join(" ");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${200 + r() * 30},70%,${55 + r() * 15}%)"/><stop offset="1" stop-color="hsl(${30 + r() * 20},80%,85%)"/></linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>
      <circle cx="${w * (0.2 + r() * 0.6)}" cy="${h * 0.25}" r="${h * 0.07}" fill="hsl(45,100%,90%)"/>
      <polygon points="0,${h} ${ridge} ${w},${h}" fill="hsl(${120 + r() * 60},25%,${35 + r() * 10}%)"/>
      <rect y="${h * 0.75}" width="${w}" height="${h * 0.25}" fill="hsl(${190 + r() * 20},45%,45%)"/>
    </svg>`;
  }
  if (INTERIOR.test(name)) {
    const wall = `hsl(${hue},${10 + r() * 15}%,${82 + r() * 8}%)`;
    const floor = `hsl(${25 + r() * 15},${30 + r() * 20}%,${45 + r() * 15}%)`;
    const wx = w * (0.15 + r() * 0.4);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="${wall}"/>
      <polygon points="0,${h * 0.7} ${w},${h * 0.7} ${w},${h} 0,${h}" fill="${floor}"/>
      <rect x="${wx}" y="${h * 0.18}" width="${w * 0.3}" height="${h * 0.38}" fill="hsl(205,70%,82%)" stroke="#fff" stroke-width="${w * 0.012}"/>
      <line x1="${wx + w * 0.15}" y1="${h * 0.18}" x2="${wx + w * 0.15}" y2="${h * 0.56}" stroke="#fff" stroke-width="${w * 0.008}"/>
      <rect x="${w * 0.08}" y="${h * 0.6}" width="${w * 0.34}" height="${h * 0.14}" rx="${h * 0.02}" fill="hsl(${hue + 180},${20 + r() * 20}%,${40 + r() * 20}%)"/>
      <rect x="${w * 0.6}" y="${h * 0.66}" width="${w * 0.22}" height="${h * 0.06}" fill="hsl(30,35%,35%)"/>
      <circle cx="${w * 0.88}" cy="${h * 0.6}" r="${h * 0.05}" fill="hsl(120,35%,38%)"/>
    </svg>`;
  }
  const body = `hsl(${hue},${15 + r() * 25}%,${70 + r() * 20}%)`;
  const roof = `hsl(${hue + 20},${15 + r() * 15}%,${25 + r() * 15}%)`;
  const hx = w * (0.22 + r() * 0.1);
  const hw = w * 0.5;
  const top = h * 0.38;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${205 + r() * 15},65%,${55 + r() * 15}%)"/><stop offset="1" stop-color="hsl(200,60%,88%)"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#s)"/>
    <rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="hsl(${95 + r() * 30},35%,${38 + r() * 10}%)"/>
    <rect x="${hx}" y="${top}" width="${hw}" height="${h * 0.36}" fill="${body}"/>
    <polygon points="${hx - w * 0.03},${top} ${hx + hw / 2},${h * 0.16} ${hx + hw + w * 0.03},${top}" fill="${roof}"/>
    <rect x="${hx + hw * 0.42}" y="${h * 0.52}" width="${hw * 0.16}" height="${h * 0.22}" fill="hsl(${hue + 150},30%,30%)"/>
    <rect x="${hx + hw * 0.1}" y="${h * 0.46}" width="${hw * 0.2}" height="${h * 0.12}" fill="hsl(205,60%,80%)" stroke="#fff" stroke-width="${w * 0.006}"/>
    <rect x="${hx + hw * 0.7}" y="${h * 0.46}" width="${hw * 0.2}" height="${h * 0.12}" fill="hsl(205,60%,80%)" stroke="#fff" stroke-width="${w * 0.006}"/>
    <circle cx="${w * 0.12}" cy="${h * 0.62}" r="${h * 0.14}" fill="hsl(120,30%,30%)"/>
    <circle cx="${w * 0.88}" cy="${h * 0.6}" r="${h * 0.12}" fill="hsl(130,30%,34%)"/>
  </svg>`;
}

function watermark(w: number, h: number, text: string) {
  const size = Math.round(Math.min(w, h) / 9);
  const rows = Array.from({ length: Math.ceil((h * 2) / (size * 3)) }, (_, i) => -h + i * size * 3)
    .map((y) => `<text x="0" y="${y}" font-family="Georgia, serif" font-weight="600" font-size="${size}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.32)" stroke="rgba(0,0,0,0.12)">${text}</text>`)
    .join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g transform="translate(${w / 2} ${h / 2}) rotate(-20)">${rows}</g></svg>`);
}

/** Render one photo and its derivatives; returns keys and sizes for the media row. */
export async function seedPhoto(prefix: string, seed: number, name: string, mark: string, kind?: "landscape") {
  const original = await sharp(Buffer.from(sceneSvg(seed, name, 3000, 2000, kind))).jpeg({ quality: 90 }).toBuffer();
  const thumb = await sharp(original).resize(640).jpeg({ quality: 80 }).toBuffer();
  const pv = await sharp(original).resize(1600).toBuffer();
  const meta = await sharp(pv).metadata();
  const preview = await sharp(pv)
    .composite([{ input: watermark(meta.width!, meta.height!, mark) }])
    .jpeg({ quality: 75 })
    .toBuffer();
  const web = await sharp(original).resize(2048).jpeg({ quality: 82 }).toBuffer();
  const keys = { storageKey: `${prefix}/original-${name}`, thumbKey: `${prefix}/thumb.jpg`, previewKey: `${prefix}/preview.jpg`, webKey: `${prefix}/web.jpg` };
  await Promise.all([writeLocal(keys.storageKey, original), writeLocal(keys.thumbKey, thumb), writeLocal(keys.previewKey, preview), writeLocal(keys.webKey, web)]);
  return { ...keys, sizeBytes: original.length, width: 3000, height: 2000 };
}

/** A one-page PDF floor plan. */
export function floorPlanPdf(title: string) {
  const content = `BT /F1 28 Tf 72 720 Td (${title.replace(/[()\\]/g, "")}) Tj ET 72 120 468 520 re S 72 380 m 300 380 l S 300 640 m 300 120 l S 300 300 m 540 300 l S`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

/** A simple wordmark logo as PNG. */
export async function logoPng(text: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160"><rect x="0" y="20" width="120" height="120" rx="24" fill="${color}"/><text x="60" y="102" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">${text[0]}</text><text x="148" y="104" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="700" fill="${color}">${text}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
