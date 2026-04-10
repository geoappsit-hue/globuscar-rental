import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recognizePassport } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const result = await recognizePassport(image);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed: ' + error.message },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const maxDuration = 30; // max execution time in seconds
export const dynamic = 'force-dynamic';
