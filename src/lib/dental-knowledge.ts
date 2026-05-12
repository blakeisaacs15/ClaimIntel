// Dental billing knowledge base — injected into AI prompts to replace hallucination with rules.

// ─── CDT Code Registry ────────────────────────────────────────────────────────

interface CDTCode {
  description: string;
  category: string;
  requiresAttachment?: string;   // what must be attached for payer to accept
  requiresPreAuth?: string;      // which payers require pre-auth
  frequencyNote?: string;        // typical coverage frequency
  holdRisk?: string;             // why this code commonly ends up on hold
}

export const CDT_CODES: Record<string, CDTCode> = {
  // Diagnostic
  D0120: { description: 'Periodic oral evaluation', category: 'Diagnostic', frequencyNote: '2x per benefit year' },
  D0150: { description: 'Comprehensive oral evaluation', category: 'Diagnostic', frequencyNote: '1x per 36–60 months; not billable same day as D0120' },
  D0210: { description: 'Full mouth radiographic series', category: 'Diagnostic', frequencyNote: '1x per 36–60 months', holdRisk: 'Cannot bill same day as panoramic (D0330) without narrative' },
  D0220: { description: 'Periapical radiograph — first image', category: 'Diagnostic' },
  D0230: { description: 'Periapical radiograph — each additional image', category: 'Diagnostic' },
  D0272: { description: 'Bitewing radiographs — 2 images', category: 'Diagnostic', frequencyNote: '1–2x per year depending on caries risk' },
  D0274: { description: 'Bitewing radiographs — 4 images', category: 'Diagnostic', frequencyNote: '1–2x per year depending on caries risk' },
  D0330: { description: 'Panoramic radiographic image', category: 'Diagnostic', frequencyNote: '1x per 36–60 months' },

  // Preventive
  D1110: { description: 'Prophylaxis — adult', category: 'Preventive', frequencyNote: '2x per benefit year; adult = age 14+ for Delta Dental. Included in D4910 fee — not separately billable same day as D4910. Cannot bill same day as D4346.' },
  D1120: { description: 'Prophylaxis — child', category: 'Preventive', frequencyNote: '2x per benefit year; child = under age 14 for Delta Dental.' },
  D1206: { description: 'Topical fluoride varnish', category: 'Preventive', frequencyNote: '2x per year; Delta Dental: benefit up to age 19; denied when used for desensitization or as a cavity liner.' },
  D1208: { description: 'Topical fluoride — excluding varnish', category: 'Preventive', frequencyNote: '2x per year; age limits vary' },
  D1351: { description: 'Sealant — per tooth', category: 'Preventive', frequencyNote: 'Delta Dental: once per tooth, occlusal surface of permanent molars only; age limits per contract. Denied same date and same surface as a restoration by the same dentist. Not reimbursed on restored teeth.' },

  // Restorative
  D2140: { description: 'Amalgam restoration — 1 surface, primary or permanent', category: 'Restorative' },
  D2150: { description: 'Amalgam restoration — 2 surfaces, primary or permanent', category: 'Restorative' },
  D2160: { description: 'Amalgam restoration — 3 surfaces, primary or permanent', category: 'Restorative' },
  D2330: { description: 'Resin-based composite — 1 surface, anterior', category: 'Restorative' },
  D2331: { description: 'Resin-based composite — 2 surfaces, anterior', category: 'Restorative' },
  D2332: { description: 'Resin-based composite — 3 surfaces, anterior', category: 'Restorative' },
  D2391: { description: 'Resin-based composite — 1 surface, posterior, primary or permanent', category: 'Restorative', holdRisk: 'Delta Dental: downgrade to amalgam rate only if the specific group/individual contract specifies an alternate benefit clause — NOT an automatic blanket downgrade. Verify the patient\'s plan contract. Other payers (Cigna, Aetna, MetLife) typically do apply alternate benefit.' },
  D2392: { description: 'Resin-based composite — 2 surfaces, posterior', category: 'Restorative', holdRisk: 'Posterior composite alternate benefit risk — same as D2391' },
  D2393: { description: 'Resin-based composite — 3 surfaces, posterior', category: 'Restorative', holdRisk: 'Posterior composite alternate benefit risk — same as D2391' },
  D2394: { description: 'Resin-based composite — 4+ surfaces, posterior', category: 'Restorative', holdRisk: 'Posterior composite alternate benefit risk — same as D2391' },
  D2710: { description: 'Crown — resin-based composite (indirect)', category: 'Restorative', requiresPreAuth: 'Most payers', requiresAttachment: 'Pre-op X-ray, tooth narrative', frequencyNote: '1x per 5–7 years. Delta Dental: LEPAT (least expensive professionally accepted treatment) applies. Not a benefit for children under age 12. Tooth preparation, temporization, impressions, occlusal adjustment, and gingivectomy/alveoloplasty done at same visit are included in crown fee — do not bill separately.' },
  D2740: { description: 'Crown — porcelain/ceramic substrate', category: 'Restorative', requiresPreAuth: 'Most payers', requiresAttachment: 'Pre-op X-ray, narrative', frequencyNote: '1x per 5–7 years. Delta Dental: LEPAT applies; not a benefit for children under age 12; tooth prep/temps/impressions included in crown fee; not a benefit when periodontal bone support is inadequate.' },
  D2750: { description: 'Crown — porcelain fused to high noble metal', category: 'Restorative', requiresPreAuth: 'Most payers', requiresAttachment: 'Pre-op X-ray, narrative', frequencyNote: '1x per 5–7 years. Delta Dental: LEPAT applies; not a benefit for children under age 12; tooth prep/temps/impressions included in crown fee.' },
  D2930: { description: 'Prefabricated stainless steel crown — primary tooth', category: 'Restorative', frequencyNote: 'Delta Dental: once per lifetime per tooth.' },

  // Endodontic
  D3310: { description: 'Endodontic therapy — anterior tooth', category: 'Endodontic', requiresAttachment: 'Pre-op and post-op periapical X-rays' },
  D3320: { description: 'Endodontic therapy — premolar', category: 'Endodontic', requiresAttachment: 'Pre-op and post-op periapical X-rays' },
  D3330: { description: 'Endodontic therapy — molar', category: 'Endodontic', requiresPreAuth: 'Cigna, Aetna, MetLife, Guardian', requiresAttachment: 'Pre-op and post-op periapical X-rays' },

  // Periodontic
  D4341: {
    description: 'Periodontal scaling and root planing — 4+ teeth per quadrant',
    category: 'Periodontic',
    requiresAttachment: 'BOTH radiographic documentation of alveolar bone loss AND clinical attachment loss; periodontal charting; recent X-rays. Delta Dental: fees not payable without both forms of documentation.',
    requiresPreAuth: 'Cigna, Aetna, MetLife, Guardian, United Concordia',
    holdRisk: 'Delta Dental: (1) Not billable without BOTH radiographic bone loss AND clinical attachment loss documentation. (2) Not billable within 24 months by same dentist; if different dentist within 24 months, benefits denied. (3) D1110 (prophylaxis) and D4346 not billable same date.',
  },
  D4342: {
    description: 'Periodontal scaling and root planing — 1–3 teeth per quadrant',
    category: 'Periodontic',
    requiresAttachment: 'BOTH radiographic documentation of bone loss AND clinical attachment loss on the specific 1–3 teeth; recent X-rays. Delta Dental: if documentation is inadequate, benefits are limited to D1110/D4346 (prophylaxis) rate.',
    requiresPreAuth: 'Cigna, Aetna, MetLife, Guardian',
    holdRisk: 'Same documentation requirements as D4341. If documentation doesn\'t meet Delta Dental criteria, claim may be reimbursed only at prophylaxis rate (D1110/D4346).',
  },
  D4355: {
    description: 'Full mouth debridement to enable a comprehensive oral evaluation and diagnosis',
    category: 'Periodontic',
    frequencyNote: 'Delta Dental: once per lifetime. D0180 (comprehensive perio evaluation) not billable on the same date as D4355.',
  },
  D4381: {
    description: 'Localized delivery of antimicrobial agents via a controlled release vehicle',
    category: 'Periodontic',
    holdRisk: 'Delta Dental: benefits denied for D4381.',
  },
  D4910: {
    description: 'Periodontal maintenance',
    category: 'Periodontic',
    frequencyNote: 'Every 3–4 months for active perio patients',
    holdRisk: 'Delta Dental: (1) D1110 (prophylaxis) is included in the D4910 fee — not separately billable on the same day. (2) Not billable within 30 days of periodontal therapy (D4341/D4342, flap/osseous surgery). (3) D0180 (comprehensive perio exam) billed same day is benefited at D0120 rate. (4) Benefits denied if patient has no prior history of periodontal therapy.',
  },

  // Oral Surgery
  D7140: { description: 'Extraction, erupted tooth or exposed root', category: 'Oral Surgery' },
  D7210: { description: 'Surgical extraction of erupted tooth', category: 'Oral Surgery', requiresAttachment: 'Pre-op X-ray showing root morphology or surgical need', requiresPreAuth: 'Delta Dental (plan-dependent), Guardian' },
  D7220: { description: 'Removal of impacted tooth — soft tissue', category: 'Oral Surgery', requiresAttachment: 'Panoramic or periapical X-ray', requiresPreAuth: 'Most payers if patient is adult' },
  D7230: { description: 'Removal of impacted tooth — partially bony', category: 'Oral Surgery', requiresAttachment: 'Panoramic X-ray', requiresPreAuth: 'Most payers' },
  D7240: { description: 'Removal of impacted tooth — completely bony', category: 'Oral Surgery', requiresAttachment: 'Panoramic X-ray', requiresPreAuth: 'Most payers' },

  // Prosthodontic / Implants
  D5110: { description: 'Complete denture — maxillary', category: 'Prosthodontic', requiresPreAuth: 'Most payers', frequencyNote: '1x per 5–7 years' },
  D5120: { description: 'Complete denture — mandibular', category: 'Prosthodontic', requiresPreAuth: 'Most payers', frequencyNote: '1x per 5–7 years' },
  D5213: { description: 'Maxillary partial denture — cast metal framework', category: 'Prosthodontic', requiresPreAuth: 'Most payers', requiresAttachment: 'Diagnostic X-rays, narrative' },
  D5214: { description: 'Mandibular partial denture — cast metal framework', category: 'Prosthodontic', requiresPreAuth: 'Most payers', requiresAttachment: 'Diagnostic X-rays, narrative' },
  D6010: { description: 'Surgical placement of implant body', category: 'Implant', requiresPreAuth: 'All payers that cover implants', holdRisk: 'Most Delta Dental plans exclude implants entirely. Verify coverage before treatment.' },
  D6011: { description: 'Second stage implant surgery', category: 'Implant', holdRisk: 'Delta Dental: D6011 is part of the D6010 (implant body placement) fee. Not separately billable by the same dentist who placed D6010.' },
  D6065: { description: 'Implant supported porcelain/ceramic crown', category: 'Implant', requiresPreAuth: 'All payers that cover implants' },
  D6740: { description: 'Retainer crown — porcelain/ceramic', category: 'Prosthodontic', requiresPreAuth: 'Most payers', requiresAttachment: 'Pre-op X-rays, narrative for each abutment' },
  D6750: { description: 'Retainer crown — porcelain fused to high noble metal', category: 'Prosthodontic', requiresPreAuth: 'Most payers', requiresAttachment: 'Pre-op X-rays, narrative for each abutment' },

  // Orthodontic
  D8080: { description: 'Comprehensive orthodontic treatment — adolescent', category: 'Orthodontic', requiresPreAuth: 'All payers with ortho benefit', holdRisk: 'Ortho pre-auth almost always required. Requires diagnostic records: photos, models, panoramic, cephalometric X-ray. Delta Dental: benefits denied when supporting documentation does not meet criteria for coverage.' },
  D8090: { description: 'Comprehensive orthodontic treatment — adult', category: 'Orthodontic', requiresPreAuth: 'All payers with ortho benefit', holdRisk: 'Many plans exclude adult ortho entirely. Delta Dental: benefits denied when supporting documentation does not meet criteria for coverage.' },

  // Adjunctive
  D9310: { description: 'Consultation — diagnostic service', category: 'Adjunctive', holdRisk: 'Cannot bill D9310 on same date as comprehensive exam (D0150). Some payers do not cover consultation codes. Delta Dental: when covered, limited to once per 12 months.' },
  D9930: { description: 'Treatment of complications (post-surgical)', category: 'Adjunctive', holdRisk: 'Delta Dental: dry socket (alveolitis) palliation performed within 30 days of extraction by the same dentist is not separately billable to the patient — included in extraction fee.' },
};

