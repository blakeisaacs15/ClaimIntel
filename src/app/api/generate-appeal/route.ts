import { NextRequest, NextResponse } from 'next/server';
import { getCDTContext, getPayerContext } from '@/lib/dental-knowledge';
import { createUserClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { claim } = await request.json();

    // Look up practice profile to populate real letterhead
    let letterhead = {
      practiceName: '[Practice Name]',
      address: '[Practice Address]',
      cityStateZip: '[City, State ZIP]',
      phone: '[Practice Phone]',
      providerName: '[Provider Name, DDS/DMD]',
      npi: 'XXXXXXXXXX',
    };

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const db = createUserClient(token);
      const { data: settings } = await db
        .from('user_settings')
        .select('practice_name,practice_address,practice_city_state_zip,practice_phone,provider_name,npi_number')
        .single();
      if (settings) {
        if (settings.practice_name) letterhead.practiceName = settings.practice_name;
        if (settings.practice_address) letterhead.address = settings.practice_address;
        if (settings.practice_city_state_zip) letterhead.cityStateZip = settings.practice_city_state_zip;
        if (settings.practice_phone) letterhead.phone = settings.practice_phone;
        if (settings.provider_name) letterhead.providerName = settings.provider_name;
        if (settings.npi_number) letterhead.npi = settings.npi_number;
      }
    }

    const codes = claim.procedure_code
      ? claim.procedure_code.split(',').map((c: string) => c.trim())
      : [];
    const payers = claim.payer ? [claim.payer] : [];
    const cdtContext = getCDTContext(codes);
    const payerContext = getPayerContext(payers);
    const knowledgeBlock = [cdtContext, payerContext].filter(Boolean).join('\n\n');

    const isHoldClaim = !!claim.isHoldClaim;

    const senderBlock = `${letterhead.providerName}
${letterhead.practiceName}
${letterhead.address}
${letterhead.cityStateZip}
${letterhead.phone}`;

    const signatureBlock = `Sincerely,

${letterhead.providerName}
${letterhead.practiceName}
NPI: ${letterhead.npi}`;

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

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const letterInstructions = isHoldClaim
      ? `Write a professional dental insurance pre-submission cover letter for the following claim that is currently on hold at the practice. The letter will be submitted along with the claim to the insurance company to proactively address the hold reason and support clean adjudication.

${claimDetails}

The letter must:
1. Start with:
${today}

${senderBlock}

[Insurance Company Claims Department]
[Insurance Company Name]
[Address]

2. Include a RE: line: "RE: Claim Submission with Supporting Documentation — Patient: ${claim.patient ?? '[Patient Name]'}, Claim #: ${claim.claim_id ?? claim.id ?? '[Claim ID]'}, Date of Service: ${claim.date_of_service ?? claim.date ?? '[Date]'}"
3. Open with "Dear Claims Department,"
4. In the opening paragraph, state that you are submitting the enclosed claim with supporting documentation and briefly identify the procedures billed.
5. In the body (2 paragraphs), proactively address the hold reason — explain the clinical necessity and confirm that all required documentation is enclosed. Cite relevant CDT code requirements or payer rules from the knowledge base.
6. Include a bulleted list of enclosed supporting documentation (match to what the hold reason and procedure actually require).
7. Request clean adjudication and provide the practice phone number for questions.
8. Close with:
${signatureBlock}

Return ONLY the letter text. No preamble, no commentary after the letter.`
      : `Write a professional dental insurance appeal letter for the following denied claim. The letter is from the treating dental practice to the insurance company's appeals department.

${claimDetails}

The letter must:
1. Start with:
${today}

${senderBlock}

[Payer Appeals Department]
[Insurance Company Name]
[Address]

2. Include a RE: line: "RE: Appeal of Claim Denial — Patient: ${claim.patient ?? '[Patient Name]'}, Claim #: ${claim.claim_id ?? claim.id ?? '[Claim ID]'}, Date of Service: ${claim.date_of_service ?? claim.date ?? '[Date]'}"
3. Open with "Dear Appeals Department,"
4. In the opening paragraph, identify the claim being appealed and state that you are formally appealing the denial.
5. In the body (2–3 paragraphs), make the specific clinical and billing argument for why the denial should be overturned. Cite the exact denial reason and counter it with the relevant CDT code requirements, payer-specific rules, or clinical justification from the knowledge base. Be specific and factual.
6. Include a bulleted list of supporting documentation being submitted with the appeal.
7. Request a written response within 30 days and provide the practice phone number for questions.
8. Close with:
${signatureBlock}

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
