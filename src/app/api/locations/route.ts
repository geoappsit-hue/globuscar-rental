import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLocationOptions } from '@/lib/google-sheets';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const [delivery, returnOptions] = await Promise.all([
      getLocationOptions('Доставка'),
      getLocationOptions('Возврат'),
    ]);
    return NextResponse.json({ delivery, return: returnOptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
