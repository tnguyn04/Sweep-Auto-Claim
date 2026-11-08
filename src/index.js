const { chromium } = require("playwright");
const fs = require("fs");

const URL = process.env.WEBSITE_URL || "https://sweep.finance/airdrop";
const INTERVAL = Number(process.env.INTERVAL_MINUTES || 30) * 60000;
const AUTH = process.env.AUTH_STATE_PATH || "/data/storage-state.json";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const encodedAuthState = [
      process.env.AUTH_STATE_BASE64_1,
      process.env.AUTH_STATE_BASE64_2,
      process.env.AUTH_STATE_BASE64_3
    ].filter(Boolean).join("");

    if (encodedAuthState) {
      fs.mkdirSync("/data", { recursive: true });

      fs.writeFileSync(
        AUTH,
        Buffer.from(encodedAuthState, "base64")
      );
    }
  if (!fs.existsSync(AUTH)) {
    throw new Error("Missing Google login session: " + AUTH);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    storageState: AUTH
  });

  const page = await context.newPage();

  console.log("Sweep monitor started.");

  try {
    await page.goto(URL, {
      waitUntil: "domcontentloaded",
      timeout: 90000
    });

    while (true) {
      const body = await page.locator("body").innerText().catch(() => "");

      if (/sign in with google|continue with google/i.test(body)) {
        console.log("Login may have expired. Refresh Google session.");
      } else {
        const buttons = await page.locator("button").evaluateAll(elements =>
          elements.map(button => ({
            text: button.innerText.trim(),
            ariaLabel: button.getAttribute("aria-label"),
            disabled: button.disabled
          }))
        );

        console.log("Visible buttons:", JSON.stringify(buttons));
        const claim = page.getByRole("button", {
          name: /20\s*XP/i
        });

        if (await claim.isVisible().catch(() => false)) {
          console.log(new Date().toISOString(),
            "20 XP claim button is available. Please verify and claim manually.");
        } else {
          console.log(new Date().toISOString(),
            "Claim button not currently visible.");
        }
      }

      await sleep(INTERVAL);
      await page.reload({
        waitUntil: "domcontentloaded",
        timeout: 90000
      }).catch(console.error);
      await page.waitForTimeout(5000);
      console.log("Current URL:", page.url());
      console.log("Page title:", await page.title());

      console.log(
        "Page text:",
        (await page.locator("body").innerText()).slice(0, 5000)
      );
      console.log(
        "Frames:",
        page.frames().map(frame => frame.url())
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
