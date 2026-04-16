import { Car, Fine, FinesCheckResult } from '@/types';

const PROTOCOLS_GE_SITE_KEY = '6LdJoBUqAAAAANzkPmnCW3N03N0k4UfVkNplFi3d';

// In-memory cache (shared within same server instance)
let lastCheckResult: FinesCheckResult | null = null;

export function getCachedFines(): FinesCheckResult | null {
  return lastCheckResult;
}

export function setCachedFines(result: FinesCheckResult) {
  lastCheckResult = result;
}

async function getBrowser() {
  // On Linux (Vercel) use serverless chromium; locally use bundled puppeteer
  if (process.platform === 'linux') {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });
  } else {
    const puppeteer = (await import('puppeteer')).default;
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

export async function checkAllFines(cars: Car[]): Promise<FinesCheckResult> {
  const checkedAt = new Date().toISOString();
  const fines: Fine[] = [];
  const errors: Array<{ carPlate: string; source: string; error: string }> = [];

  // Only check cars with gov plate type (skip transit)
  const gosCars = cars.filter(car => {
    const type = (car.plateType || '').toLowerCase().trim();
    return type !== 'транзит' && type !== 'transit' && car.plateNumber && car.techPassportNumber;
  });

  const browser = await getBrowser();
  try {
    const protocolsResult = await checkProtocolsGe(browser, gosCars, checkedAt);
    fines.push(...protocolsResult.fines);
    errors.push(...protocolsResult.errors);

    const videosResult = await checkVideosPolice(browser, gosCars, checkedAt);
    fines.push(...videosResult.fines);
    errors.push(...videosResult.errors);
  } finally {
    await browser.close();
  }

  const result: FinesCheckResult = {
    fines,
    errors,
    checkedAt,
    carsChecked: gosCars.length,
    carsSkipped: cars.length - gosCars.length,
  };

  lastCheckResult = result;
  return result;
}

// --- protocols.ge checker ---
// Uses REST API: POST https://api.protocols.ge/api/getByID
// reCAPTCHA token obtained from within protocols.ge page context
async function checkProtocolsGe(browser: any, cars: Car[], checkedAt: string) {
  const fines: Fine[] = [];
  const errors: Array<{ carPlate: string; source: string; error: string }> = [];
  if (cars.length === 0) return { fines, errors };

  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.goto('https://protocols.ge/', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(
      'typeof window.grecaptcha !== "undefined" && typeof window.grecaptcha.execute === "function"',
      { timeout: 20000 }
    );

    for (const car of cars) {
      try {
        // Generate reCAPTCHA token from within protocols.ge page (domain matches)
        const token: string = await page.evaluate(
          (siteKey: string) =>
            new Promise<string>((resolve, reject) => {
              (window as any).grecaptcha.ready(() => {
                (window as any).grecaptcha
                  .execute(siteKey, { action: 'submit' })
                  .then(resolve)
                  .catch(reject);
              });
              setTimeout(() => reject(new Error('reCAPTCHA timeout')), 20000);
            }),
          PROTOCOLS_GE_SITE_KEY
        );

        const result: any = await page.evaluate(
          async (plate: string, techPass: string, recaptchaToken: string) => {
            const res = await fetch('https://api.protocols.ge/api/getByID', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ govNumber: plate, techPass, page: 0, size: 100, recaptchaToken }),
            });
            return res.json();
          },
          car.plateNumber,
          car.techPassportNumber,
          token
        );

        if (result?.content && Array.isArray(result.content)) {
          for (const item of result.content) {
            fines.push({
              id: `protocols-${car.plateNumber}-${item.id || item.receiptNumber || Date.now()}`,
              carId: car.id,
              carPlate: car.plateNumber,
              carName: `${car.brand} ${car.model}`,
              source: 'protocols.ge',
              fineNumber: String(item.receiptNumber || item.id || ''),
              violationDate: item.violationDate || item.date || item.createdDate || '',
              location: item.location || item.address || item.place || '',
              violation:
                item.violation || item.violationType || item.violationName || item.description || '',
              amount: Number(item.amount || item.fine || item.fineAmount || 0),
              currency: item.currency || 'GEL',
              status: item.status || item.paymentStatus || '',
              sourceUrl: 'https://protocols.ge',
              rawData: item,
              checkedAt,
            });
          }
        }
      } catch (err: any) {
        errors.push({
          carPlate: car.plateNumber,
          source: 'protocols.ge',
          error: err.message || String(err),
        });
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (err: any) {
    for (const car of cars) {
      if (!errors.find(e => e.carPlate === car.plateNumber && e.source === 'protocols.ge')) {
        errors.push({ carPlate: car.plateNumber, source: 'protocols.ge', error: err.message });
      }
    }
  } finally {
    await page.close();
  }
  return { fines, errors };
}

// --- videos.police.ge checker ---
// Uses full browser navigation: fill form → click submit → parse result page
async function checkVideosPolice(browser: any, cars: Car[], checkedAt: string) {
  const fines: Fine[] = [];
  const errors: Array<{ carPlate: string; source: string; error: string }> = [];

  for (const car of cars) {
    const page = await browser.newPage();
    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      );
      await page.goto('https://videos.police.ge/?lang=en', {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      await page.waitForSelector('#documentNo', { timeout: 10000 });

      await page.locator('#documentNo').fill(car.techPassportNumber);
      await page.locator('#vehicleNo2').fill(car.plateNumber);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        page.click('input[type="submit"]'),
      ]);

      // Extract fine rows from result tables (skip the search form table)
      const tableRows: string[][] = await page.evaluate(() => {
        const allTables = Array.from(document.querySelectorAll('table'));
        const rows: string[][] = [];
        for (const table of allTables) {
          if (table.querySelector('input')) continue; // skip search form table
          const trs = Array.from(table.querySelectorAll('tr'));
          for (const tr of trs) {
            const cells = Array.from(tr.querySelectorAll('td, th')).map(
              td => td.textContent?.trim().replace(/\s+/g, ' ') || ''
            );
            if (cells.length >= 2 && cells.some(c => c.length > 0)) rows.push(cells);
          }
        }
        return rows;
      });

      // First row may be a header — skip rows where all cells look like headers
      const isHeader = (row: string[]) =>
        row.every(c => /^(#|N|Date|Тариफ|Status|Amount|Protocol|Plate|Tech)/i.test(c) || c === '');

      const dataRows = tableRows.filter(row => !isHeader(row));

      for (let i = 0; i < dataRows.length; i++) {
        const cells = dataRows[i];
        if (cells.length < 2) continue;
        const amountStr = cells.find(c => /^\d[\d\s.,']*$/.test(c)) || '0';
        fines.push({
          id: `videos-${car.plateNumber}-${i}-${Date.now()}`,
          carId: car.id,
          carPlate: car.plateNumber,
          carName: `${car.brand} ${car.model}`,
          source: 'videos.police.ge',
          fineNumber: cells[0] || '',
          violationDate: cells[1] || '',
          location: cells[2] || '',
          violation: cells[3] || '',
          amount: parseFloat(amountStr.replace(/[^\d.]/g, '')) || 0,
          currency: 'GEL',
          status: cells[cells.length - 1] || '',
          sourceUrl: 'https://videos.police.ge',
          rawData: { cells },
          checkedAt,
        });
      }
    } catch (err: any) {
      errors.push({
        carPlate: car.plateNumber,
        source: 'videos.police.ge',
        error: err.message || String(err),
      });
    } finally {
      await page.close();
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return { fines, errors };
}
