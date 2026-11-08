const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(
      process.env.WEBSITE_URL || "https://sweep.finance/airdrop",
      { waitUntil: "domcontentloaded", timeout: 90000 }
    );

    console.log("Please sign in with Google manually.");

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise(resolve => {
      rl.question("After login, press ENTER...", resolve);
    });

    rl.close();

    const output = path.resolve("auth/storage-state.json");
    fs.mkdirSync(path.dirname(output), { recursive: true });

    await context.storageState({ path: output });

    console.log("Login session saved:", output);
  } finally {
    await browser.close();
  }
})().catch(console.error);
