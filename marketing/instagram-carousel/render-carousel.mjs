import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(__dirname, "dist");

const fontSans = pathToFileURL(
  path.join(root, "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2")
).href;
const fontMono = pathToFileURL(
  path.join(
    root,
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2"
  )
).href;

const logoPath = `
  <path d="M16.5 9.4 7.55 4.24" />
  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  <polyline points="3.29 7 12 12 20.71 7" />
  <line x1="12" x2="12" y1="22" y2="12" />
`;

const slides = [
  {
    kicker: "Private AI agent registry",
    title: "Stop agent-tool sprawl.",
    body: "One approved place to publish, review, version, and install the capabilities your agents use.",
    mode: "hero",
    label: "intertool",
  },
  {
    kicker: "The problem",
    title: "Capabilities are scattered across every surface.",
    body: "Skills, MCP configs, prompts, and internal tools drift across editors, repos, docs, and personal folders.",
    mode: "sprawl",
  },
  {
    kicker: "The registry layer",
    title: "Publish once. Install from one governed source.",
    body: "Intertool centralizes skills, MCP servers, prompt templates, and agent tools behind a private control plane.",
    mode: "registry",
  },
  {
    kicker: "Governance",
    title: "Review before rollout.",
    body: "Route new capabilities through approval before they become team-installable.",
    mode: "review",
  },
  {
    kicker: "Version control",
    title: "Every capability gets history.",
    body: "Keep owners, status, versions, source metadata, package files, and audit trails attached to what people install.",
    mode: "versions",
  },
  {
    kicker: "Private by design",
    title: "Keep internal agent tools internal.",
    body: "Run self-hosted or in a private org path with S3-backed storage, OAuth, RBAC, and audit history.",
    mode: "private",
  },
  {
    kicker: "Pricing path",
    title: "Start open source. Scale into governance.",
    body: "Community is free self-hosted. Team Cloud starts at $199/month plus seats. Pro and Enterprise add deployment support.",
    mode: "pricing",
  },
  {
    kicker: "Call to action",
    title: "Give agents one source of truth.",
    body: "Deploy self-hosted, compare plans, or use Intertool as the private registry layer for your AI platform.",
    mode: "cta",
  },
];

function mark(className = "") {
  return `
    <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${logoPath}
    </svg>
  `;
}

function node(label, tone = "") {
  return `<div class="node ${tone}"><span></span>${label}</div>`;
}

function art(mode) {
  switch (mode) {
    case "hero":
      return `
        <div class="hero-mark">
          <div class="hero-box">${mark("hero-icon")}</div>
          <div class="hero-word">intertool</div>
        </div>
        <div class="ledger wide">
          <div><b>AI skills</b><span>reviewed</span></div>
          <div><b>MCP servers</b><span>private</span></div>
          <div><b>Prompts</b><span>versioned</span></div>
        </div>
      `;
    case "sprawl":
      return `
        <div class="scatter">
          ${node("Claude Code")}
          ${node("Codex", "offset")}
          ${node("Cursor", "hot")}
          ${node("Copilot", "offset")}
          ${node("Local files", "muted")}
          ${node("Slack snippets", "hot")}
        </div>
        <div class="risk-pill">no single source of truth</div>
      `;
    case "registry":
      return `
        <div class="registry-core">
          ${mark("core-icon")}
          <strong>intertool</strong>
          <span>private registry</span>
        </div>
        <div class="orbit o1">skills</div>
        <div class="orbit o2">MCP</div>
        <div class="orbit o3">prompts</div>
        <div class="orbit o4">tools</div>
      `;
    case "review":
      return `
        <div class="pipeline">
          <div><span>01</span><b>submit</b></div>
          <div><span>02</span><b>review</b></div>
          <div class="ok"><span>03</span><b>approve</b></div>
          <div class="ok"><span>04</span><b>install</b></div>
        </div>
      `;
    case "versions":
      return `
        <div class="version-stack">
          <div><span>v1.4.2</span><b>approved</b><em>owner / platform</em></div>
          <div><span>v1.4.1</span><b>archived</b><em>audit / retained</em></div>
          <div><span>v1.3.0</span><b>reviewed</b><em>source / attached</em></div>
        </div>
      `;
    case "private":
      return `
        <div class="vault">
          <div class="vault-door">${mark("vault-icon")}</div>
          <div class="vault-keys">
            <span>S3 storage</span>
            <span>OAuth</span>
            <span>RBAC</span>
            <span>audit log</span>
          </div>
        </div>
      `;
    case "pricing":
      return `
        <div class="price-grid">
          <div><span>Community</span><b>$0</b><em>self-hosted</em></div>
          <div class="featured"><span>Team Cloud</span><b>$199</b><em>+ seats</em></div>
          <div><span>Pro</span><b>$3k+</b><em>annual</em></div>
          <div><span>Enterprise</span><b>Custom</b><em>regulated teams</em></div>
        </div>
      `;
    case "cta":
      return `
        <div class="terminal">
          <span>$</span> npx intertool install @platform/review-audit
        </div>
        <div class="cta-grid">
          <div>Deploy self-hosted</div>
          <div>Compare plans</div>
          <div>Govern rollout</div>
        </div>
      `;
    default:
      return "";
  }
}

