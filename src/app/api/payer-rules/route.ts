import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { payerContent, cdtCodes, payerName, planType } = await request.json();

    if (!payerContent || !cdtCodes?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are a dental billing expert. Extract the specific coverage rules for the following CDT codes from this payer document.

Payer: ${payerName}
Plan Type: ${planType}
CDT Codes to look up: ${cdtCodes.join(', ')}

Payer Document Content:
${payerContent}

Return ONLY a JSON array with this exact structure, no other text:
[
  {
    "cdtCode": "D0120",
    "description": "brief description",
    "covered": true,
    "frequencyLimit": "2x per year",
    "ageRestriction": null,
    "alternateBenefit": null,
    "requiresPreAuth": false,
    "exclusions": [],
    "denialRisk": "low"
  }
]

denialRisk should be "low", "medium", or "high" based on how often this code gets denied by this payer.
If a code is not mentioned in the document, set covered to null and note it as unknown.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let rules;
    try {
      rules = JSON.parse(responseText);
    } catch {
      rules = { raw: responseText };
    }

    return NextResponse.json({ rules, payerName, planType });

  } catch (err) {
    console.error('payer-rules error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}