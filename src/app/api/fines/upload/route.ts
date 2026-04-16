import { NextRequest, NextResponse } from 'next/server';
import { setCachedFines } from '@/lib/fines-checker';
import { FinesCheckResult } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.FINES_UPLOAD_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: FinesCheckResult = await req.json();
    if (!body.fines || !Array.isArray(body.fines)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    setCachedFines(body);
    return NextResponse.json({ ok: true, finesCount: body.fines.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
