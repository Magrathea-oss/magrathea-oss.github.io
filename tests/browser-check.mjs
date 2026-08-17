#!/usr/bin/env node
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import process from "node:process";

const host = "127.0.0.1";
const port = 4173;
const baseUrl = `http://${host}:${port}`;
const failures = [];
const localFailures = [];

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const server = spawn("python3", ["-m", "http.server", String(port), "--bind", host], {
  cwd: new URL("..", import.meta.url),
  stdio: "ignore",
});

const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
      if (response.ok) return;
    } catch (_error) {
      // The local preview may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local preview server did not start");
};

const watchPage = (page, label) => {
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`${label} console error: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`${label} page error: ${error.message}`));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl && response.status() >= 400) {
      localFailures.push(`${response.status()} ${url.pathname}`);
    }
  });
};

const noHorizontalOverflow = (page) => page.evaluate(
  () => document.documentElement.scrollWidth <= window.innerWidth + 1,
);

let browser;
try {
  await waitForServer();
  await mkdir(new URL("../test-results", import.meta.url), { recursive: true });
  browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const desktop = await desktopContext.newPage();
  watchPage(desktop, "desktop");
  const desktopResponse = await desktop.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  check(desktopResponse?.status() === 200, "desktop home did not return HTTP 200");
  const visualIntro = desktop.locator("#magrathea-world");
  const visualArtwork = visualIntro.locator(".visual-intro-art");
  check(await visualIntro.isVisible(), "desktop generated Magrathea landing is not visible");
  check(
    await visualArtwork.evaluate((image) => image.complete && image.naturalWidth === 1536 && image.naturalHeight === 864),
    "desktop generated Magrathea artwork did not load at its recorded dimensions",
  );
  check(
    await visualArtwork.evaluate((image) => /magrathea-world-desktop\.(avif|webp|jpg)$/.test(new URL(image.currentSrc).pathname)),
    "desktop did not select a desktop Magrathea artwork rendition",
  );
  const landingOrder = await desktop.evaluate(() => {
    const intro = document.querySelector("#magrathea-world").getBoundingClientRect();
    const hero = document.querySelector(".hero").getBoundingClientRect();
    const firstSection = document.querySelector("main > section");
    return {
      firstSectionIsArtwork: firstSection?.id === "magrathea-world",
      artworkHeight: intro.height,
      viewportHeight: window.innerHeight,
      heroAfterArtwork: hero.top >= intro.bottom - 1,
    };
  });
  check(landingOrder.firstSectionIsArtwork, "generated artwork is not the first main section");
  check(landingOrder.artworkHeight >= landingOrder.viewportHeight * 0.9, "desktop artwork is not a full landing view");
  check(landingOrder.heroAfterArtwork, "existing constellation hero was not moved below the artwork");
  check(
    await desktop.getByRole("heading", { level: 1, name: /Software made to measure/i }).isVisible(),
    "desktop hero heading is not visible",
  );
  for (const product of ["Magrathea Git", "Magrathea PKI", "Magrathea ObjectStore"]) {
    check(
      await desktop.getByRole("heading", { level: 3, name: product, exact: true }).isVisible(),
      `desktop product card is missing: ${product}`,
    );
  }

  await desktop.keyboard.press("Tab");
  check(
    await desktop.evaluate(() => document.activeElement?.classList.contains("skip-link")),
    "skip link is not the first keyboard focus target",
  );
  await desktop.evaluate(() => document.activeElement?.blur());

  await desktop.locator("#git").hover();
  check(await desktop.locator('[data-world="git"]').evaluate((node) => node.classList.contains("is-active")), "product hover does not highlight its orbit node");
  await desktop.mouse.move(2, 2);

  for (const section of ["constellation", "method", "principles", "open-source"]) {
    await desktop.locator(`#${section}`).scrollIntoViewIfNeeded();
    await desktop.waitForTimeout(100);
  }
  await desktop.waitForTimeout(700);
  check(await noHorizontalOverflow(desktop), "desktop page has horizontal overflow");
  await desktop.screenshot({
    path: new URL("../test-results/site-desktop-full.png", import.meta.url).pathname,
    fullPage: true,
  });
  await desktop.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  await desktop.waitForFunction(() => window.scrollY === 0);
  await desktop.screenshot({
    path: new URL("../test-results/site-desktop-hero.png", import.meta.url).pathname,
  });
  await desktopContext.close();

  const wideContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const wide = await wideContext.newPage();
  watchPage(wide, "wide-desktop");
  await wide.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const heroCollision = await wide.evaluate(() => {
    const title = document.querySelector(".hero h1").getBoundingClientRect();
    const panel = document.querySelector(".constellation-console").getBoundingClientRect();
    return title.right > panel.left - 16 && title.bottom > panel.top && title.top < panel.bottom;
  });
  check(!heroCollision, "wide desktop hero title collides with the constellation panel");
  check(await noHorizontalOverflow(wide), "wide desktop page has horizontal overflow");
  await wideContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const mobile = await mobileContext.newPage();
  watchPage(mobile, "mobile");
  await mobile.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const mobileArtwork = mobile.locator("#magrathea-world .visual-intro-art");
  check(
    await mobileArtwork.evaluate((image) => image.complete && image.naturalWidth === 832 && image.naturalHeight === 1216),
    "mobile generated Magrathea artwork did not load at its recorded dimensions",
  );
  check(
    await mobileArtwork.evaluate((image) => /magrathea-world-portrait\.(avif|webp|jpg)$/.test(new URL(image.currentSrc).pathname)),
    "mobile did not select a portrait Magrathea artwork rendition",
  );
  const menu = mobile.getByRole("button", { name: /Menu/i });
  check(await menu.isVisible(), "mobile menu control is not visible");
  await menu.click();
  check(await menu.getAttribute("aria-expanded") === "true", "mobile menu does not expose expanded state");
  check(await mobile.locator("#site-nav").isVisible(), "mobile navigation did not open");
  await mobile.keyboard.press("Escape");
  check(await menu.getAttribute("aria-expanded") === "false", "Escape did not close the mobile navigation");
  check(await noHorizontalOverflow(mobile), "mobile page has horizontal overflow");
  check(
    await mobile.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === "auto"),
    "reduced-motion mode did not disable smooth scrolling",
  );
  await mobile.screenshot({
    path: new URL("../test-results/site-mobile-full.png", import.meta.url).pathname,
    fullPage: true,
  });
  await mobileContext.close();

  const narrowContext = await browser.newContext({
    viewport: { width: 320, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const narrow = await narrowContext.newPage();
  watchPage(narrow, "narrow-mobile");
  await narrow.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const narrowLayout = await narrow.evaluate(() => {
    const shell = document.querySelector(".hero .shell").getBoundingClientRect();
    const title = document.querySelector(".hero h1").getBoundingClientRect();
    const panel = document.querySelector(".constellation-console").getBoundingClientRect();
    const product = document.querySelector(".product-card").getBoundingClientRect();
    return { shell, title, panel, product };
  });
  check(narrowLayout.title.right <= narrowLayout.shell.right + 1, "320px hero title exceeds its shell");
  check(narrowLayout.panel.right <= narrowLayout.shell.right + 1, "320px constellation panel exceeds its shell");
  check(narrowLayout.product.right <= narrowLayout.shell.right + 1, "320px product card exceeds its shell");
  check(await noHorizontalOverflow(narrow), "320px page has horizontal overflow");
  await narrowContext.close();

  const noScriptContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const noScript = await noScriptContext.newPage();
  watchPage(noScript, "no-script");
  await noScript.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  check(await noScript.locator("#magrathea-world .visual-intro-art").isVisible(), "JavaScript-free generated landing is not visible");
  check(
    await noScript.getByRole("heading", { level: 1, name: /Software made to measure/i }).isVisible(),
    "JavaScript-free hero heading is not visible",
  );
  check(await noScript.locator("#site-nav").isVisible(), "JavaScript-free navigation is not available");
  check(
    await noScript.getByRole("heading", { level: 3, name: "Magrathea ObjectStore", exact: true }).isVisible(),
    "JavaScript-free product content is unavailable",
  );
  check(await noHorizontalOverflow(noScript), "JavaScript-free mobile page has horizontal overflow");
  await noScriptContext.close();

  const notFoundContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const notFound = await notFoundContext.newPage();
  watchPage(notFound, "404");
  const missingResponse = await notFound.goto(`${baseUrl}/404.html`, { waitUntil: "networkidle" });
  check(missingResponse?.status() === 200, "static 404 document could not be loaded directly");
  check(
    await notFound.getByRole("heading", { level: 1, name: "World not found." }).isVisible(),
    "404 heading is not visible",
  );
  await notFoundContext.close();

  check(localFailures.length === 0, `local asset failures: ${[...new Set(localFailures)].join(", ")}`);
} catch (error) {
  failures.push(error.stack || error.message);
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

if (failures.length) {
  console.error("BROWSER CHECK: FAIL");
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log("BROWSER CHECK: PASS (1920×1080, 1440×1000, 390×844, and 320×720)");
