import { NextRequest, NextResponse } from 'next/server';

function parseCSV(csvData: string) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
  
  return lines.slice(1).map((line, i) => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ''; });
    
    return {
      id: row['claim_id'] || `CLM-${String(i + 1).padStart(3, '0')}`,
      patient: row['patient_name'] || row['patient'] || 'Unknown',
      payer: row['payer'] || row['insurance'] || 'Unknown',
      procedure: row['procedure_code'] || row['procedure'] || '—',
      amount: parseFloat((row['billed_amount'] || row['amount'] || '0').replace(/[$,]/g, '')) || 0,
      reason: row['denial_reason'] || row['reason'] || '—',
      date: row['date_of_service'] || row['date'] || '—',
      status: 'denied',
    };
  }).filter(c => c.patient !== 'Unknown' || c.payer !== 'Unknown');
}

export async function POST(request: NextRequest) {
  try {
    const { csvData } = await request.json();

    // Parse claims directly from CSV
    const claims = parseCSV(csvData);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: `You are an expert dental insurance billing specialist. Analyze denied dental claims and respond with ONLY a valid JSON object, no other text.`,
        messages: [
          {
            role: 'user',
            content: `Analyze these denied dental claims and return ONLY a JSON object with these exact fields:
            {
              "totalDenied": number,
              "revenueAtRisk": number,
              "topDenialReasons": [{"reason": string, "count": number, "percentage": number}],
              "payerBreakdown": [{"payer": string, "denialCount": number, "denialRate": number}],
              "actionItems": [{"priority": string, "title": string, "description": string}],
              "insight": string
            }
            
            Claims data:
            ${csvData}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return NextResponse.json({ success: false, error: 'API request failed' }, { status: 500 });
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0]) {
      console.error('Unexpected response structure:', JSON.stringify(data));
      return NextResponse.json({ success: false, error: 'Unexpected API response' }, { status: 500 });
    }

    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(clean);

    // Attach parsed claims to the response
    analysis.claims = claims;

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 });
  }
}