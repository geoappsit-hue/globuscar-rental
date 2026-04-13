import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-sheets';
import PizZip from 'pizzip';

export async function GET() {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const tid = process.env.GOOGLE_TEMPLATE_DOC_ID || '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';
    const resp = await drive.files.export({ fileId: tid, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, { responseType: 'arraybuffer' });
    const zip = new PizZip(Buffer.from(resp.data as ArrayBuffer));
    const doc = zip.file('word/document.xml');
    if (!doc) return NextResponse.json({ error: 'no doc xml' });
    const xml = doc.asText();
    const paras: string[] = [];
    const pr = /<w:p[ >][\s\S]*?<\/w:p>/g;
    let m;
    while ((m = pr.exec(xml)) !== null) {
      const txts: string[] = [];
      const tr = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let t2;
      while ((t2 = tr.exec(m[0])) !== null) txts.push(t2[1]);
      if (txts.length > 0) paras.push(txts.join(''));
    }
    const fullText = paras.join('\n');
    const found = Array.from(new Set(Array.from(fullText.matchAll(/\{\{([A-Z_]+)\}\}/g)).map((m: RegExpExecArray) => m[1]))).sort();
    return NextResponse.json({ vars_found: found });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
export const maxDuration = 30;
export const dynamic = 'force-dynamic';
