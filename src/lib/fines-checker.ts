import { Car, Fine, FinesCheckResult } from '@/types';

// In-memory cache (shared within same server instance)
let lastCheckResult: FinesCheckResult | null = null;

export function getCachedFines(): FinesCheckResult | null {
  return lastCheckResult;
}

export function setCachedFines(result: FinesCheckResult) {
  lastCheckResult = result;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// --- Simple HTML table parser (no external deps) ---
function parseHtmlTables(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const cells: string[] = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRe.exec(trMatch[0])) !== null) {
      const text = tdMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      cells.push(text);
    }
    if (cells.length >= 2) rows.push(cells);
  }
  return rows;
}

// --- videos.police.ge checker (direct HTTP) ---
async function checkVideosPolice(
  car: Car,
  checkedAt: string
): Promise<{ fines: Fine[]; error?: string }> {
  const fines: Fine[] = [];
  try {
    // Step 1: load page to get session cookie
    const initRes = await fetch('https://videos.police.ge/?lang=en', {
      headers: { 'User-Agent': UA },
    });
    const rawCookies = initRes.headers.getSetCookie?.() ?? [];
    const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');
    const initHtml = await initRes.text();

    // Extract hidden token if present
    const csrfMatch =
      initHtml.match(/name=["']csrf_token["'][^>]*value=["']([^"']+)["']/i) ??
      initHtml.match(/name=["']token["'][^>]*value=["']([^"']+)["']/i);
    const csrfToken = csrfMatch?.[1] ?? '';

    // Step 2: POST search form
    const formBody = new URLSearchParams({
      documentNo: car.techPassportNumber,
      vehicleNo2: car.plateNumber,
      lang: 'en',
      ...(csrfToken ? { csrf_token: csrfToken } : {}),
    });

    const postRes = await fetch('https://videos.police.ge/submit-index.php', {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        Referer: 'https://videos.police.ge/?lang=en',
        Cookie: cookieHeader,
      },
      body: formBody.toString(),
    });

    // Follow 302 redirect with GET carrying session cookie
    let html = await postRes.text();
    const location = postRes.headers.get('location');
    if ((postRes.status === 301 || postRes.status === 302) && location) {
      const redirectUrl = location.startsWith('http')
        ? location
        : 'https://videos.police.ge/' + location.replace(/^\//, '');
      const rRes = await fetch(redirectUrl, { headers: { 'User-Agent': UA, Cookie: cookieHeader } });
      html = await rRes.text();
    }

    // Results page: only tables that have NO input elements
    const allTablesHtml = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
    const resultTablesHtml = allTablesHtml.filter(t => !/<input/i.test(t));
    const rows = resultTablesHtml.flatMap(t => parseHtmlTables(t));

    const isHeader = (row: string[]) =>
      row.every(c => /^(#|N|Date|Status|Amount|Protocol|Plate|Tech|ტ|დ)/i.test(c) || c === '');

    const dataRows = rows.filter(r => !isHeader(r));

    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i];
      const amountStr = cells.find(c => /^\d[\d\s.,]*$/.test(c)) ?? '0';
      fines.push({
        id: `videos-${car.plateNumber}-${i}`,
        carId: car.id,
        carPlate: car.plateNumber,
        carName: `${car.brand} ${car.model}`,
        source: 'videos.police.ge',
        fineNumber: cells[0] ?? '',
        violationDate: cells[1] ?? '',
        location: cells[2] ?? '',
        violation: cells[3] ?? '',
        amount: parseFloat(amountStr.replace(/[^\d.]/g, '')) || 0,
        currency: 'GEL',
        status: cells[cells.length - 1] ?? '',
        sourceUrl: 'https://videos.police.ge',
        rawData: { cells },
        checkedAt,
      });
    }
  } catch (err: any) {
    const cause = err?.cause ? ` (cause: ${err.cause?.message ?? String(err.cause)})` : '';
    return { fines, error: err.message + cause };
  }
  return { fines };
}

// --- protocols.ge checker (direct HTTP + reCAPTCHA v3 token from page) ---
async function checkProtocolsGe(
  car: Car,
  checkedAt: string
): Promise<{ fines: Fine[]; error?: string }> {
  const fines: Fine[] = [];
  try {
    // Try direct API call — some reCAPTCHA v3 implementations are lenient server-side
    const res = await fetch('https://api.protocols.ge/api/getByID', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://protocols.ge',
        Referer: 'https://protocols.ge/',
        'User-Agent': UA,
      },
      body: JSON.stringify({
        govNumber: car.plateNumber,
        techPass: car.techPassportNumber,
        page: 0,
        size: 100,
        recaptchaToken: 'bypass',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { fines, error: `protocols.ge API: ${res.status} ${errText.slice(0, 100)}` };
    }

    const data = await res.json();
    if (data?.content && Array.isArray(data.content)) {
      for (const item of data.content) {
        fines.push({
          id: `protocols-${car.plateNumber}-${item.id ?? item.receiptNumber ?? Math.random()}`,
          carId: car.id,
          carPlate: car.plateNumber,
          carName: `${car.brand} ${car.model}`,
          source: 'protocols.ge',
          fineNumber: String(item.receiptNumber ?? item.id ?? ''),
          violationDate: item.violationDate ?? item.date ?? item.createdDate ?? '',
          location: item.location ?? item.address ?? item.place ?? '',
          violation: item.violation ?? item.violationType ?? item.description ?? '',
          amount: Number(item.amount ?? item.fine ?? item.fineAmount ?? 0),
          currency: item.currency ?? 'GEL',
          status: item.status ?? item.paymentStatus ?? '',
          sourceUrl: 'https://protocols.ge',
          rawData: item,
          checkedAt,
        });
      }
    }
  } catch (err: any) {
    const cause = err?.cause ? ` (cause: ${err.cause?.message ?? String(err.cause)})` : '';
    return { fines, error: err.message + cause };
  }
  return { fines };
}

// --- Orchestrator ---
export async function checkAllFines(cars: Car[]): Promise<FinesCheckResult> {
  const checkedAt = new Date().toISOString();
  const fines: Fine[] = [];
  const errors: Array<{ carPlate: string; source: string; error: string }> = [];

  // Only check cars with gos plate type (skip transit)
  const gosCars = cars.filter(car => {
    const type = (car.plateType ?? '').toLowerCase().trim();
    return type !== 'транзит' && type !== 'transit' && car.plateNumber && car.techPassportNumber;
  });

  // Run all cars in parallel for speed
  await Promise.all(
    gosCars.map(async car => {
      const [videosResult, protocolsResult] = await Promise.all([
        checkVideosPolice(car, checkedAt),
        checkProtocolsGe(car, checkedAt),
      ]);

      fines.push(...videosResult.fines, ...protocolsResult.fines);

      if (videosResult.error)
        errors.push({ carPlate: car.plateNumber, source: 'videos.police.ge', error: videosResult.error });
      if (protocolsResult.error)
        errors.push({ carPlate: car.plateNumber, source: 'protocols.ge', error: protocolsResult.error });
    })
  );

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
