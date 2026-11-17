import fs from "node:fs";
import type { Browser } from "puppeteer-core";


/**
 * Shared headless-Chromium instance.
 *
 * PDF generation used to launch a browser and tear it down again on every
 * request, which dominated the request time (seconds, not milliseconds).
 * Chromium is expensive to start but cheap to open a page in, so the browser
 * is kept alive across requests and only pages are created and closed.
 *
 * The launch is memoised as a promise so concurrent requests arriving during
 * a cold start share one launch rather than each starting their own.
 */
let browserPromise: Promise<Browser> | null = null;

/**
 * Common system Chromium executable paths across Linux distributions (Alpine, Debian, Ubuntu).
 */
const COMMON_CHROMIUM_PATHS = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
];

function findSystemChromium(): string | undefined {
    const envPath =
        process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;
    if (envPath && fs.existsSync(envPath)) return envPath;

    for (const binPath of COMMON_CHROMIUM_PATHS) {
        if (fs.existsSync(binPath)) return binPath;
    }
    return undefined;
}

/**
 * True only on a serverless platform, where the bundled Chromium binary from
 * @sparticuz/chromium is the right (and only) option.
 *
 * This used to test `ENV === "production"`, which is true for *any* production
 * build — including `next start` on a normal machine, where that Lambda-targeted
 * binary cannot run at all. That made the production bundle untestable locally,
 * and would equally have broken a self-hosted deployment.
 */
function isServerless(): boolean {
    return Boolean(
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
            process.env.VERCEL ||
            process.env.NETLIFY
    );
}

async function launchBrowser(): Promise<Browser> {
    const defaultArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
    ];

    if (isServerless()) {
        const chromium = (await import("@sparticuz/chromium")).default;
        const puppeteer = (await import("puppeteer-core")).default;

        return puppeteer.launch({
            // `--ignore-certificate-errors` was removed: it disabled TLS
            // verification for everything the browser fetched.
            args: [...chromium.args, "--disable-dev-shm-usage"],
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    }

    // 1. If explicit executable path or system Chromium binary is available,
    // use puppeteer-core directly (essential for Alpine Docker and self-hosted Linux).
    const systemChromium = findSystemChromium();
    if (systemChromium) {
        const puppeteerCore = (await import("puppeteer-core")).default;
        return puppeteerCore.launch({
            args: defaultArgs,
            executablePath: systemChromium,
            headless: true,
        });
    }

    // 2. Try the full `puppeteer` package (installed during local dev or non-pruned builds)
    try {
        const puppeteer = (await import("puppeteer")).default;
        return (await puppeteer.launch({
            args: defaultArgs,
            headless: true,
        })) as unknown as Browser;
    } catch {
        // 3. Fallback when `puppeteer` devDependency was pruned (e.g. in Dockerfile production stage)
        const chromium = (await import("@sparticuz/chromium")).default;
        const puppeteer = (await import("puppeteer-core")).default;
        return puppeteer.launch({
            args: [...chromium.args, "--disable-dev-shm-usage"],
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    }
}

function isAlive(browser: Browser): boolean {
    // `connected` is the modern property; fall back for older typings.
    if (typeof browser.connected === "boolean") return browser.connected;
    if (typeof browser.isConnected === "function") return browser.isConnected();
    return false;
}

/**
 * Returns the shared browser, launching or relaunching it as needed.
 *
 * A browser that has crashed or been killed externally is discarded and
 * replaced rather than handed out in a dead state.
 */
export async function getBrowser(): Promise<Browser> {
    if (browserPromise) {
        try {
            const existing = await browserPromise;
            if (isAlive(existing)) {
                return existing;
            }
        } catch {
            // Previous launch failed — fall through and retry below.
        }
        browserPromise = null;
    }

    browserPromise = launchBrowser().catch((error) => {
        // Don't cache a rejected promise, or every later request inherits it.
        browserPromise = null;
        throw error;
    });

    const browser = await browserPromise;

    browser.once("disconnected", () => {
        browserPromise = null;
    });

    return browser;
}

/** Closes the shared browser. Used on shutdown and by tests. */
export async function closeBrowser(): Promise<void> {
    if (!browserPromise) return;

    const pending = browserPromise;
    browserPromise = null;

    try {
        const browser = await pending;
        await browser.close();
    } catch {
        // Already gone.
    }
}
