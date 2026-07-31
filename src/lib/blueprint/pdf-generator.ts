import type { Browser } from "puppeteer";

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser) return _browser;

  const puppeteer = await import("puppeteer");

  _browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  // Clean up on process exit
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