// ─── Payer-Specific Rules ─────────────────────────────────────────────────────

export const ACTIVE_PAYER_RULES_YEAR = "2026";

interface PayerRules {
  displayName: string;
  frequencyLimits: string[];
  downgradePolicies: string[];
  preAuthRequired: string[];
  bundlingRules: string[];
  commonHoldReasons: string[];
  waitingPeriods?: string[];
  exclusions?: string[];
}

const payerKnowledge: Record<string, Record<string, PayerRules>> = {
  delta_dental: {
    "2026": {
    displayName: 'Delta Dental',
    frequencyLimits: [
      'Prophylaxis (D1110/D1120): 2x per calendar or benefit year. Adult = age 14+; Child = under age 14.',
      'Periodic exam (D0120): 2x per benefit year',
      'Comprehensive exam (D0150): 1x per 36–60 months',
      'Full mouth X-rays (D0210): 1x per 36–60 months',
      'Bitewing X-rays (D0274): 1–2x per year based on caries risk',
      'Topical fluoride (D1206): Up to age 19; denied when used for desensitization or cavity liner',
      'Sealants (D1351): Once per tooth; occlusal surface of permanent molars only; age per contract; denied same date/surface as restoration by same dentist',
      'Stainless steel crown primary tooth (D2930): Once per lifetime per tooth',
      'Crowns (D2710–D2799): 1x per 5 years per tooth; LEPAT (least expensive professionally accepted treatment) applies; not a benefit for children under age 12',
      'Dentures (D5110–D5120): 1x per 5 years',
      'Full mouth debridement (D4355): Once per lifetime',
      'Periodontal SRP (D4341/D4342): Not billable within 24 months by same dentist; different dentist within 24 months = benefits denied',
      'Periodontal maintenance (D4910): Every 3–4 months; not within 30 days of periodontal therapy (D4341/D4342, flap/osseous surgery); benefits denied if no prior history of periodontal therapy',
      'Localized antimicrobial (D4381): Benefits denied',
      'Consultation (D9310): When covered, once per 12 months',
    ],
    downgradePolicies: [
      'Posterior composites (D2391–D2394): IMPORTANT — Delta Dental does NOT apply a blanket downgrade to amalgam. The alternate benefit (pay at amalgam rate) only applies if the specific group or individual contract explicitly includes this provision. Verify the patient\'s plan contract before assuming a downgrade will be applied.',
      'Crowns (D2710–D2799): LEPAT applies — Delta will pay for the least expensive professionally accepted treatment. A crown may be downgraded to a less expensive restoration type if that is deemed adequate.',
      'Crown components included in fee: Tooth preparation, temporization, impressions, occlusal adjustment, and gingivectomy/alveoloplasty performed at the same appointment are included in the crown fee — billing them separately will result in denial or bundling.',
    ],
    preAuthRequired: [
      'Crowns (D2710+): Pre-authorization strongly recommended; some Delta plans mandate it. Not a benefit for children under age 12 or when periodontal bone support is inadequate.',
      'Surgical extractions and impactions (D7210–D7240): Plan-dependent',
      'Orthodontics (D8080/D8090): Always required; benefits denied if supporting documentation does not meet criteria',
      'Implants: Required if covered; most Delta plans exclude implants entirely',
      'Bridges and dentures (D5110–D6999): Strongly recommended',
    ],
    bundlingRules: [
      'D4910 includes D1110 — prophylaxis (D1110) is NOT separately billable on the same day as D4910',
      'D4910 and D4346: D4346 not separately billable on same day as D4910',
      'D4341/D4342: D1110 (prophylaxis) and D4346 not billable same date as SRP',
      'D4355: D0180 (comprehensive perio evaluation) not billable same day',
      'D4910: D0180 billed same day is benefited only at D0120 (periodic evaluation) rate',
      'D0150 and D0120 cannot be billed on the same date',
      'Exam (D0120/D0150) and prophylaxis (D1110) billed on same date: Allowed and common',
      'D4341/D4342 cannot be billed in the same quadrant on the same date',
      'Crown components (tooth prep, temporization, impressions, occlusal adjustment, gingivectomy at same visit): Bundled into crown fee — not separately billable',
      'D6011 (second stage implant surgery): Part of D6010 fee — not separately billable by same dentist',
      'D9930 (dry socket within 30 days of extraction by same dentist): Not separately billable to patient',
    ],
    commonHoldReasons: [
      'D4341/D4342: Missing BOTH radiographic documentation of bone loss AND clinical attachment loss — both forms are required; either alone is insufficient',
      'D4341/D4342: Claim submitted within 24 months of prior SRP by same dentist',
      'D4910: Patient has no prior history of periodontal therapy on record — benefits denied',
      'D4910: Submitted within 30 days of D4341/D4342 or periodontal surgery',
      'D4910 + D1110 same date: Prophylaxis included in D4910 fee; D1110 will be denied',
      'No pre-authorization on file for crown or bridge',
      'Crown for child under age 12 — not a benefit for Delta',
      'Posterior composite submitted on plan with alternate benefit — check if contract specifies it before submitting',
      'Frequency limit exceeded — check prior claim dates before submitting',
      'Missing tooth clause — tooth lost before coverage effective date',
    ],
    exclusions: [
      'Implants excluded on most Delta Dental plans (verify plan booklet)',
      'D4381 (localized antimicrobial): Benefits denied',
      'Cosmetic procedures not covered',
      'Crowns not a benefit for children under age 12',
      'Crowns not a benefit where periodontal bone support is inadequate',
      'Missing tooth clause: Teeth missing before effective date typically excluded from prosthetic replacement',
    ],
    },
  },

  cigna: {
    "2026": {
    displayName: 'Cigna Dental',
    frequencyLimits: [
      'Prophylaxis: 2x per benefit year',
      'Exams: 2x per benefit year',
      'Bitewings: 1x per year (2x for high caries risk with documentation)',
      'Perio maintenance (D4910): 4x per year (every 3 months) for active perio patients; 2x per year once stable',
      'Crowns: 1x per 5 years per tooth',
    ],
    downgradePolicies: [
      'Posterior composites (D2391–D2394): Cigna applies alternate benefit on posterior teeth — pays at amalgam rate. To avoid patient balance billing, document why composite is required (e.g., buccal/lingual decay, patient allergy to metal, tooth in aesthetic zone visible when smiling).',
      'Porcelain on molars: May downgrade to PFM rate on second and third molars',
    ],
    preAuthRequired: [
      'Crowns (D2710+): Pre-authorization required',
      'Bridges (D6210+): Pre-authorization required',
      'Dentures (D5110–D5899): Pre-authorization required',
      'Periodontal surgery (D4210+): Pre-authorization required',
      'Oral surgery other than routine extractions (D7210+): Required',
      'Orthodontics (D8080/D8090): Required',
      'Implants (D6010+): Required (coverage varies by plan)',
    ],
    bundlingRules: [
      'D4341/D4342 cannot be billed same quadrant same date',
      'Comprehensive exam (D0150) cannot be billed same day as periodic exam (D0120)',
      'Core buildups (D2950) may be bundled into crown benefit on some Cigna plans',
    ],
    commonHoldReasons: [
      'Pre-authorization not obtained before crown, bridge, or major service',
      'Missing periodontal charting — D4341/D4342 require documented pocket depths ≥4–5mm',
      'Posterior composite submitted on plan with mandatory amalgam alternate benefit',
      'Waiting period not completed — new enrollees often have 6–12 month wait for basic, 12 months for major',
    ],
    waitingPeriods: [
      'Basic restorative (fillings, extractions): 6 months for new enrollees on many plans',
      'Major restorative (crowns, bridges, dentures): 12 months for new enrollees',
      'Orthodontics: 12 months (some plans)',
    ],
    exclusions: [
      'Cosmetic procedures',
      'Missing tooth clause applies',
      'Some plans exclude implants or have a separate implant rider',
    ],
    },
  },

  aetna: {
    "2026": {
    displayName: 'Aetna Dental',
    frequencyLimits: [
      'Prophylaxis: 2x per benefit year',
      'Exams: 2x per benefit year',
      'Bitewings (D0272/D0274): 1x per year; 2x for high caries risk',
      'Full mouth X-rays (D0210): 1x per 36–60 months',
      'Perio maintenance (D4910): 4x per year',
      'Crowns: 1x per 5 years per tooth',
      'Sealants (D1351): Covered to age 14; permanent unrestored molars only',
    ],
    downgradePolicies: [
      'Alternate benefit provision: Aetna will pay for the least expensive clinically acceptable treatment. If a patient requests a more expensive service, Aetna pays at the lower-cost alternative rate.',
      'Posterior composites: Aetna frequently applies alternate benefit — pays at amalgam rate for posterior composites. Must submit narrative justifying composite if requesting composite reimbursement.',
      'All-ceramic crowns on posterior teeth: May pay at PFM rate for second and third molars.',
    ],
    preAuthRequired: [
      'Crowns (D2710+): Pre-authorization required on most plans',
      'Periodontal treatment (D4341+): Pre-authorization required',
      'Oral surgery beyond simple extractions: Pre-authorization required',
      'Prosthodontics (D5110+): Pre-authorization required',
      'Orthodontics (D8080/D8090): Required',
      'Implants: Required; coverage depends on plan',
    ],
    bundlingRules: [
      'Core buildups (D2950) may be bundled with crown benefit',
      'Post and core (D2952/D2954) may be bundled on some plans',
      'D4910 and D1110 cannot be billed on the same date',
    ],
    commonHoldReasons: [
      'No pre-authorization for major services',
      'Missing documentation for periodontal procedures',
      'Alternate benefit applied — plan pays at lower-cost procedure rate',
      'Age limitation exceeded for sealants or ortho',
      'Missing tooth clause applies to prosthetic replacement',
    ],
    waitingPeriods: [
      'Major services: 12 months on many employer plans',
      'Orthodontics: 12 months',
    ],
    exclusions: [
      'Missing tooth clause: Teeth missing before effective date',
      'Cosmetic procedures',
      'Implants excluded on many Aetna plans',
    ],
    },
  },

  metlife: {
    "2026": {
    displayName: 'MetLife Dental',
    frequencyLimits: [
      'Prophylaxis: 2x per benefit year',
      'Exams: 2x per benefit year',
      'Bitewings: 1x per year',
      'Full mouth X-rays: 1x per 36 months',
      'Perio maintenance (D4910): 4x per year',
      'Crowns: 1x per 5 years',
    ],
    downgradePolicies: [
      'Posterior composites: MetLife applies alternate benefit on premolars and molars — pays at amalgam rate; patient responsible for difference.',
      'Least expensive alternative treatment (LEAT) policy: MetLife reimburses at the rate of the least costly procedure that is appropriate for the condition.',
    ],
    preAuthRequired: [
      'Crowns (D2710+): Pre-authorization required',
      'Bridges: Required',
      'Dentures (D5110+): Required',
      'Periodontal procedures (D4341+): Required',
      'Oral surgery beyond simple extractions: Required',
      'Orthodontics: Required',
    ],
    bundlingRules: [
      'D4910 and D1110 cannot be billed same date',
      'Core buildups may be bundled with crown',
    ],
    commonHoldReasons: [
      'Waiting period not met — MetLife commonly has 6-month basic / 12-month major waiting periods',
      'Pre-authorization not obtained',
      'Missing periodontal documentation',
      'Missing tooth clause applicable',
    ],
    waitingPeriods: [
      'Basic restorative: 6 months on most group plans',
      'Major restorative (crowns, bridges, dentures): 12 months',
      'Orthodontics: 12 months',
    ],
    exclusions: [
      'Missing tooth clause: Standard on most MetLife plans',
      'Implants: Often excluded or require separate rider',
    ],
    },
  },

  united_concordia: {
    "2026": {
    displayName: 'United Concordia (UCCI)',
    frequencyLimits: [
      'Prophylaxis: 2x per benefit year',
      'Exams: 2x per benefit year',
      'Bitewings: 1–2x per year',
      'Perio maintenance (D4910): Every 3–4 months',
      'Crowns: 1x per 5 years',
    ],
    downgradePolicies: [
      'Posterior composites: Alternate benefit to amalgam applied on posterior teeth',
      'LEAT provision applies',
    ],
    preAuthRequired: [
      'Crowns and bridges: Required',
      'Dentures: Required',
      'Periodontal procedures D4341+: Required',
      'Oral surgery D7210+: Required',
      'Orthodontics: Required',
      'Implants: Required if covered',
    ],
    bundlingRules: [
      'D4910 and D1110 same-date bundling applies',
    ],
    commonHoldReasons: [
      'Pre-authorization not in place for major services',
      'Missing periodontal charting for D4341/D4342',
      'UCCI frequently used by military — verify TRICARE vs. UCCI plan',
    ],
    exclusions: [
      'Missing tooth clause',
      'Cosmetic services',
    ],
    },
  },

  guardian: {
    "2026": {
    displayName: 'Guardian Dental',
    frequencyLimits: [
      'Prophylaxis: 2x per benefit year',
      'Exams: 2x per benefit year',
      'Perio maintenance: 4x per year',
      'Crowns: 1x per 5 years',
    ],
    downgradePolicies: [
      'Posterior composites: Alternate benefit to amalgam on premolars and molars',
    ],
    preAuthRequired: [
      'Crowns, bridges, dentures: Strongly recommended',
      'Periodontal procedures: Required on most plans',
      'Oral surgery beyond D7140: Required',
      'Orthodontics: Required',
    ],
    bundlingRules: [
      'D4910 and D1110 same-date bundling',
      'Core buildups may bundle with crown benefit',
    ],
    commonHoldReasons: [
      'Pre-authorization not obtained',
      'Missing documentation for perio or major services',
    ],
    exclusions: ['Missing tooth clause', 'Cosmetic services'],
    },
  },

  anthem_bcbs: {
    "2026": {
    displayName: 'Anthem / Blue Cross Blue Shield Dental',
    frequencyLimits: [
      'Prophylaxis: 2x per benefit year',
      'Exams: 2x per benefit year',
      'Bitewings: 1x per year',
      'Crowns: 1x per 5 years',
    ],
    downgradePolicies: [
      'Posterior composites: Alternate benefit to amalgam applied on many BCBS plans',
    ],
    preAuthRequired: [
      'Major restorative, prosthodontics, periodontal surgery: Plan-dependent — check EOB language',
    ],
    bundlingRules: [
      'D4910 and D1110 same-date bundling',
    ],
    commonHoldReasons: [
      'BCBS dental is administered by state-level affiliates — rules vary by state plan',
      "Verify which BCBS affiliate the patient's plan belongs to before applying generic rules",
    ],
    exclusions: ['Missing tooth clause', 'Cosmetic services'],
    },
  },

  ihcp_indiana: {
    "2026": {
      displayName: 'IHCP Indiana (Indiana Medicaid)',
      frequencyLimits: [
        'Prophylaxis (D1110/D1120): 2x per calendar year; adult prophylaxis covered for members 21+ only if enrolled in a dental plan that includes it — verify member eligibility and program type (HHW, HIP, Hoosier Care Connect)',
        'Periodic exam (D0120): 2x per calendar year',
        'Comprehensive exam (D0150): 1x per 36 months',
        'Bitewing radiographs (D0272/D0274): 1x per calendar year',
        'Full mouth X-rays (D0210): 1x per 36 months',
        'Panoramic X-ray (D0330): 1x per 36 months; not separately reimbursable same date as D0210',
        'Topical fluoride (D1206): 2x per calendar year; covered for members under age 21',
        'Sealants (D1351): 1x per tooth lifetime; permanent molars only; members under age 21',
        'Crowns: Prior authorization required; 1x per 5 years per tooth; covered for members under 21 without restriction; adult coverage limited — verify program',
        'Dentures (D5110–D5120): Prior authorization required; 1x per 5 years',
        'Periodontal maintenance (D4910): Covered for active perio patients; frequency per program',
        'Periodontal SRP (D4341/D4342): Prior authorization required for adult members; documentation of bone loss and clinical attachment loss required',
      ],
      downgradePolicies: [
        'Posterior composites (D2391–D2394): IHCP reimburses posterior composites — no blanket downgrade to amalgam. Amalgam is generally not required as the lesser-cost alternative under Indiana Medicaid dental.',
        'LEPAT does not apply the same way as commercial payers; IHCP uses a fee schedule and covered service list rather than an alternate benefit provision.',
      ],
      preAuthRequired: [
        'Crowns (D2710+): Prior authorization required for all members',
        'Bridges: Prior authorization required',
        'Dentures (D5110–D5899): Prior authorization required',
        'Periodontal surgery (D4210+): Prior authorization required',
        'Periodontal SRP (D4341/D4342): Prior authorization required for adult members',
        'Oral surgery beyond simple extractions (D7210+): Prior authorization required',
        'Orthodontics: Prior authorization required; limited to medical necessity for members under 21',
        'Implants: Generally not covered under IHCP dental; verify plan',
      ],
      bundlingRules: [
        'D4910 and D1110 not separately billable on the same date',
        'D0210 (full mouth X-rays) and D0330 (panoramic) not separately reimbursable same date',
        'D0150 and D0120 not billable same date',
        'Exam and prophylaxis same date: Allowed',
        'D4341/D4342 cannot be billed in the same quadrant on the same date',
        'Crown components (prep, temporization, impressions) included in crown fee — not separately billable',
      ],
      commonHoldReasons: [
        'Prior authorization not obtained before crown, bridge, denture, or major service',
        'Member eligibility not verified — IHCP eligibility changes monthly; verify on date of service',
        'Adult member dental benefit limited — confirm covered services for member program type (HHW, HIP, Hoosier Care Connect)',
        'Missing required documentation for periodontal procedures (bone loss + clinical attachment loss)',
        'Service not covered for member age — fluoride and sealants have under-21 age limits',
        'Provider not enrolled as IHCP dental provider — must be enrolled and credentialed before billing',
        'Out-of-network — IHCP managed care members must see in-network providers; fee-for-service members have broader access',
        'Frequency limit exceeded — IHCP tracks claims by calendar year; verify prior utilization through EVS',
      ],
      waitingPeriods: [
        'No standard waiting period for Medicaid-eligible members; coverage begins on eligibility effective date',
      ],
      exclusions: [
        'Implants (D6010+): Generally not covered under IHCP dental',
        'Cosmetic procedures: Not covered',
        'Adult orthodontics: Not covered except in rare medical necessity cases',
        'Services by non-enrolled providers: Not reimbursed',
        'Procedures not on the IHCP covered dental service list: Not reimbursed regardless of medical necessity',
      ],
    },
  },
};

