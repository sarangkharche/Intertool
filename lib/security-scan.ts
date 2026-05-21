import type { SecurityFinding, SecurityScanResult } from "./types";

interface ScanInputFile {
  path: string;
  contentType?: string;
  body: Uint8Array;
}

interface TextTarget {
  path: string;
  content: string;
}

const TEXT_FILE_RE =
  /\.(md|mdx|txt|json|yaml|yml|toml|js|jsx|ts|tsx|py|sh|bash|zsh|env|ini|conf)$/i;

const FINDING_RULES: {
  code: string;
  severity: SecurityFinding["severity"];
  message: string;
  pattern: RegExp;
}[] = [
  {
    code: "secret.private_key",
    severity: "critical",
    message: "Contains what looks like a private key",
    pattern: /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/i,
  },
  {
    code: "secret.aws_access_key",
    severity: "critical",
    message: "Contains what looks like an AWS access key",
    pattern: /\b(A3T[A-Z0-9]|AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    code: "secret.token_assignment",
    severity: "high",
    message: "Contains a token-like assignment",
    pattern:
      /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*['"]?[A-Za-z0-9_\-./+=]{24,}/i,
  },
  {
    code: "script.curl_pipe_shell",
    severity: "high",
    message: "Downloads remote code and pipes it into a shell",
    pattern: /\b(curl|wget)\b[\s\S]{0,120}\|\s*(bash|sh|zsh)\b/i,
  },
  {
    code: "script.destructive_rm",
    severity: "high",
    message: "Contains a destructive recursive remove command",
    pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(\/|\$HOME|~)/,
  },
  {
    code: "prompt.instruction_override",
    severity: "medium",
    message: "Contains prompt-injection style override language",
    pattern:
      /\b(ignore|disregard|override)\b.{0,80}\b(previous|prior|system|developer)\b.{0,80}\b(instruction|message|prompt)s?\b/i,
  },
];

function isTextFile(file: ScanInputFile): boolean {
  const contentType = file.contentType ?? "";
  return contentType.startsWith("text/") || TEXT_FILE_RE.test(file.path);
}

function decodeText(body: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(body);
}

function scanText(target: TextTarget): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const rule of FINDING_RULES) {
    if (rule.pattern.test(target.content)) {
      findings.push({
        severity: rule.severity,
        code: rule.code,
        message: rule.message,
        path: target.path,
      });
    }
  }
  return findings;
}

function scanStatus(findings: SecurityFinding[]): SecurityScanResult["status"] {
  if (findings.some((finding) => finding.severity === "critical")) {
    return "blocked";
  }
  if (findings.length > 0) return "warning";
  return "passed";
}

export function scanRegistryItem(input: {
  readme: string;
  sourceUrl?: string;
  files: ScanInputFile[];
}): SecurityScanResult {
  const targets: TextTarget[] = [
    {
      path: "README",
      content: input.readme,
    },
  ];

  if (input.sourceUrl) {
    targets.push({
      path: "source_url",
      content: input.sourceUrl,
    });
  }

  for (const file of input.files) {
    if (!isTextFile(file)) continue;
    targets.push({
      path: file.path,
      content: decodeText(file.body),
    });
  }

  const findings = targets.flatMap(scanText);
  return {
    status: scanStatus(findings),
    scanned_at: new Date().toISOString(),
    findings,
  };
}
