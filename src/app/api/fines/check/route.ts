import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCars } from '@/lib/google-sheets';
import { checkAllFines } from '@/lib/fines-checker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds (requires Vercel Pro)

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const cars = await getCars();
    if (cars.length === 0) {
      return NextResponse.json({ error: 'Нет автомобилей в базе' }, { status: 400 });
    }

    const result = await checkAllFines(cars);
    return NextResponse.json({ data: result });
  } catch (err: any) {
    console.error('Fines check error:', err);
    return NextResponse.json({ error: err.message || 'Ошибка проверки штрафов' }, { status: 500 });
  }
}
