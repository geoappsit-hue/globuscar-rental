import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-sheets';

export async function GET() {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const templateDocId = process.env.GOOGLE_TEMPLATE_DOC_ID || '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';
    
    const response = await drive.files.export({
      fileId: templateDocId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }, { responseType: 'arraybuffer' });
    
    const buf = Buffer.from(response.data as ArrayBuffer);
    
    // Return debug info + raw file
    const isZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
    
    // Return raw template as-is
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="raw_template.docx"',
        'X-Debug-Size': buf.length.toString(),
        'X-Debug-IsZip': isZip.toString(),
        'X-Debug-First4': buf.slice(0, 4).toString('hex'),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

export const maxDuration = 30;
export const dynamic = 'force-dynamic';
