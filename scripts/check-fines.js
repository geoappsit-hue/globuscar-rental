/**
 * Локальный скрипт проверки штрафов.
 * Запускать с компьютера в Грузии — грузинские сайты не блокируют локальные IP.
 *
 * Использование:
 *   node scripts/check-fines.js
 *
 * Переменные окружения (можно задать в .env.local или прямо в командной строке):
 *   FINES_UPLOAD_KEY  — секретный ключ (тот же что в Vercel FINES_UPLOAD_KEY)
 *   ADMIN_URL         — URL вашей админки (по умолчанию https://admin.georgian-cars.com)
 *   SPREADSHEET_ID    — ID Google Sheets таблицы с машинами
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 */

'use strict';

const https = require('https');
const http = require('http');

// ── Настройки ────────────────────────────────────────────────────────────────
const ADMIN_URL = process.env.ADMIN_URL || 'https://admin.georgian-cars.com';
const UPLOAD_KEY = process.env.FINES_UPLOAD_KEY || '';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || '';
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function parseHtmlTables(html) {
  const rows = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(html)) !== null) {
    const cells = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdMatch;
    while ((tdMatch = tdRe.exec(trMatch[0])) !== null) {
      const text = tdMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      cells.push(text);
    }
    if (cells.length >= 2) rows.push(cells);
  }
  return rows;
}

// ── Google Sheets: получить список машин ────────────────────────────────────
async function getCars() {
  if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    console.log('⚠  Google Sheets не настроен, используем тестовые данные');
    return [];
  }

  // JWT для Google API
  const jwt = require('jsonwebtoken');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const token = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });

  const tokenRes = await fetchUrl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
  });
  const { access_token } = JSON.parse(tokenRes.body);

  const sheetsRes = await fetchUrl(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A2:AL?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const data = JSON.parse(sheetsRes.body);
  const rows = data.values || [];

  const COL = { ID: 0, BRAND: 1, MODEL: 2, PLATE: 3, TECH_PASSPORT: 4, PLATE_TYPE: 5, NOTE: 33 };

  return rows
    .filter(r => r[COL.NOTE] !== 'удалён')
    .map(r => ({
      id: r[COL.ID] || '',
      brand: r[COL.BRAND] || '',
      model: r[COL.MODEL] || '',
      plateNumber: r[COL.PLATE] || '',
      techPassportNumber: r[COL.TECH_PASSPORT] || '',
      plateType: r[COL.PLATE_TYPE] || '',
    }))
    .filter(c => c.plateNumber);
}

// ── Проверка videos.police.ge ────────────────────────────────────────────────
async function checkVideosPolice(car, checkedAt) {
  const fines = [];
  try {
    const initRes = await fetchUrl('https://videos.police.ge/?lang=en', {
      headers: { 'User-Agent': UA },
    });
    const rawCookies = (initRes.headers['set-cookie'] || []);
    const cookieHeader = (Array.isArray(rawCookies) ? rawCookies : [rawCookies])
      .map(c => c.split(';')[0]).join('; ');
    const tokenMatch = initRes.body.match(/name=["']?token["']?\s+value=["']([^"']+)["']/i);
    const token = tokenMatch?.[1] || '';

    const body = new URLSearchParams({ documentNo: car.techPassportNumber, vehicleNo2: car.plateNumber, lang: 'en' });
    if (token) body.set('token', token);

    const postRes = await fetchUrl('https://videos.police.ge/submit-index.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        Referer: 'https://videos.police.ge/?lang=en',
        Cookie: cookieHeader,
      },
      body: body.toString(),
    });

    const rows = parseHtmlTables(postRes.body);
    const isHeader = row => row.every(c => /^(#|N|Date|Status|Amount|Protocol|Plate|Tech|ტ|დ)/i.test(c) || c === '');
    const dataRows = rows.filter(r => !isHeader(r));

    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i];
      const amountStr = cells.find(c => /^\d[\d\s.,]*$/.test(c)) || '0';
      fines.push({
        id: `videos-${car.plateNumber}-${i}`,
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
        checkedAt,
      });
    }
    return { fines };
  } catch (err) {
    return { fines, error: err.message };
  }
}

// ── Проверка protocols.ge ────────────────────────────────────────────────────
async function checkProtocolsGe(car, checkedAt) {
  const fines = [];
  try {
    // Загружаем страницу для получения reCAPTCHA токена — пропускаем если нет puppeteer
    // Пробуем без токена (иногда работает с локального IP)
    const res = await fetchUrl('https://api.protocols.ge/api/getByID', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://protocols.ge',
        Referer: 'https://protocols.ge/',
        'User-Agent': UA,
      },
      body: JSON.stringify({ govNumber: car.plateNumber, techPass: car.techPassportNumber, page: 0, size: 100, recaptchaToken: '' }),
    });

    if (res.status !== 200) return { fines, error: `HTTP ${res.status}: ${res.body.slice(0, 100)}` };

    const data = JSON.parse(res.body);
    if (data?.content && Array.isArray(data.content)) {
      for (const item of data.content) {
        fines.push({
          id: `protocols-${car.plateNumber}-${item.id || item.receiptNumber || Math.random()}`,
          carId: car.id,
          carPlate: car.plateNumber,
          carName: `${car.brand} ${car.model}`,
          source: 'protocols.ge',
          fineNumber: String(item.receiptNumber || item.id || ''),
          violationDate: item.violationDate || item.date || '',
          location: item.location || item.address || '',
          violation: item.violation || item.violationType || '',
          amount: Number(item.amount || item.fine || 0),
          currency: item.currency || 'GEL',
          status: item.status || item.paymentStatus || '',
          sourceUrl: 'https://protocols.ge',
          checkedAt,
        });
      }
    }
    return { fines };
  } catch (err) {
    return { fines, error: err.message };
  }
}

