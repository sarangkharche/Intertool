import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outRoot = path.join(__dirname, "dist");

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

const campaigns = [
  {
    slug: "01-agent-tool-sprawl",
    name: "Agent-Tool Sprawl",
    accent: "#00d6aa",
    caption:
      "AI agent capabilities are spreading faster than most teams can govern them. Skills, prompts, MCP servers, and internal tools end up in local folders, docs, Slack threads, and repo snippets. Intertool gives teams one approved registry for the capabilities agents actually use.",
    hashtags:
      "#AIEngineering #DeveloperTools #DevEx #AgenticAI #AIGovernance #PlatformEngineering #Intertool",
    slides: [
      {
        kicker: "Agent-tool sprawl",
        title: "Your agents are learning from scattered tools.",
        body: "Every copied prompt, skill, and config becomes a new place for drift.",
        visual: "scatter",
        items: ["Claude", "Codex", "Cursor", "Copilot", "Slack", "Local"],
      },
      {
        kicker: "Hidden risk",
        title: "Nobody knows which capability is current.",
        body: "Teams need one reviewed source before capabilities spread across editors.",
        visual: "status",
        items: ["unknown", "stale", "duplicated", "unowned"],
      },
      {
        kicker: "Control plane",
        title: "Intertool turns fragments into a registry.",
        body: "Publish skills, MCP servers, prompts, and tools in one approved place.",
        visual: "hub",
        items: ["skills", "MCP", "prompts", "tools"],
      },
      {
        kicker: "Install path",
        title: "Developers install what the team approved.",
        body: "Approved commands replace guesswork and copied local files.",
        visual: "terminal",
        command: "npx intertool install @platform/review-audit",
      },
      {
        kicker: "Governance",
        title: "Owners, status, and review travel with the artifact.",
        body: "Every capability has context before an agent can run it.",
        visual: "record",
        items: ["owner", "status", "version", "files"],
      },
      {
        kicker: "CTA",
        title: "Stop sprawl before it becomes production risk.",
        body: "Use Intertool as the private registry layer for agent capabilities.",
        visual: "cta",
      },
    ],
  },
  {
    slug: "02-private-mcp-registry",
    name: "Private MCP Registry",
    accent: "#7dd3fc",
    caption:
      "Public discovery is not the same thing as private governance. Internal MCP servers need owners, status, review, and approved install paths. Intertool gives teams a private registry for MCP servers and the rest of their agent capability stack.",
    hashtags:
      "#MCP #ModelContextProtocol #DeveloperTools #DevEx #AIGovernance #AIInfrastructure #Intertool",
    slides: [
      {
        kicker: "Private MCP",
        title: "Internal MCP servers need a private registry.",
        body: "Your most useful servers are often the ones that should never be public.",
        visual: "vault",
      },
      {
        kicker: "Catalog",
        title: "List servers with owners, status, and scope.",
        body: "Give developers discovery without turning private configs into tribal knowledge.",
        visual: "catalog",
        items: ["github-internal", "billing-readonly", "deploy-status"],
      },
      {
        kicker: "Review",
        title: "Approve the server before it reaches the team.",
        body: "MCP access becomes a workflow, not a copied JSON blob.",
        visual: "pipeline",
        items: ["submit", "review", "approve", "install"],
      },
      {
        kicker: "Distribution",
        title: "One install path across agent surfaces.",
        body: "Claude, Codex, Cursor, Copilot, and custom clients can point to the same source.",
        visual: "surface",
        items: ["Claude", "Codex", "Cursor", "Copilot"],
      },
      {
        kicker: "Security",
        title: "Keep private tools out of public discovery.",
        body: "Use org-scoped access, private storage, and audit history.",
        visual: "shield",
        items: ["OAuth", "RBAC", "S3", "audit"],
      },
      {
        kicker: "CTA",
        title: "Make MCP discoverable inside your company.",
        body: "Intertool is the private catalog for your agent infrastructure.",
        visual: "cta",
      },
    ],
  },
  {
    slug: "03-review-before-rollout",
    name: "Review Before Rollout",
    accent: "#facc15",
    caption:
      "Agent tools should not become team-installable just because someone copied a config. Intertool adds a review path: submit, inspect, approve, and distribute with a clean audit trail.",
    hashtags:
      "#AIGovernance #EngineeringLeadership #PlatformEngineering #DeveloperExperience #AgenticAI #Intertool",
    slides: [
      {
        kicker: "Rollout control",
        title: "Agent capabilities deserve code-review energy.",
        body: "If a capability can shape output, it needs review before rollout.",
        visual: "reviewHero",
      },
      {
        kicker: "Step 01",
        title: "Submit the capability.",
        body: "A skill, MCP server, prompt, or tool enters the review queue.",
        visual: "record",
        items: ["type", "owner", "source", "files"],
      },
      {
        kicker: "Step 02",
        title: "Inspect risk and intent.",
        body: "Reviewers see metadata, package files, source context, and install behavior.",
        visual: "matrix",
        items: ["metadata", "package", "source", "install"],
      },
      {
        kicker: "Step 03",
        title: "Approve, reject, or archive.",
        body: "Status becomes explicit instead of living in a chat thread.",
        visual: "pipeline",
        items: ["review", "reject", "approve", "archive"],
      },
      {
        kicker: "Step 04",
        title: "Publish the approved install command.",
        body: "Developers get a clean path to the exact capability version.",
        visual: "terminal",
        command: "npx intertool install @team/mcp-github",
      },
      {
        kicker: "CTA",
        title: "Turn agent rollout into a governed workflow.",
        body: "Use Intertool to make approval visible, repeatable, and auditable.",
        visual: "cta",
      },
    ],
  },
  {
    slug: "04-version-audit-history",
    name: "Version And Audit History",
    accent: "#c084fc",
    caption:
      "If agents can run it, teams need to know who owns it, what changed, and which version people installed. Intertool keeps capability history attached to every skill, prompt, MCP server, and internal tool.",
    hashtags:
      "#DevEx #AIOps #AIGovernance #DeveloperTools #PlatformEngineering #SoftwareEngineering #Intertool",
    slides: [
      {
        kicker: "Version history",
        title: "Agent capabilities change. History should not disappear.",
        body: "Prompts, skills, tools, and MCP servers need traceability.",
        visual: "timeline",
      },
      {
        kicker: "Metadata",
        title: "Attach ownership to every artifact.",
        body: "Owner, status, version, source, and files travel together.",
        visual: "record",
        items: ["owner", "version", "status", "source"],
      },
      {
        kicker: "Changelog",
        title: "Know what changed before people install it.",
        body: "Version notes make agent behavior easier to explain later.",
        visual: "versions",
      },
      {
        kicker: "Audit",
        title: "Approvals become events, not memories.",
        body: "Review and rollout decisions stay visible to platform teams.",
        visual: "audit",
        items: ["submitted", "reviewed", "approved", "installed"],
      },
      {
        kicker: "Compare",
        title: "Diff versions before the next rollout.",
        body: "Treat agent capabilities like operational software.",
        visual: "diff",
      },
      {
        kicker: "CTA",
        title: "Give every capability a paper trail.",
        body: "Intertool keeps history close to what developers install.",
        visual: "cta",
      },
    ],
  },
  {
    slug: "05-rollout-pricing-path",
    name: "Rollout And Pricing Path",
    accent: "#fb923c",
    caption:
      "Start with a free self-hosted registry. Add managed workflows, deployment support, and enterprise governance when agent capabilities become company infrastructure.",
    hashtags:
      "#OpenSource #SaaS #DeveloperTools #AIInfrastructure #PlatformEngineering #DevEx #Intertool",
    slides: [
      {
        kicker: "Rollout path",
        title: "Start free. Scale when governance matters.",
        body: "Intertool pricing follows the way engineering teams adopt internal platforms.",
        visual: "pricingPath",
      },
      {
        kicker: "Community",
        title: "$0 self-hosted registry.",
        body: "For individuals and small teams standardizing local agent workflows.",
        visual: "plan",
        items: ["single registry", "S3 storage", "CLI install", "GitHub OAuth"],
      },
      {
        kicker: "Team Cloud",
        title: "$199/month plus seats.",
        body: "Managed hosting, org paths, review queue, audit log, and onboarding.",
        visual: "planFeatured",
        items: ["managed hosting", "members", "review queue", "audit log"],
      },
      {
        kicker: "Self-hosted Pro",
        title: "$3k+ annual support.",
        body: "Private deployment help, governance setup, security review, and upgrades.",
        visual: "plan",
        items: ["deployment", "governance", "security", "upgrades"],
      },
      {
        kicker: "Enterprise",
        title: "Custom for regulated teams.",
        body: "Policy design, procurement support, retention requirements, and rollout planning.",
        visual: "planFeatured",
        items: ["policy", "procurement", "retention", "rollout"],
      },
      {
        kicker: "CTA",
        title: "Choose the path that matches your rollout.",
        body: "Deploy self-hosted today or compare plans when the registry becomes infrastructure.",
        visual: "cta",
      },
    ],
  },
];

