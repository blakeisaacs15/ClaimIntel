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

    const isHoldClaim = !!claim.isHoldClaim;

    const claimDetails = `
Patient: ${claim.patient ?? 'Unknown'}
Claim ID: ${claim.claim_id ?? claim.id ?? 'N/A'}
Insurance Company / Payer: ${claim.payer ?? 'Unknown'}
Procedure Code(s): ${claim.procedure_code ?? '—'}
Date of Service: ${claim.date_of_service ?? claim.date ?? '—'}
Billed Amount: $${Number(claim.amount || 0).toLocaleString()}
${isHoldClaim
  ? `Reason Claim is on Hold: ${claim.denial_reason ?? '—'}\nRecommended Action: ${claim.holdAction ?? '—'}`
  : `Denial Reason: ${claim.denial_reason ?? claim.reason ?? '—'}`
}
`.trim();

    const letterInstructions = isHoldClaim
      ? `Write a professional dental insurance pre-submission cover letter for the following claim that is currently on hold at the practice. The letter will be submitted along with the claim to the insurance company to proactively address the hold reason and support clean adjudication.

${claimDetails}

The letter must:
1. Start with today's date (${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}) and a formal inside address block: "[Practice Name]", "[Practice Address]", "[City, State ZIP]", "[Practice Phone]", then a blank line, then the insurance company's address block.
2. Include a RE: line: "RE: Claim Submission with Supporting Documentation — Patient: [name], Claim #: [id], Date of Service: [date]"
3. Open with "Dear Claims Department,"
4. In the opening paragraph, state that you are submitting the enclosed claim with supporting documentation and briefly identify the procedures billed.
5. In the body (2 paragraphs), proactively address the hold reason — explain the clinical necessity and confirm that all required documentation is enclosed. Cite relevant CDT code requirements or payer rules from the knowledge base.
6. Include a bulleted list of enclosed supporting documentation (match to what the hold reason and procedure actually require — e.g., periodontal charting, pre-op X-rays, pre-authorization number, clinical notes).
7. Request clean adjudication and provide placeholder contact info for questions.
8. Close with "Sincerely," and a signature block: "[Provider Name, DDS/DMD]", "[Practice Name]", "[NPI: XXXXXXXXXX]".

Return ONLY the letter text. No preamble, no commentary after the letter.`
      : `Write a professional dental insurance appeal letter for the following denied claim. The letter is from the treating dental practice to the insurance company's appeals department.

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

Return ONLY the letter text. No preamble, no commentary after the letter.`;

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
        system: `You are an expert dental insurance billing specialist writing professional letters on behalf of dental practices. Write formal, persuasive letters that cite specific plan requirements, CDT code rules, and clinical justifications. Use only the rules provided in the knowledge base below — do not invent rules.

${knowledgeBlock}`,
        messages: [{ role: 'user', content: letterInstructions }],
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
