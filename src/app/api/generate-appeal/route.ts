import { NextRequest, NextResponse } from 'next/server';
import { getCDTContext, getPayerContext } from '@/lib/dental-knowledge';

export async function POST(request: NextRequest) {
  try {
    const { claim } = await request.json();

    const codes = claim.procedure_code ? [claim.procedure_code] : [];
    const payers = claim.payer ? [claim.payer] : [];
    const cdtContext = getCDTContext(codes);
    const payerContext = getPayerContext(payers);
    const knowledgeBlock = [cdtContext, payerContext].filter(Boolean).join('\n\n');

    const claimDetails = `
Patient Name: ${claim.patient ?? 'Unknown'}
Claim ID: ${claim.claim_id ?? claim.id ?? 'N/A'}
Insurance Company / Payer: ${claim.payer ?? 'Unknown'}
Procedure Code: ${claim.procedure_code ?? '—'}
Date of Service: ${claim.date_of_service ?? claim.date ?? '—'}
Billed Amount: $${Number(claim.amount || 0).toLocaleString()}
Denial Reason: ${claim.denial_reason ?? claim.reason ?? '—'}
`.trim();

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
        system: `You are an expert dental insurance billing specialist writing professional appeal letters on behalf of dental practices. Write formal, persuasive appeal letters that cite specific plan requirements, CDT code rules, and clinical justifications. Use only the rules provided in the knowledge base below — do not invent rules.

${knowledgeBlock}`,
        messages: [
          {
            role: 'user',
            content: `Write a professional dental insurance appeal letter for the following denied claim. The letter is from the treating dental practice to the insurance company's appeals department.

${claimDetails}

The letter must:
1. Start with today's date (${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}) and a formal inside address block: "[Practice Name]", "[Practice Address]", "[City, State ZIP]", "[Practice Phone]", then a blank line, then the payer's appeals department address block.
2. Include a RE: line: "RE: Appeal of Claim Denial — Patient: [name], Claim #: [id], Date of Service: [date]"
3. Open with "Dear Appeals Department,"
4. In the opening paragraph, identify the claim being appealed and state that you are formally appealing the denial.
5. In the body (2–3 paragraphs), make the specific clinical and billing argument for why the denial should be overturned. Cite the exact denial reason and counter it with the relevant CDT code requirements, payer-specific rules, or clinical justification from the knowledge base. Be specific and factual.
6. Include a bulleted list of supporting documentation being submitted with the appeal (e.g., clinical notes, X-rays, periodontal charting — match to what the denial reason and procedure actually require).
7. Request a response within 30 days and provide placeholder contact info.
8. Close with "Sincerely," and a signature block: "[Provider Name, DDS/DMD]", "[Practice Name]", "[NPI: XXXXXXXXXX]".

Return ONLY the letter text. No preamble, no commentary after the letter.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 });
    }

    const data = await response.json();
    const letter = data.content?.[0]?.text ?? '';

    return NextResponse.json({ letter });
  } catch (error) {
    console.error('generate-appeal error:', error);
    return NextResponse.json({ error: 'Appeal generation failed' }, { status: 500 });
  }
}
