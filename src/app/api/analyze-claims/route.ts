import { NextRequest, NextResponse } from 'next/server';
import { getCDTContext, getPayerContext, extractCDTCodes, extractPayers } from '@/lib/dental-knowledge';

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
      provider: row['rendering_provider'] || row['provider_name'] || row['provider'] || row['doctor'] || row['dentist'] || row['treating_provider'] || '',
      status: 'denied',
    };
  }).filter(c => c.patient !== 'Unknown' || c.payer !== 'Unknown');
}

export async function POST(request: NextRequest) {
  try {
    const { csvData } = await request.json();

    const claims = parseCSV(csvData);

    const payers = extractPayers(claims);
    const codes = extractCDTCodes(claims);
    const cdtContext = getCDTContext(codes);
    const payerContext = getPayerContext(payers);

    // Fetch live payer rules from public manuals
    let livePayerRules = '';
    try {
      const { getUHCMedicaidUrl } = await import('@/lib/payer-sources/index');
      const uhcPayers = payers.filter((p: string) =>
        p.toLowerCase().includes('united') ||
        p.toLowerCase().includes('uhc')
      );
      if (uhcPayers.length > 0) {
        const fetchRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/payer-fetch?url=${encodeURIComponent(getUHCMedicaidUrl('IN'))}&codes=${codes.join(',')}`
        );
        if (fetchRes.ok) {
          const fetchData = await fetchRes.json();
          if (fetchData.rules) {
            const rulesRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payer-rules`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payerContent: fetchData.rules,
                cdtCodes: codes,
                payerName: 'UnitedHealthcare',
                planType: 'medicaid',
              }),
            });
            if (rulesRes.ok) {
              const rulesData = await rulesRes.json();
              livePayerRules = `\n\nLIVE UHC MEDICAID RULES:\n${JSON.stringify(rulesData.rules, null, 2)}`;
            }
          }
        }
      }
    } catch (e) {
      console.error('Live payer rules fetch failed, continuing with static rules:', e);
    }

    const knowledgeBlock = [cdtContext, payerContext, livePayerRules].filter(Boolean).join('\n\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: `You are an expert dental insurance billing specialist with deep knowledge of CDT procedure codes, payer policies, frequency limitations, and denial patterns. Analyze denied dental claims using ONLY the rules provided in the knowledge base below. Do not invent rules not listed. Respond with ONLY a valid JSON object, no other text. Keep descriptions under 200 characters each to stay within token limits.

${knowledgeBlock}`,
        messages: [
          {
            role: 'user',
            content: `Analyze these denied dental claims. Return ONLY a JSON object — no markdown, no explanation, just the raw JSON.

{
  "totalDenied": number,
  "revenueAtRisk": number,
  "topDenialReasons": [{"reason": string, "count": number, "percentage": number}],
  "payerBreakdown": [{"payer": string, "denialCount": number, "denialRate": number}],
  "actionItems": [{"priority": "HIGH"|"MEDIUM"|"LOW", "title": string, "description": string}],
  "insight": string
}

Rules: max 5 actionItems, keep all string values under 200 chars, insight under 300 chars.

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
    const stopReason = data.stop_reason;
    if (stopReason === 'max_tokens') {
      console.error('AI response truncated at max_tokens. Response so far:', text.slice(0, 500));
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON object found in AI response (stop_reason:', stopReason, '):', text.slice(0, 500));
      return NextResponse.json({ success: false, error: 'Invalid API response format' }, { status: 500 });
    }
    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON.parse failed (stop_reason:', stopReason, '). Matched text:', jsonMatch[0].slice(0, 500));
      return NextResponse.json({ success: false, error: 'Response JSON malformed — try a smaller CSV or fewer claims' }, { status: 500 });
    }

    analysis.claims = claims;

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 });
  }
}