function mark(className = "") {
  return `
    <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${logoPath}
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function chip(label, tone = "") {
  return `<div class="chip ${tone}"><span></span>${escapeHtml(label)}</div>`;
}

function art(slide) {
  const items = slide.items ?? [];
  switch (slide.visual) {
    case "scatter":
      return `
        <div class="scatter-lines"></div>
        <div class="scatter">
          ${items.map((item, index) => chip(item, index % 3 === 1 ? "warm" : index % 3 === 2 ? "muted" : "")).join("")}
        </div>
      `;
    case "status":
      return `
        <div class="status-grid">
          ${items.map((item, index) => `<div><em>0${index + 1}</em><strong>${escapeHtml(item)}</strong></div>`).join("")}
        </div>
        <div class="warning">no approved source</div>
      `;
    case "hub":
      return `
        <div class="hub">
          <div class="hub-core">${mark("hub-icon")}<strong>intertool</strong><span>private registry</span></div>
          ${items.map((item, index) => `<div class="orbit orbit-${index + 1}">${escapeHtml(item)}</div>`).join("")}
        </div>
      `;
    case "terminal":
      return `<div class="terminal"><span>$</span> ${escapeHtml(slide.command)}</div><div class="signal-row"><b>approved</b><b>versioned</b><b>installable</b></div>`;
    case "record":
      return `<div class="record">${items.map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item)}</strong><em>attached</em></div>`).join("")}</div>`;
    case "vault":
      return `<div class="vault">${mark("vault-icon")}<div class="vault-ring"></div></div><div class="vault-label">private by default</div>`;
    case "catalog":
      return `<div class="catalog">${items.map((item, index) => `<div><span>server.0${index + 1}</span><strong>${escapeHtml(item)}</strong><em>${index === 0 ? "approved" : index === 1 ? "review" : "private"}</em></div>`).join("")}</div>`;
    case "pipeline":
      return `<div class="pipeline">${items.map((item, index) => `<div class="${index >= 2 ? "ok" : ""}"><span>0${index + 1}</span><strong>${escapeHtml(item)}</strong></div>`).join("")}</div>`;
    case "surface":
      return `<div class="surfaces">${items.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div><div class="throughline"></div>`;
    case "shield":
      return `<div class="shield">${mark("shield-icon")}</div><div class="shield-list">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
    case "reviewHero":
      return `<div class="review-card"><span>pending</span><strong>@platform/security-scan</strong><em>needs review before rollout</em></div><div class="review-card approved"><span>approved</span><strong>@team/review-audit</strong><em>installable</em></div>`;
    case "matrix":
      return `<div class="matrix">${items.map((item, index) => `<div><span>check ${index + 1}</span><strong>${escapeHtml(item)}</strong></div>`).join("")}</div>`;
    case "timeline":
      return `<div class="timeline">${["v1.0", "v1.2", "v1.4", "v2.0"].map((item) => `<div><span></span><strong>${item}</strong></div>`).join("")}</div>`;
    case "versions":
      return `<div class="versions"><div><span>v1.4.2</span><b>approved</b><em>new MCP config</em></div><div><span>v1.4.1</span><b>archived</b><em>prompt update</em></div><div><span>v1.3.0</span><b>reviewed</b><em>skill package</em></div></div>`;
    case "audit":
      return `<div class="audit">${items.map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item)}</strong><em>event recorded</em></div>`).join("")}</div>`;
    case "diff":
      return `<div class="diff"><div><span>- old</span><p>local prompt copied from chat</p></div><div><span>+ new</span><p>approved capability with owner and version</p></div></div>`;
    case "pricingPath":
      return `<div class="price-path"><div>$0</div><div>$199</div><div>$3k+</div><div>Custom</div></div>`;
    case "plan":
    case "planFeatured":
      return `<div class="plan ${slide.visual === "planFeatured" ? "featured" : ""}">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
    case "cta":
      return `<div class="cta-mark">${mark("cta-icon")}<strong>intertool</strong></div><div class="cta-actions"><span>Deploy self-hosted</span><span>Compare plans</span><span>Govern rollout</span></div>`;
    default:
      return "";
  }
}

function slideHtml(campaign, slide, index) {
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
            --accent: ${campaign.accent};
            position: relative;
            width: 1080px;
            height: 1080px;
            overflow: hidden;
            background:
              linear-gradient(to right, rgba(246,241,232,.055) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(246,241,232,.055) 1px, transparent 1px),
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
          }
          .slide::after {
            content: "";
            position: absolute;
            right: -132px;
            top: 112px;
            width: 520px;
            height: 520px;
            border: 2px solid color-mix(in srgb, var(--accent) 18%, transparent);
            transform: rotate(30deg);
            opacity: .35;
          }
          .brand {
            position: absolute;
            top: 72px;
            left: 72px;
            right: 72px;
            z-index: 3;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 25px;
            font-weight: 540;
          }
          .brand-left {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .brand svg { width: 30px; height: 30px; }
          .num,
          .kicker,
          .chip,
          .terminal,
          .record span,
          .record em,
          .catalog span,
          .catalog em,
          .pipeline span,
          .matrix span,
          .timeline strong,
          .versions span,
          .versions em,
          .audit span,
          .audit em,
          .diff span,
          .plan span,
          .cta-actions span,
          .warning,
          .vault-label {
            font-family: "Geist Mono", ui-monospace, monospace;
          }
          .num {
            color: rgba(246,241,232,.42);
            font-size: 18px;
          }
          .art {
            position: absolute;
            inset: 146px 72px 392px;
            z-index: 1;
          }
          .copy {
            position: absolute;
            left: 72px;
            right: 72px;
            bottom: 74px;
            z-index: 2;
          }
          .kicker {
            margin-bottom: 22px;
            color: rgba(246,241,232,.52);
            font-size: 18px;
            text-transform: uppercase;
          }
          h1 {
            max-width: 850px;
            margin: 0;
            font-size: 66px;
            line-height: 1;
            font-weight: 660;
            letter-spacing: 0;
          }
          p {
            max-width: 780px;
            margin: 30px 0 0;
            color: rgba(246,241,232,.7);
            font-size: 29px;
            line-height: 1.22;
            letter-spacing: 0;
          }
          .scatter,
          .hub,
          .vault {
            position: relative;
            width: 100%;
            height: 100%;
          }
          .scatter-lines::before,
          .scatter-lines::after,
          .throughline {
            content: "";
            position: absolute;
            left: 110px;
            top: 160px;
            width: 700px;
            border-top: 1px solid rgba(246,241,232,.14);
            transform: rotate(-13deg);
          }
          .scatter-lines::after {
            top: 250px;
            transform: rotate(18deg);
          }
          .chip {
            position: absolute;
            min-width: 174px;
            padding: 18px 20px;
            border: 1px solid rgba(246,241,232,.14);
            background: rgba(246,241,232,.035);
            color: rgba(246,241,232,.82);
            font-size: 18px;
          }
          .chip span {
            display: inline-block;
            width: 10px;
            height: 10px;
            margin-right: 12px;
            border-radius: 50%;
            background: var(--accent);
          }
          .chip.warm span { background: #facc15; }
          .chip.muted span { background: rgba(246,241,232,.28); }
          .chip:nth-child(1) { left: 0; top: 28px; }
          .chip:nth-child(2) { left: 330px; top: 120px; }
          .chip:nth-child(3) { right: 10px; top: 70px; }
          .chip:nth-child(4) { right: 70px; bottom: 34px; }
          .chip:nth-child(5) { left: 70px; bottom: 26px; }
          .chip:nth-child(6) { left: 520px; bottom: 86px; }
          .status-grid,
          .record,
          .catalog,
          .pipeline,
          .matrix,
          .audit,
          .price-path,
          .surfaces {
            display: grid;
            gap: 14px;
          }
          .status-grid,
          .price-path,
          .surfaces {
            grid-template-columns: repeat(4, 1fr);
          }
          .status-grid div,
          .record div,
          .catalog div,
          .pipeline div,
          .matrix div,
          .audit div,
          .price-path div,
          .surfaces div,
          .plan span,
          .versions div,
          .diff div,
          .signal-row b,
          .cta-actions span {
            border: 1px solid rgba(246,241,232,.13);
            background: rgba(246,241,232,.035);
          }
          .status-grid div,
          .price-path div,
          .surfaces div {
            min-height: 240px;
            padding: 22px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .status-grid em {
            color: rgba(246,241,232,.38);
            font-style: normal;
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 16px;
          }
          .status-grid strong,
          .price-path div,
          .surfaces div {
            color: var(--accent);
            font-size: 25px;
            font-weight: 650;
          }
          .warning {
            position: absolute;
            right: 0;
            bottom: 0;
            padding: 16px 20px;
            border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
            color: var(--accent);
            font-size: 16px;
          }
          .hub-core,
          .cta-mark {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 300px;
            height: 210px;
            transform: translate(-50%, -50%);
            display: grid;
            place-items: center;
            background: #f6f1e8;
            color: #050505;
          }
          .hub-icon,
          .cta-icon {
            width: 54px;
            height: 54px;
          }
          .hub-core strong,
          .cta-mark strong {
            font-size: 39px;
            font-weight: 680;
          }
          .hub-core span {
            color: rgba(5,5,5,.55);
            font-family: "Geist Mono", ui-monospace, monospace;
          }
          .orbit {
            position: absolute;
            width: 170px;
            padding: 18px;
            border: 1px solid rgba(246,241,232,.14);
            background: rgba(246,241,232,.035);
            text-align: center;
            color: rgba(246,241,232,.8);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-size: 18px;
          }
          .orbit-1 { left: 84px; top: 34px; }
          .orbit-2 { right: 90px; top: 42px; }
          .orbit-3 { left: 118px; bottom: 36px; }
          .orbit-4 { right: 74px; bottom: 28px; }
          .terminal {
            position: absolute;
            left: 0;
            right: 0;
            top: 106px;
            padding: 30px;
            background: #f6f1e8;
            color: #050505;
            font-size: 25px;
            white-space: nowrap;
          }
          .terminal span { color: rgba(5,5,5,.45); }
          .signal-row {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
          }
          .signal-row b {
            padding: 22px;
            color: var(--accent);
            font-size: 20px;
            font-weight: 560;
            text-align: center;
          }
          .record {
            grid-template-columns: repeat(4, 1fr);
          }
          .record div,
          .pipeline div,
          .matrix div,
          .audit div {
            min-height: 240px;
            padding: 22px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .record span,
          .record em,
          .catalog span,
          .catalog em,
          .pipeline span,
          .matrix span,
          .audit span,
          .audit em {
            color: rgba(246,241,232,.44);
            font-size: 15px;
            font-style: normal;
          }
          .audit {
            grid-template-columns: repeat(4, 1fr);
          }
          .record strong,
          .catalog strong,
          .matrix strong,
          .audit strong {
            color: rgba(246,241,232,.9);
            font-size: 25px;
            font-weight: 650;
          }
          .vault {
            display: grid;
            place-items: center;
          }
          .vault-icon {
            position: relative;
            z-index: 1;
            width: 150px;
            height: 150px;
            color: var(--accent);
          }
          .vault-ring {
            position: absolute;
            width: 330px;
            height: 330px;
            border: 1px solid color-mix(in srgb, var(--accent) 36%, transparent);
            background: rgba(246,241,232,.02);
          }
          .vault-label {
            position: absolute;
            right: 0;
            bottom: 28px;
            color: var(--accent);
            font-size: 17px;
          }
          .catalog {
            grid-template-columns: 1fr;
          }
          .catalog div,
          .versions div {
            display: grid;
            grid-template-columns: 150px 1fr 120px;
            align-items: center;
            padding: 25px;
          }
          .catalog em,
          .versions b {
            color: var(--accent);
            text-align: right;
          }
          .pipeline {
            grid-template-columns: repeat(4, 1fr);
          }
          .pipeline div {
            min-height: 315px;
          }
          .pipeline .ok {
            border-color: color-mix(in srgb, var(--accent) 56%, transparent);
            color: var(--accent);
          }
          .pipeline strong {
            font-size: 30px;
          }
          .surfaces div {
            justify-content: end;
          }
          .shield {
            position: absolute;
            left: 92px;
            top: 34px;
            width: 280px;
            height: 280px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(246,241,232,.13);
          }
          .shield-icon {
            width: 128px;
            height: 128px;
            color: var(--accent);
          }
          .shield-list {
            position: absolute;
            right: 0;
            top: 52px;
            display: grid;
            gap: 12px;
            width: 390px;
          }
          .shield-list span {
            padding: 20px 24px;
            border: 1px solid rgba(246,241,232,.13);
            background: rgba(246,241,232,.035);
            font-family: "Geist Mono", ui-monospace, monospace;
            color: rgba(246,241,232,.72);
          }
          .review-card {
            position: absolute;
            left: 0;
            top: 44px;
            width: 460px;
            padding: 30px;
            border: 1px solid rgba(246,241,232,.13);
            background: rgba(246,241,232,.035);
          }
          .review-card.approved {
            left: auto;
            right: 0;
            top: 150px;
            border-color: color-mix(in srgb, var(--accent) 50%, transparent);
          }
          .review-card span,
          .review-card em {
            display: block;
            color: var(--accent);
            font-family: "Geist Mono", ui-monospace, monospace;
            font-style: normal;
          }
          .review-card strong {
            display: block;
            margin: 18px 0;
            font-size: 27px;
          }
          .matrix {
            grid-template-columns: repeat(2, 1fr);
          }
          .matrix div {
            min-height: 154px;
          }
          .timeline {
            position: relative;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            padding-top: 148px;
          }
          .timeline::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 170px;
            border-top: 1px solid color-mix(in srgb, var(--accent) 48%, transparent);
          }
          .timeline div {
            position: relative;
            min-height: 160px;
          }
          .timeline span {
            display: block;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
          }
          .timeline strong {
            display: block;
            margin-top: 46px;
            color: rgba(246,241,232,.78);
            font-size: 24px;
          }
          .versions {
            display: grid;
            gap: 14px;
          }
          .versions b {
            font-size: 24px;
          }
          .diff {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .diff div {
            min-height: 300px;
            padding: 26px;
          }
          .diff span {
            color: var(--accent);
            font-size: 18px;
          }
          .diff p {
            margin-top: 72px;
            color: rgba(246,241,232,.72);
            font-size: 26px;
          }
          .price-path div {
            align-items: flex-start;
            justify-content: flex-end;
            color: #050505;
            background: #f6f1e8;
            font-size: 42px;
          }
          .plan {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
          .plan span {
            min-height: 132px;
            padding: 24px;
            color: rgba(246,241,232,.78);
            font-size: 20px;
          }
          .plan.featured span {
            color: #050505;
            background: #f6f1e8;
          }
          .cta-mark {
            top: 42%;
          }
          .cta-actions {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 18px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
          }
          .cta-actions span {
            padding: 22px 16px;
            color: rgba(246,241,232,.76);
            text-align: center;
          }
        </style>
      </head>
      <body>
        <main class="slide">
          <div class="brand">
            <div class="brand-left">${mark()}<span>intertool</span></div>
            <div class="num">${String(index + 1).padStart(2, "0")}/06</div>
          </div>
          <section class="art">${art(slide)}</section>
          <section class="copy">
            <div class="kicker">${escapeHtml(slide.kicker)}</div>
            <h1>${escapeHtml(slide.title)}</h1>
            <p>${escapeHtml(slide.body)}</p>
          </section>
        </main>
      </body>
    </html>
  `;
}

