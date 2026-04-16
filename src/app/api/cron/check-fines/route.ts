import { NextRequest, NextResponse } from 'next/server';
import { getCars } from '@/lib/google-sheets';
import { checkAllFines } from '@/lib/fines-checker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Protect cron endpoint
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cars = await getCars();
    const result = await checkAllFines(cars);
    return NextResponse.json({
      ok: true,
      finesFound: result.fines.length,
      carsChecked: result.carsChecked,
      errors: result.errors.length,
      checkedAt: result.checkedAt,
    });
  } catch (err: any) {
    console.error('Cron fines check error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