// ─── Hold-Specific Patterns ────────────────────────────────────────────────────
// ClaimStatus=H means the claim has not yet been submitted to the payer — it is
// being held in the practice management system. These are common pre-submission hold reasons.

export const HOLD_PATTERNS = `
## Why Dental Claims Are Held (ClaimStatus=H)

Claims in Open Dental with ClaimStatus=H are NOT yet submitted to the insurance carrier.
They are held at the practice level, typically for one of these reasons:

1. MISSING ATTACHMENTS: Payer requires X-rays, photographs, or periodontal charting before
   submission. Common codes: D4341, D4342, D2710–D2799 (crowns), D7210–D7240 (surgical extractions).

2. PRE-AUTHORIZATION PENDING: A pre-auth was submitted but the approval has not been received yet.
   Do not submit the claim until the authorization number is in hand.

3. PRE-AUTHORIZATION NOT YET OBTAINED: Staff identified that the procedure requires pre-auth
   but has not initiated the request. Common for: crowns, bridges, dentures, perio surgery, ortho.

4. PATIENT ELIGIBILITY NOT VERIFIED: Insurance eligibility has not been confirmed for the
   date of service. Claim held until eligibility is verified.

5. COORDINATION OF BENEFITS (COB) PENDING: Patient has dual coverage. Primary EOB is needed
   before submitting to the secondary carrier.

6. WAITING PERIOD NOT MET: New patient whose plan has a waiting period for basic or major services.

7. INCOMPLETE CLAIM INFORMATION: Missing tooth number, surface designation, tooth quadrant,
   referring provider NPI, or other required fields.

8. NARRATIVE OR DOCUMENTATION NEEDED: Procedure requires a written narrative or supporting
   clinical notes (e.g., posterior composite in aesthetic zone, medical necessity for implant).

9. MISSING TOOTH CLAUSE REVIEW: Tooth may have been missing before plan effective date —
   needs verification before claim submission.

10. ORTHO RECORDS PENDING: Orthodontic claim held while diagnostic records (models, photos,
    cephalometric X-ray) are being compiled for submission.
`;

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getCDTContext(codes: string[]): string {
  const relevant = codes
    .map(c => c.toUpperCase().trim())
    .filter(c => CDT_CODES[c])
    .map(c => {
      const info = CDT_CODES[c];
      const parts = [`${c} — ${info.description} [${info.category}]`];
      if (info.frequencyNote) parts.push(`  Frequency: ${info.frequencyNote}`);
      if (info.requiresAttachment) parts.push(`  Required attachment: ${info.requiresAttachment}`);
      if (info.requiresPreAuth) parts.push(`  Pre-auth required by: ${info.requiresPreAuth}`);
      if (info.holdRisk) parts.push(`  Hold risk: ${info.holdRisk}`);
      return parts.join('\n');
    });

  if (relevant.length === 0) return '';
  return `## CDT Code Reference (codes present in these claims)\n\n${relevant.join('\n\n')}`;
}