async function contactSheetHtml(files, campaign) {
  const images = (
    await Promise.all(
      files.map(async (file, index) => {
        const dataUrl = `data:image/png;base64,${(
          await readFile(file)
        ).toString("base64")}`;
        return `
          <div class="thumb">
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
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #050505;
            font-family: ui-sans-serif, system-ui, sans-serif;
          }
          .sheet {
            width: 2160px;
            height: 1440px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            padding: 32px;
            background: #050505;
          }
          .thumb {
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
            color: ${campaign.accent};
            font: 20px ui-monospace, monospace;
          }
        </style>
      </head>
      <body><main class="sheet">${images}</main></body>
    </html>
  `;
}

function captionText(campaign) {
  const altText = campaign.slides
    .map((slide, index) => `${index + 1}. ${slide.title} ${slide.body}`)
    .join("\n");

  return `# ${campaign.name}\n\n## Caption\n\n${campaign.caption}\n\n${campaign.hashtags}\n\n## Alt Text\n\n${altText}\n`;
}

await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

const browser = await chromium.launch({ headless: true });
const summary = [];

try {
  for (const campaign of campaigns) {
    const campaignDir = path.join(outRoot, campaign.slug);
    await mkdir(campaignDir, { recursive: true });

    const files = [];
    for (const [index, slide] of campaign.slides.entries()) {
      const page = await browser.newPage({
        viewport: { width: 1080, height: 1080 },
        deviceScaleFactor: 1,
      });
      await page.setContent(slideHtml(campaign, slide, index), {
        waitUntil: "networkidle",
      });
      const file = path.join(
        campaignDir,
        `${campaign.slug}-slide-${String(index + 1).padStart(2, "0")}.png`
      );
      await page.locator(".slide").screenshot({ path: file });
      files.push(file);
      await page.close();
    }

    const contact = await browser.newPage({
      viewport: { width: 2160, height: 1440 },
      deviceScaleFactor: 1,
    });
    await contact.setContent(await contactSheetHtml(files, campaign), {
      waitUntil: "networkidle",
    });
    const contactFile = path.join(campaignDir, `${campaign.slug}-contact-sheet.png`);
    await contact.locator(".sheet").screenshot({ path: contactFile });
    await contact.close();

    await writeFile(path.join(campaignDir, "caption.md"), captionText(campaign));
    await writeFile(
      path.join(campaignDir, "manifest.json"),
      JSON.stringify(
        {
          campaign: campaign.name,
          size: "1080x1080",
          slides: files.map((file, index) => ({
            index: index + 1,
            file: path.basename(file),
            title: campaign.slides[index].title,
          })),
          contactSheet: path.basename(contactFile),
        },
        null,
        2
      )
    );

    summary.push({
      slug: campaign.slug,
      name: campaign.name,
      directory: path.relative(__dirname, campaignDir),
      slides: files.length,
    });
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outRoot, "manifest.json"),
  JSON.stringify(
    {
      format: "Instagram topic carousels",
      size: "1080x1080",
      campaigns: summary,
    },
    null,
    2
  )
);

console.log(`Wrote ${summary.length} carousel campaigns to ${outRoot}`);