function slideHtml(slide, index) {
  const number = String(index + 1).padStart(2, "0");
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @font-face {
            font-family: "Geist";
            src: url("${fontSans}") format("woff2");
            font-weight: 100 900;
          }
          @font-face {
            font-family: "Geist Mono";
            src: url("${fontMono}") format("woff2");
            font-weight: 100 900;
          }
          * { box-sizing: border-box; }
          body { margin: 0; background: #050505; }
          .slide {
            position: relative;
            width: 1080px;
            height: 1080px;
            overflow: hidden;
            background:
              linear-gradient(to right, rgba(255,255,255,.055) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,.055) 1px, transparent 1px),
              #050505;
            background-size: 90px 90px;
            color: #f6f1e8;
            font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
          }
          .slide::before {
            content: "";
            position: absolute;
            inset: 64px;
            border: 1px solid rgba(246,241,232,.09);
            pointer-events: none;
          }
          .slide::after {
            content: "";
            position: absolute;
            right: -120px;
            top: 108px;
            width: 540px;
            height: 540px;
            border: 2px solid rgba(246,241,232,.055);
            transform: rotate(30deg);
            pointer-events: none;
          }
          .brand {
            position: absolute;
            top: 72px;
            left: 72px;
            right: 72px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 25px;
            letter-spacing: 0;
          }
          .brand-left {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .brand svg {
            width: 30px;
            height: 30px;
          }
          .num {
            color: rgba(246,241,232,.46);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 18px;
            letter-spacing: 0;
          }
          .copy {
            position: absolute;
            left: 72px;
            right: 72px;
            bottom: 78px;
            z-index: 2;
          }
          .kicker {
            margin: 0 0 24px;
            color: rgba(246,241,232,.5);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 19px;
            letter-spacing: 0;
            text-transform: uppercase;
          }
          h1 {
            max-width: 850px;
            margin: 0;
            font-size: 72px;
            line-height: 1;
            letter-spacing: 0;
            font-weight: 650;
          }
          p {
            max-width: 760px;
            margin: 34px 0 0;
            color: rgba(246,241,232,.68);
            font-size: 31px;
            line-height: 1.22;
            letter-spacing: 0;
          }
          .art {
            position: absolute;
            inset: 144px 72px 360px;
            z-index: 1;
          }
          .hero-mark {
            position: absolute;
            left: 0;
            top: 28px;
            display: flex;
            align-items: center;
            gap: 34px;
          }
          .hero-box {
            display: grid;
            place-items: center;
            width: 180px;
            height: 180px;
            border-radius: 18px;
            background: #f6f1e8;
            color: #050505;
          }
          .hero-icon { width: 92px; height: 92px; }
          .hero-word {
            font-size: 96px;
            font-weight: 660;
            letter-spacing: 0;
          }
          .ledger {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
          }
          .ledger div,
          .price-grid div,
          .version-stack div,
          .pipeline div,
          .cta-grid div {
            border: 1px solid rgba(246,241,232,.12);
            background: rgba(246,241,232,.035);
          }
          .ledger div {
            padding: 18px;
            min-height: 92px;
          }
          .ledger b,
          .ledger span {
            display: block;
          }
          .ledger b {
            margin-bottom: 12px;
            font-size: 20px;
            letter-spacing: 0;
          }
          .ledger span {
            color: #00d6aa;
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 15px;
          }
          .scatter {
            position: relative;
            width: 100%;
            height: 100%;
          }
          .scatter::before,
          .scatter::after {
            content: "";
            position: absolute;
            border-top: 1px solid rgba(246,241,232,.14);
            transform-origin: left center;
          }
          .scatter::before {
            left: 130px;
            top: 210px;
            width: 610px;
            transform: rotate(18deg);
          }
          .scatter::after {
            left: 110px;
            top: 86px;
            width: 700px;
            transform: rotate(-15deg);
          }
          .node {
            position: absolute;
            min-width: 190px;
            padding: 18px 20px;
            border: 1px solid rgba(246,241,232,.14);
            background: #090909;
            color: rgba(246,241,232,.82);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 18px;
          }
          .node span {
            display: inline-block;
            width: 11px;
            height: 11px;
            margin-right: 12px;
            border-radius: 50%;
            background: #00d6aa;
          }
          .node:nth-child(1) { left: 0; top: 30px; }
          .node:nth-child(2) { right: 90px; top: 78px; }
          .node:nth-child(3) { left: 270px; top: 170px; }
          .node:nth-child(4) { right: 0; top: 245px; }
          .node:nth-child(5) { left: 68px; bottom: 30px; }
          .node:nth-child(6) { left: 520px; bottom: 70px; }
          .node.hot span { background: #ffc94a; }
          .node.muted span { background: rgba(246,241,232,.28); }
          .risk-pill {
            position: absolute;
            right: 0;
            bottom: 0;
            padding: 16px 22px;
            border: 1px solid rgba(255,201,74,.35);
            color: #ffc94a;
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 16px;
          }
          .registry-core {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 300px;
            height: 210px;
            transform: translate(-50%, -50%);
            display: grid;
            place-items: center;
            border: 1px solid rgba(246,241,232,.18);
            background: #f6f1e8;
            color: #050505;
          }
          .core-icon { width: 54px; height: 54px; }
          .registry-core strong {
            margin-top: 8px;
            font-size: 40px;
            letter-spacing: 0;
          }
          .registry-core span {
            color: rgba(5,5,5,.55);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 14px;
          }
          .orbit {
            position: absolute;
            width: 170px;
            padding: 18px;
            border: 1px solid rgba(246,241,232,.14);
            background: rgba(246,241,232,.04);
            text-align: center;
            font-family: "Geist Mono", ui-monospace, monospace;
            color: rgba(246,241,232,.78);
            font-size: 18px;
          }
          .o1 { left: 80px; top: 30px; }
          .o2 { right: 92px; top: 34px; }
          .o3 { left: 100px; bottom: 34px; }
          .o4 { right: 76px; bottom: 30px; }
          .pipeline {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            align-items: stretch;
            height: 100%;
          }
          .pipeline div {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 24px;
            min-height: 300px;
          }
          .pipeline span {
            color: rgba(246,241,232,.4);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 18px;
          }
          .pipeline b {
            font-size: 31px;
            letter-spacing: 0;
          }
          .pipeline .ok {
            border-color: rgba(0,214,170,.45);
            color: #00d6aa;
          }
          .version-stack {
            display: grid;
            gap: 16px;
            padding-top: 20px;
          }
          .version-stack div {
            display: grid;
            grid-template-columns: 150px 1fr 220px;
            align-items: center;
            padding: 28px;
          }
          .version-stack span,
          .version-stack em,
          .terminal,
          .vault-keys span {
            font-family: "Geist Mono", ui-monospace, monospace;
          }
          .version-stack span {
            color: rgba(246,241,232,.48);
            font-size: 20px;
          }
          .version-stack b {
            color: #00d6aa;
            font-size: 28px;
            letter-spacing: 0;
          }
          .version-stack em {
            color: rgba(246,241,232,.44);
            font-size: 16px;
            font-style: normal;
            text-align: right;
          }
          .vault {
            position: relative;
            width: 100%;
            height: 100%;
          }
          .vault-door {
            position: absolute;
            left: 40px;
            top: 10px;
            width: 330px;
            height: 330px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(246,241,232,.14);
            background: rgba(246,241,232,.035);
          }
          .vault-icon { width: 150px; height: 150px; color: #00d6aa; }
          .vault-keys {
            position: absolute;
            right: 18px;
            top: 44px;
            display: grid;
            gap: 14px;
            width: 390px;
          }
          .vault-keys span {
            padding: 20px 24px;
            border: 1px solid rgba(246,241,232,.12);
            background: #090909;
            color: rgba(246,241,232,.72);
            font-size: 19px;
          }
          .price-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
          .price-grid div {
            min-height: 166px;
            padding: 22px;
          }
          .price-grid .featured {
            background: #f6f1e8;
            color: #050505;
          }
          .price-grid span,
          .price-grid em {
            display: block;
            color: rgba(246,241,232,.48);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 15px;
            font-style: normal;
          }
          .price-grid .featured span,
          .price-grid .featured em {
            color: rgba(5,5,5,.56);
          }
          .price-grid b {
            display: block;
            margin: 22px 0 9px;
            font-size: 44px;
            letter-spacing: 0;
          }
          .terminal {
            position: absolute;
            left: 0;
            right: 0;
            top: 84px;
            padding: 30px;
            border: 1px solid rgba(246,241,232,.14);
            background: #f6f1e8;
            color: #050505;
            font-size: 25px;
            white-space: nowrap;
          }
          .terminal span {
            color: rgba(5,5,5,.45);
          }
          .cta-grid {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 24px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
          }
          .cta-grid div {
            padding: 24px 18px;
            color: rgba(246,241,232,.74);
            font-size: 21px;
            letter-spacing: 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <main class="slide">
          <div class="brand">
            <div class="brand-left">${mark()}<span>intertool</span></div>
            <div class="num">${number}/08</div>
          </div>
          <section class="art">${art(slide.mode)}</section>
          <section class="copy">
            <div class="kicker">${slide.kicker}</div>
            <h1>${slide.title}</h1>
            <p>${slide.body}</p>
          </section>
        </main>
      </body>
    </html>
  `;
}

async function contactSheetHtml(files) {
  const images = (
    await Promise.all(
      files.map(async (file, index) => {
        const dataUrl = `data:image/png;base64,${(
          await readFile(file)
        ).toString("base64")}`;
        return `
        <div>
          <img src="${dataUrl}" />
          <span>${String(index + 1).padStart(2, "0")}</span>
        </div>
      `;
      })
    )
  ).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            background: #050505;
            font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
          }
          .sheet {
            width: 2160px;
            height: 1080px;
            padding: 32px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            background: #050505;
          }
          div div {
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(246,241,232,.16);
          }
          img {
            display: block;
            width: 100%;
            height: 100%;
          }
          span {
            position: absolute;
            right: 12px;
            bottom: 10px;
            color: rgba(246,241,232,.62);
            font: 20px ui-monospace, monospace;
          }
        </style>
      </head>
      <body>
        <main class="sheet">${images}</main>
      </body>
    </html>
  `;
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const files = [];

try {
  for (const [index, slide] of slides.entries()) {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1080 },
      deviceScaleFactor: 1,
    });
    await page.setContent(slideHtml(slide, index), {
      waitUntil: "networkidle",
    });
    const file = path.join(
      outDir,
      `intertool-carousel-${String(index + 1).padStart(2, "0")}.png`
    );
    await page.locator(".slide").screenshot({ path: file });
    files.push(file);
    await page.close();
  }

  const contact = await browser.newPage({
    viewport: { width: 2160, height: 1080 },
    deviceScaleFactor: 1,
  });
  await contact.setContent(await contactSheetHtml(files), {
    waitUntil: "networkidle",
  });
  await contact.locator(".sheet").screenshot({
    path: path.join(outDir, "intertool-carousel-contact-sheet.png"),
  });
  await contact.close();
} finally {
  await browser.close();
}

await writeFile(
  path.join(outDir, "manifest.json"),
  JSON.stringify(
    {
      format: "Instagram carousel",
      size: "1080x1080",
      slides: files.map((file, index) => ({
        index: index + 1,
        file: path.relative(__dirname, file),
        title: slides[index].title,
      })),
    },
    null,
    2
  )
);

console.log(`Wrote ${files.length} carousel slides to ${outDir}`);
