import { NextRequest, NextResponse } from 'next/server';
import { getCDTContext, getPayerContext } from '@/lib/dental-knowledge';
import { createUserClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { codes, payer, patientAge, toothNumber, lastTreatmentDate, ruleFlag, providerOverride } =
      await request.json();

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

    const codeList: string[] = Array.isArray(codes) ? codes : [codes];
    const cdtContext = getCDTContext(codeList);
    const payerContext = getPayerContext([payer]);
    const knowledgeBlock = [cdtContext, payerContext].filter(Boolean).join('\n\n');

    const signingName = providerOverride?.full_name ?? letterhead.providerName;
    const signingNpi = providerOverride?.npi ?? letterhead.npi;

    const senderBlock = `${signingName}
${letterhead.practiceName}
${letterhead.address}
${letterhead.cityStateZip}
${letterhead.phone}`;

    const signatureBlock = `Sincerely,

${signingName}
${letterhead.practiceName}
NPI: ${signingNpi}`;

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const claimDetails = [
      `Procedure code(s): ${codeList.join(', ')}`,
      `Payer / Insurance: ${payer}`,
      `Patient age: ${patientAge}`,
      toothNumber ? `Tooth number: ${toothNumber}` : null,
      lastTreatmentDate ? `Date of last treatment: ${lastTreatmentDate}` : null,
      ruleFlag ? `Pre-authorization issue identified: ${ruleFlag}` : null,
    ].filter(Boolean).join('\n');

    const letterInstructions = `Write a professional dental insurance pre-authorization request letter. The letter is from the treating dental practice to the insurance company's pre-authorization department, requesting advance approval for the listed procedure(s).

${claimDetails}

The letter must:
1. Start with:
${today}

${senderBlock}

Pre-Authorization Department
${payer}
[Address]

2. Include a RE: line: "RE: Pre-Authorization Request — Procedure(s): ${codeList.join(', ')}, Patient Age: ${patientAge}${toothNumber ? `, Tooth #${toothNumber}` : ''}"
3. Open with "Dear Pre-Authorization Department,"
4. In the opening paragraph (1–2 sentences), state that you are requesting pre-authorization for the listed procedure(s) and identify the treating provider.
5. In the body (2 paragraphs):
   - First paragraph: describe the clinical indication and medical necessity for the procedure(s), referencing the specific CDT code requirements and why this treatment is appropriate
   - Second paragraph: address any specific pre-authorization requirements for this payer and procedure combination from the knowledge base; confirm that all required documentation will be provided
6. Include a bulleted list of supporting documentation being submitted with this request (tailor to what the specific procedure and payer actually require per the knowledge base)
7. Request written authorization and provide a contact phone number for questions or to expedite review
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
        system: `You are an expert dental insurance billing specialist writing professional pre-authorization request letters on behalf of dental practices. Write formal, clinical letters that cite specific CDT code requirements and payer rules. Use only the rules provided in the knowledge base — do not invent rules.

${knowledgeBlock}`,
        messages: [{ role: 'user', content: letterInstructions }],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 });
    }

    const data = await response.json();
    const letter = data.content?.[0]?.text ?? '';

    return NextResponse.json({ letter });
  } catch (error) {
    console.error('generate-preauth error:', error);
    return NextResponse.json({ error: 'Pre-auth letter generation failed' }, { status: 500 });
  }
}
