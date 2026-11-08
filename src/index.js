
const { chromium } = require("playwright");
const fs = require("fs");

const URL =
  process.env.WEBSITE_URL || "https://sweep.finance/airdrop";

const INTERVAL =
  Number(process.env.INTERVAL_MINUTES || 30) * 60 * 1000;

const AUTH =
  process.env.AUTH_STATE_PATH || "/data/storage-state.json";

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  // Khôi phục phiên đăng nhập từ Railway Variables
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

    console.log("Authentication state restored.");
  }

  if (!fs.existsSync(AUTH)) {
    throw new Error("Missing login session: " + AUTH);
  }

  // Khởi chạy trình duyệt
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  const context = await browser.newContext({
    storageState: AUTH
  });

  const page = await context.newPage();

  console.log("Sweep monitor started.");
  console.log("Target URL:", URL);
  console.log("Check interval:", INTERVAL / 60000, "minutes");

  try {
    // Mở trang Sweep
    await page.goto(URL, {
      waitUntil: "domcontentloaded",
      timeout: 90000
    });

    await page.waitForTimeout(5000);

    // In thông tin trang khi khởi động
    console.log("Current URL:", page.url());
    console.log("Page title:", await page.title());

    console.log(
      "Page text:",
      (await page.locator("body").innerText().catch(() => ""))
        .slice(0, 5000)
    );

    console.log(
      "Frames:",
      page.frames().map(frame => frame.url())
    );

    // Kiểm tra định kỳ
    while (true) {
      const timestamp = new Date().toISOString();

      const body = await page
        .locator("body")
        .innerText()
        .catch(() => "");

      if (/sign in with google|continue with google/i.test(body)) {
        console.log(
          timestamp,
          "Login may have expired. Please refresh the login session."
        );
      } else {
        const buttons = await page
          .locator("button")
          .evaluateAll(elements =>
            elements.map(button => ({
              text: button.innerText.trim(),
              ariaLabel: button.getAttribute("aria-label"),
              disabled: button.disabled
            }))
          );

        console.log(
          timestamp,
          "Visible buttons:",
          JSON.stringify(buttons)
        );

        const claim = page.getByRole("button", {
          name: /20\s*XP/i
        });

        if (await claim.isVisible().catch(() => false)) {
          console.log(
            timestamp,
            "20 XP claim button is available. Please verify and claim manually."
          );
        } else {
          console.log(
            timestamp,
            "Claim button not currently visible."
          );
        }
      }

      // Chờ đến lần kiểm tra tiếp theo
      await sleep(INTERVAL);

      // Tải lại trang
      console.log("Reloading Sweep page...");

      await page.reload({
        waitUntil: "domcontentloaded",
        timeout: 90000
      });

      await page.waitForTimeout(5000);

      console.log("Page reloaded:", page.url());
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error("Monitor error:", error);
  process.exit(1);
});
