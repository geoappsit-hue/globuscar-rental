import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-sheets';
import PizZip from 'pizzip';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'passthrough';
    
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const templateDocId = process.env.GOOGLE_TEMPLATE_DOC_ID || '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';
    
    const response = await drive.files.export({
      fileId: templateDocId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }, { responseType: 'arraybuffer' });
    
    const buf = Buffer.from(response.data as ArrayBuffer);
    
    if (mode === 'raw') {
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="raw.docx"',
        },
      });
    }
    
    if (mode === 'passthrough') {
      // PizZip open and regenerate WITHOUT any modifications
      const zip = new PizZip(buf);
      const out = zip.generate({ type: 'uint8array', compression: 'DEFLATE' });
      return new Response(out, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="passthrough.docx"',
          'X-Original-Size': buf.length.toString(),
          'X-Output-Size': out.length.toString(),
        },
      });
    }
    
    if (mode === 'passthrough-nocomp') {
      const zip = new PizZip(buf);
      const out = zip.generate({ type: 'uint8array' });
      return new Response(out, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="passthrough_nocomp.docx"',
        },
      });
    }
    
    if (mode === 'replace') {
      // PizZip with actual text replacement
      const zip = new PizZip(buf);
      const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
        'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'];
      for (const xmlFile of xmlFiles) {
        const file = zip.file(xmlFile);
        if (!file) continue;
        let content = file.asText();
        content = content.split('MAKSIMOV SERGEI').join('TEST CLIENT');
        zip.file(xmlFile, content);
      }
      const out = zip.generate({ type: 'uint8array', compression: 'DEFLATE' });
      return new Response(out, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="replaced.docx"',
        },
      });
    }
    
    return NextResponse.json({ modes: ['raw', 'passthrough', 'passthrough-nocomp', 'replace'] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

export const maxDuration = 30;
export const dynamic = 'force-dynamic';
