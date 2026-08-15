import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?date-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";

const settings = {
  mode: "wro",
  showCurrentTime: false,
  noiseStrength: 0,
  noiseIntervalMin: 0,
  autoWroEnabled: false,
  alarmEnabled: false,
  theme: "dark"
};

const cases = [
  {
    name: "seven calendar days while less than seven 24-hour periods remain",
    now: "2026-08-15T13:08:09.000Z",
    main: "7 DAYS",
    sub: "開始まで 159:51:51"
  },
  {
    name: "one calendar day before the event date",
    now: "2026-08-21T04:00:00.000Z",
    main: "1 DAY",
    sub: "開始まで 25:00:00"
  },
  {
    name: "event date before the 14:00 start",
    now: "2026-08-21T15:00:00.000Z",
    main: "0 DAYS",
    sub: "開始まで 14:00:00"
  },
  {
    name: "after the event start",
    now: "2026-08-22T05:00:01.000Z",
    main: "START",
    sub: "WRO 2026 Japan 決勝大会"
  }
];

const browser = await chromium.launch({ headless: true });
const failures = [];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const runtimeErrors = [];

  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.addInitScript(({ fixedNow, key, storedSettings }) => {
    localStorage.setItem(key, JSON.stringify(storedSettings));

    const RealDate = Date;
    const fixedMilliseconds = RealDate.parse(fixedNow);

    class FixedDate extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedMilliseconds]));
      }

      static now() {
        return fixedMilliseconds;
      }

      static parse(value) {
        return RealDate.parse(value);
      }

      static UTC(...args) {
        return RealDate.UTC(...args);
      }
    }

    Object.setPrototypeOf(FixedDate, RealDate);
    window.Date = FixedDate;
  }, {
    fixedNow: testCase.now,
    key: SETTINGS_KEY,
    storedSettings: settings
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForFunction(() => {
      const value = document.querySelector("#mainValue")?.textContent || "";
      return value && !value.includes("--");
    }, { timeout: 15000 });

    const actual = await page.evaluate(() => ({
      main: document.querySelector("#mainValue")?.textContent?.trim(),
      sub: document.querySelector("#subValue")?.textContent?.trim(),
      date: document.querySelector("#targetLabel")?.textContent?.trim()
    }));

    if (actual.main !== testCase.main) {
      failures.push(`${testCase.name}: expected main ${testCase.main}, got ${actual.main}`);
    }
    if (actual.sub !== testCase.sub) {
      failures.push(`${testCase.name}: expected sub ${testCase.sub}, got ${actual.sub}`);
    }
    if (actual.date !== "8月22日（土）") {
      failures.push(`${testCase.name}: expected event date label, got ${actual.date}`);
    }
    failures.push(...runtimeErrors.map(error => `${testCase.name}: ${error}`));
  } catch (error) {
    failures.push(`${testCase.name}: ${error.stack || error.message}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO calendar-day countdown check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WRO calendar-day countdown check passed ${cases.length} cases.`);
