const NO_COLOR =
  !!process.env.NO_COLOR || !process.stdout.isTTY;

function wrap(code: string, text: string): string {
  if (NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const bold = (t: string) => wrap("1", t);
export const dim = (t: string) => wrap("2", t);
export const green = (t: string) => wrap("32", t);
export const red = (t: string) => wrap("31", t);
export const cyan = (t: string) => wrap("36", t);
export const yellow = (t: string) => wrap("33", t);

export const check = (t: string) => `${green("✔")} ${t}`;
export const cross = (t: string) => `${red("✖")} ${t}`;

export function isJsonMode(): boolean {
  return process.argv.includes("--json");
}

interface Spinner {
  stop(finalText?: string): void;
}

export function spinner(text: string): Spinner {
  if (NO_COLOR || isJsonMode()) {
    // Non-interactive: just print the message once
    if (!isJsonMode()) process.stderr.write(`${text}\n`);
    return { stop() {} };
  }

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const id = setInterval(() => {
    process.stderr.write(`\r${dim(frames[i++ % frames.length])} ${text}`);
  }, 80);

  return {
    stop(finalText?: string) {
      clearInterval(id);
      process.stderr.write("\r\x1b[K"); // clear line
      if (finalText) console.log(finalText);
    },
  };
}
