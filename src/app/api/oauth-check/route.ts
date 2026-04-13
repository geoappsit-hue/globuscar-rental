import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    return NextResponse.json({
      ok: true,
      token_prefix: token ? token.slice(0, 10) + '...' : null,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
      code: e.code,
      status: e.status,
    }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
