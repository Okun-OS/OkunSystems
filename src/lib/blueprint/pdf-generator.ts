import type { Browser } from "puppeteer";
import { execFileSync } from "child_process";

let _browser: Browser | null = null;

function resolveChromiumPath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  // Locate system chromium installed via nixpkgs at runtime
  for (const bin of ["chromium", "chromium-browser", "google-chrome-stable"]) {
    try {
      const p = execFileSync("which", [bin], { encoding: "utf8" }).trim();
      if (p) return p;
    } catch {
      // not found, try next
    }
  }
  return undefined;
}

async function getBrowser(): Promise<Browser> {
  if (_browser) return _browser;

  const puppeteer = await import("puppeteer");
  const executablePath = resolveChromiumPath();

  _browser = await puppeteer.default.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  process.once("exit", () => { _browser?.close(); });

  return _browser;
}

/**
 * renderHtmlToPdf renders an HTML string to a PDF Buffer using Puppeteer.
 *
 * Uses a singleton browser instance to avoid re-launching for each report.
 * The browser is closed automatically on process exit.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "load" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
