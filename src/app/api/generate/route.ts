import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCarById } from '@/lib/google-sheets';
import { generateGoogleDoc, generateDocx, generatePdf } from '@/lib/contract-generator';
import { ContractData, OutputFormat } from '@/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { carId, client, rental, format } = body as {
      carId: string;
      client: ContractData['client'];
      rental: ContractData['rental'];
      format: OutputFormat;
    };

    const car = await getCarById(carId);
    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    const contractData: ContractData = { car, client, rental };
    const baseName = `Contract_${rental.contractNumber.replace(/\//g, '_')}`;

    switch (format) {
      case 'gdocs': {
        const docUrl = await generateGoogleDoc(contractData);
        return NextResponse.json({ success: true, url: docUrl, format: 'gdocs' });
      }

      case 'docx': {
        const buffer = await generateDocx(contractData);
        return new Response(new Uint8Array(buffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${baseName}.docx"`,
          },
        });
      }

      case 'pdf': {
        // PDF generation requires Google Drive storage which is unavailable for service accounts.
        // Return DOCX instead with appropriate filename.
        const buffer = await generatePdf(contractData);
        return new Response(new Uint8Array(buffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${baseName}.docx"`,
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Generate Error:', error);
    return NextResponse.json(
      { error: 'Contract generation failed: ' + error.message },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
export const dynamic = 'force-dynamic';
