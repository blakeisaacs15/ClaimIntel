import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const codes = searchParams.get('codes')?.split(',') ?? [];

  if (!url) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
  }

  try {
    // Fetch the PDF or HTML from the payer source
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClaimIntel/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch payer source' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') ?? '';
    let rawText = '';

    if (contentType.includes('application/pdf')) {
      // PDF — return the URL for client-side or AI processing
      return NextResponse.json({
        type: 'pdf',
        url,
        codes,
        rules: `PDF source fetched. Send to AI with CDT codes: ${codes.join(', ')} for rule extraction.`,
      });
    } else {
      rawText = await response.text();
    }

    // Basic extraction — return raw text trimmed for AI consumption
    const trimmed = rawText
      .replace(/<[^>]+>/g, ' ')  // strip HTML tags
      .replace(/\s+/g, ' ')
      .slice(0, 8000);            // cap at 8k chars for AI context

    return NextResponse.json({
      type: 'html',
      url,
      codes,
      rules: trimmed,
    });

  } catch (err) {
    console.error('payer-fetch error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}