import { NextResponse } from 'next/server';

export async function GET() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const token = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';
  return NextResponse.json({
    client_id_len: id.length,
    client_id_start: id.slice(0, 6),
    client_id_end: id.slice(-4),
    client_id_has_cr: id.includes('\r'),
    secret_len: secret.length,
    secret_start: secret.slice(0, 8),
    secret_has_cr: secret.includes('\r'),
    token_len: token.length,
    token_start: token.slice(0, 6),
    token_has_cr: token.includes('\r'),
  });
}
export const dynamic = 'force-dynamic';