// ── Главная функция ──────────────────────────────────────────────────────────
async function main() {
  console.log('🚗 Проверка штрафов GlobusCar\n');

  if (!UPLOAD_KEY) {
    console.error('❌ Не задан FINES_UPLOAD_KEY. Добавьте в .env.local или задайте переменную окружения.');
    process.exit(1);
  }

  console.log('📋 Загружаем список машин...');
  let cars = await getCars();

  if (cars.length === 0) {
    console.log('⚠  Список машин пуст. Убедитесь, что заданы переменные GOOGLE_*');
    console.log('   Для теста добавьте машины вручную в код скрипта.');
    process.exit(0);
  }

  const gosCars = cars.filter(c => {
    const t = (c.plateType || '').toLowerCase().trim();
    return t !== 'транзит' && t !== 'transit' && c.plateNumber && c.techPassportNumber;
  });
  const skipped = cars.length - gosCars.length;

  console.log(`✅ Машин всего: ${cars.length}, проверяем: ${gosCars.length}, пропускаем транзит: ${skipped}\n`);

  const checkedAt = new Date().toISOString();
  const fines = [];
  const errors = [];

  for (const car of gosCars) {
    process.stdout.write(`  ${car.plateNumber} ... `);

    const [v, p] = await Promise.all([
      checkVideosPolice(car, checkedAt),
      checkProtocolsGe(car, checkedAt),
    ]);

    const carFines = [...v.fines, ...p.fines];
    fines.push(...carFines);
    if (v.error) errors.push({ carPlate: car.plateNumber, source: 'videos.police.ge', error: v.error });
    if (p.error) errors.push({ carPlate: car.plateNumber, source: 'protocols.ge', error: p.error });

    console.log(carFines.length > 0 ? `🔴 ${carFines.length} штраф(ов)` : '✅ чисто');
  }

  const result = { fines, errors, checkedAt, carsChecked: gosCars.length, carsSkipped: skipped };

  console.log(`\n📤 Загружаем результаты в админку...`);
  const uploadRes = await fetchUrl(`${ADMIN_URL}/api/fines/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': UPLOAD_KEY,
    },
    body: JSON.stringify(result),
  });

  if (uploadRes.status === 200) {
    console.log(`✅ Готово! Штрафов найдено: ${fines.length}, ошибок: ${errors.length}`);
    console.log(`   Откройте ${ADMIN_URL}/dashboard/fines для просмотра.`);
  } else {
    console.error(`❌ Ошибка загрузки: ${uploadRes.status} ${uploadRes.body}`);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
