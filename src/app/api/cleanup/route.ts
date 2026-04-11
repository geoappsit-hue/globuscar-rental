import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-sheets';

export async function GET() {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Check storage quota
    const about = await drive.about.get({ fields: 'storageQuota, user' });
    const quota = about.data.storageQuota;
    const user = about.data.user;

    // List all files
    const allFiles = await drive.files.list({
      q: "trashed=false",
      fields: 'files(id, name, mimeType, size, createdTime)',
      pageSize: 50,
    });

    // List trashed files
    const trashedFiles = await drive.files.list({
      q: "trashed=true",
      fields: 'files(id, name, mimeType, size)',
      pageSize: 50,
    });

    return NextResponse.json({
      user: user?.emailAddress,
      quota: {
        limit: quota?.limit,
        usage: quota?.usage,
        usageInDrive: quota?.usageInDrive,
        usageInDriveTrash: quota?.usageInDriveTrash,
      },
      filesCount: allFiles.data.files?.length || 0,
      files: (allFiles.data.files || []).map(f => ({ name: f.name, type: f.mimeType, size: f.size })),
      trashedCount: trashedFiles.data.files?.length || 0,
      trashed: (trashedFiles.data.files || []).map(f => ({ name: f.name, size: f.size })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    let deleted = 0;
    let pageToken: string | undefined;

    do {
      const res = await drive.files.list({
        q: "trashed=false",
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize: 100,
        pageToken,
      });
      const files = res.data.files || [];
      for (const file of files) {
        if (file.id === '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o') continue;
        try {
          await drive.files.delete({ fileId: file.id! });
          deleted++;
        } catch (e) {}
      }
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    try { await drive.files.emptyTrash(); } catch (e) {}
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
