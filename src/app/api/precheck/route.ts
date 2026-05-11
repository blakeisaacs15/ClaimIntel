// Supabase table required:
//
// create table precheck_history (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references auth.users not null,
//   checked_at timestamptz default now(),
//   payer text not null,
//   patient_age integer,
//   last_treatment_date date,
//   tooth_number text,
//   pre_auth_obtained boolean default false,
//   results jsonb not null default '[]'::jsonb
// );
// alter table precheck_history enable row level security;
// create policy "Users can read own precheck history" on precheck_history for select using (auth.uid() = user_id);
// create policy "Users can insert own precheck history" on precheck_history for insert with check (auth.uid() = user_id);

import { NextRequest, NextResponse } from 'next/server';
import { getCDTContext, getPayerContext } from '@/lib/dental-knowledge';
import { createUserClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';

    const { codes, payer, patientAge, lastTreatmentDate, toothNumber, preAuthObtained } =
      await request.json();

    if (!codes?.length || !payer || patientAge == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cdtContext = getCDTContext(codes);
    const payerContext = getPayerContext([payer]);
    const knowledgeBlock = [cdtContext, payerContext].filter(Boolean).join('\n\n');

    const claimDetails = [
      `Procedure codes: ${codes.join(', ')}`,
      `Payer / Insurance: ${payer}`,
      `Patient age: ${patientAge}`,
      lastTreatmentDate
        ? `Date of last treatment for this procedure: ${lastTreatmentDate}`
        : 'Date of last treatment: not provided',
      toothNumber ? `Tooth number: ${toothNumber}` : 'Tooth number: not provided',
      `Pre-authorization obtained: ${preAuthObtained ? 'Yes' : 'No'}`,
    ].join('\n');

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: `You are an expert dental insurance billing specialist. Evaluate each procedure code for claim risk before submission using ONLY the rules in the knowledge base below. Respond with ONLY a valid JSON array, no markdown, no explanation.

${knowledgeBlock || 'No specific knowledge base rules found for these codes/payer — use general dental billing knowledge.'}`,
        messages: [
          {
            role: 'user',
            content: `Evaluate these claim details and return a risk assessment for each procedure code.

${claimDetails}

Return a JSON array (one element per code) where each object has:
- "code": the procedure code string
- "status": "GREEN" (likely to pay), "YELLOW" (needs attention / at risk), or "RED" (likely to deny)
- "ruleFlag": the specific rule being triggered (e.g. "D2740 requires pre-authorization for Delta Dental — none obtained"), or "No issues identified" for GREEN
- "fixAction": one actionable step to take before submitting (e.g. "Submit pre-authorization request with pre-op X-ray and clinical narrative to Delta Dental before proceeding"), or "Ready to submit" for GREEN
- "confidence": "High", "Medium", or "Low"

Consider: pre-authorization requirements, frequency limitations, patient age restrictions, bundling rules, downgrade/alternate benefit policies, documentation requirements, waiting periods, and whether pre-auth was obtained.

Return ONLY the JSON array.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('Anthropic API error:', await aiResponse.text());
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const data = await aiResponse.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const results = JSON.parse(clean);

    if (token) {
      try {
        const client = createUserClient(token);
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          await client.from('precheck_history').insert({
            user_id: user.id,
            payer,
            patient_age: patientAge,
            last_treatment_date: lastTreatmentDate || null,
            tooth_number: toothNumber || null,
            pre_auth_obtained: preAuthObtained,
            results,
          });
        }
      } catch {
        // Non-fatal — table may not exist yet
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Precheck error:', error);
    return NextResponse.json({ error: 'Pre-check failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    if (!token) return NextResponse.json({ history: [] });

    const client = createUserClient(token);
    const { data, error } = await client
      .from('precheck_history')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ history: [] });
    return NextResponse.json({ history: data ?? [] });
  } catch {
    return NextResponse.json({ history: [] });
  }
}
