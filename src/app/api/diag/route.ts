import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-sheets';

export async function GET() {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sid = process.env.GOOGLE_SPREADSHEET_ID!;
    const [delivery, ret] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Доставка!A1:D20' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Возврат!A1:D20' }),
    ]);
    return NextResponse.json({
      delivery: delivery.data.values,
      return: ret.data.values,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
export const maxDuration = 30;
export const dynamic = 'force-dynamic';