export function getPayerContext(payerNames: string[]): string {
  const matched = new Map<string, PayerRules>();

  for (const name of payerNames) {
    const key = matchPayer(name);
    const rules = key && payerKnowledge[key]?.[ACTIVE_PAYER_RULES_YEAR];
    if (rules && !matched.has(key!)) {
      matched.set(key!, rules);
    }
  }

  if (matched.size === 0) return '';

  const sections = Array.from(matched.values()).map(payer => {
    const lines = [`### ${payer.displayName}`];
    if (payer.frequencyLimits.length) lines.push(`**Frequency Limits:**\n${payer.frequencyLimits.map(r => `- ${r}`).join('\n')}`);
    if (payer.downgradePolicies.length) lines.push(`**Downgrade / Alternate Benefit:**\n${payer.downgradePolicies.map(r => `- ${r}`).join('\n')}`);
    if (payer.preAuthRequired.length) lines.push(`**Pre-Authorization Required:**\n${payer.preAuthRequired.map(r => `- ${r}`).join('\n')}`);
    if (payer.bundlingRules.length) lines.push(`**Bundling Rules:**\n${payer.bundlingRules.map(r => `- ${r}`).join('\n')}`);
    if (payer.commonHoldReasons.length) lines.push(`**Common Hold/Denial Reasons:**\n${payer.commonHoldReasons.map(r => `- ${r}`).join('\n')}`);
    if (payer.waitingPeriods?.length) lines.push(`**Waiting Periods:**\n${payer.waitingPeriods.map(r => `- ${r}`).join('\n')}`);
    if (payer.exclusions?.length) lines.push(`**Common Exclusions:**\n${payer.exclusions.map(r => `- ${r}`).join('\n')}`);
    return lines.join('\n\n');
  });

  return `## Payer-Specific Rules\n\n${sections.join('\n\n---\n\n')}`;
}

