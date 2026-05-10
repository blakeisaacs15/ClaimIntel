import { NextResponse } from 'next/server';

const OD_BASE = 'https://api.opendental.com/api/v1';
const OD_AUTH = 'ODFHIR NFF6i0KrXrxDkZHt/VzkmZEaUWOjnQX2z';

async function odFetch(path: string) {
  const res = await fetch(`${OD_BASE}${path}`, {
    headers: { Authorization: OD_AUTH, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Open Dental ${path} returned ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const holdClaims: any[] = await odFetch('/claims?ClaimStatus=H');

    const claimsWithProcs = await Promise.all(
      holdClaims.map(async (claim: any) => {
        const procs: any[] = await odFetch(`/claimprocs?ClaimNum=${claim.ClaimNum}`);
        return { ...claim, procedures: procs };
      })
    );

    const totalAtRisk = claimsWithProcs.reduce((sum, c) => sum + (c.ClaimFee ?? 0), 0);

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: 'You are an expert dental insurance billing specialist. Analyze hold claims and respond with ONLY valid JSON, no other text.',
        messages: [
          {
            role: 'user',
            content: `These dental claims have ClaimStatus=H (on hold, not yet submitted). Each includes its procedure codes. For each claim, identify the most likely reason it is on hold and provide one specific, actionable step to get it released.

Claims:
${JSON.stringify(claimsWithProcs, null, 2)}

Respond with ONLY this JSON structure:
{
  "insight": "one sentence summarizing the overall pattern across these hold claims",
  "claimActions": [
    {
      "claimNum": number,
      "reason": "why this claim is likely on hold",
      "action": "specific step to take to release it",
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
