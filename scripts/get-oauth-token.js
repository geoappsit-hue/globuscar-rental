/**
 * Скрипт для получения OAuth2 refresh token.
 * Запускать один раз локально: node scripts/get-oauth-token.js
 *
 * Нужно заранее:
 * 1. В Google Cloud Console (console.cloud.google.com) → проект georgian-cars-crm
 * 2. APIs & Services → Credentials → Create Credentials → OAuth client ID
 * 3. Application type: Desktop app
 * 4. Скопировать Client ID и Client Secret → вставить ниже
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// ✏️ ВСТАВЬ СЮДА Client ID и Client Secret из Google Cloud Console
const CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'ВСТАВЬ_CLIENT_ID';
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || 'ВСТАВЬ_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3333';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // создавать файлы в Drive
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // важно: получаем refresh_token
  scope: SCOPES,
});

console.log('\n🔗 Открываю браузер для авторизации...');
console.log('Если браузер не открылся, перейди по ссылке вручную:\n');
console.log(authUrl);
console.log('\n⏳ Жду авторизации...\n');

// Запускаем временный HTTP сервер для получения кода
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;

  if (!code) {
    res.end('Ошибка: code не получен');
    return;
  }

  res.end('<h2>✅ Авторизация успешна! Вернись в терминал.</h2>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Токены получены!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Добавь в .env и в Vercel Environment Variables:\n');
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (!tokens.refresh_token) {
      console.log('⚠️  refresh_token не получен!');
      console.log('Причина: аккаунт уже авторизовал это приложение ранее.');
      console.log('Решение: перейди по ссылке и выбери "Использовать другой аккаунт",');
      console.log('или отзови доступ на https://myaccount.google.com/permissions и запусти скрипт снова.\n');
    }
  } catch (err) {
    console.error('❌ Ошибка получения токена:', err.message);
  }
}).listen(3333);

// Открываем браузер
try {
  const openModule = require('open');
  const openFn = typeof openModule === 'function' ? openModule : openModule.default;
  openFn(authUrl);
} catch {
  // open не установлен — пользователь откроет ссылку вручную
}