function matchPayer(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('delta')) return 'delta_dental';
  if (n.includes('cigna')) return 'cigna';
  if (n.includes('aetna')) return 'aetna';
  if (n.includes('metlife') || n.includes('met life')) return 'metlife';
  if (n.includes('concordia') || n.includes('ucci')) return 'united_concordia';
  if (n.includes('guardian')) return 'guardian';
  if (n.includes('anthem') || n.includes('bcbs') || n.includes('blue cross') || n.includes('blue shield')) return 'anthem_bcbs';
  if (n.includes('ihcp') || n.includes('indiana medicaid') || n.includes('indianamedicaid')) return 'ihcp_indiana';
  return null;
}

export function extractCDTCodes(claimsJson: any[]): string[] {
  const codes = new Set<string>();
  for (const claim of claimsJson) {
    // Open Dental holds format
    if (Array.isArray(claim.procedures)) {
      for (const p of claim.procedures) {
        if (p.CodeSent) codes.add(p.CodeSent.toUpperCase());
      }
    }
    // CSV-parsed format
    if (claim.procedure && /^D\d{4}$/i.test(claim.procedure)) {
      codes.add(claim.procedure.toUpperCase());
    }
  }
  return Array.from(codes);
}

export function extractPayers(claimsJson: any[]): string[] {
  const payers = new Set<string>();
  for (const claim of claimsJson) {
    if (claim.payer && claim.payer !== 'Unknown') payers.add(claim.payer);
  }
  return Array.from(payers);
}
