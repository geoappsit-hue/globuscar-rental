import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedFines } from '@/lib/fines-checker';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cached = getCachedFines();
  if (!cached) {
    return NextResponse.json({ data: null, message: 'Данные ещё не загружены. Нажмите «Проверить штрафы».' });
  }
  return NextResponse.json({ data: cached });
}
