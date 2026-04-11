import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-sheets';

export async function POST() {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    // List all files owned by service account
    let deleted = 0;
    let pageToken: string | undefined;

    do {
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.document' and trashed=false",
        fields: 'nextPageToken, files(id, name, createdTime)',
        pageSize: 100,
        pageToken,
      });

      const files = res.data.files || [];
      for (const file of files) {
        // Skip the template
        if (file.id === '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o') continue;
        try {
          await drive.files.delete({ fileId: file.id! });
          deleted++;
        } catch (e) {
          // skip files we can't delete
        }
      }
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    // Also empty trash
    try {
      await drive.files.emptyTrash();
    } catch (e) {}

    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
