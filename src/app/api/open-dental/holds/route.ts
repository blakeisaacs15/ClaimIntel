import { NextResponse } from 'next/server';
import { supabase, createUserClient } from '@/lib/supabase';
import { getCDTContext, extractCDTCodes, HOLD_PATTERNS } from '@/lib/dental-knowledge';

const OD_BASE = 'https://api.opendental.com/api/v1';

async function odFetch(path: string, odAuth: string) {
  const res = await fetch(`${OD_BASE}${path}`, {
    headers: { Authorization: odAuth, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Open Dental ${path} returned ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createUserClient(token);
    const { data: settings } = await db
      .from('user_settings')
      .select('od_customer_key')
      .eq('user_id', user.id)
      .single();

    if (!settings?.od_customer_key) {
      return NextResponse.json(
        { error: 'Open Dental API key not configured. Go to Settings to add your key.', code: 'NO_OD_KEY' },
        { status: 400 }
      );
    }

    const odAuth = settings.od_customer_key;

    const holdClaims: any[] = await odFetch('/claims?ClaimStatus=H', odAuth);

    const claimsWithProcs = await Promise.all(
      holdClaims.map(async (claim: any) => {
        const procs: any[] = await odFetch(`/claimprocs?ClaimNum=${claim.ClaimNum}`, odAuth);
        return { ...claim, procedures: procs };
      })
    );

    const totalAtRisk = claimsWithProcs.reduce((sum, c) => sum + (c.ClaimFee ?? 0), 0);

    // Build knowledge context from the actual codes present in these claims
    const codes = extractCDTCodes(claimsWithProcs);
    const cdtContext = getCDTContext(codes);
    const knowledgeBlock = [cdtContext, HOLD_PATTERNS].filter(Boolean).join('\n\n');

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: `You are an expert dental insurance billing specialist with deep knowledge of CDT procedure codes, payer policies, and claim submission requirements. Analyze hold claims using ONLY the rules provided in the knowledge base below. Do not invent rules not listed. Respond with ONLY valid JSON, no other text.

${knowledgeBlock}`,
        messages: [
          {
            role: 'user',
            content: `These dental claims have ClaimStatus=H in Open Dental — they are being held at the practice and have NOT yet been submitted to the insurance carrier.

Using the billing knowledge base in your system prompt, identify the most likely reason each claim is on hold and provide one specific, actionable step to get it released.

Claims:
${JSON.stringify(claimsWithProcs, null, 2)}

Respond with ONLY this JSON structure:
{
  "insight": "one sentence summarizing the overall pattern across these hold claims",
  "claimActions": [
    {
      "claimNum": number,
      "reason": "why this claim is likely on hold, citing the specific rule or requirement",
      "action": "specific step to take to release it (e.g., attach perio charting, obtain pre-auth, verify eligibility)",
      "priority": "critical" | "high" | "medium",
      "effort": "easy" | "medium" | "hard",
      "category": "authorization" | "coding" | "documentation" | "eligibility" | "billing"
    }
  ]
}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) throw new Error(`Anthropic API returned ${aiRes.status}`);

    const aiData = await aiRes.json();
    const raw = aiData.content[0].text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(raw);

    return NextResponse.json({
      claims: claimsWithProcs,
      totalAtRisk,
      insight: analysis.insight,
      claimActions: analysis.claimActions,
    });
  } catch (err: any) {
    console.error('holds route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
