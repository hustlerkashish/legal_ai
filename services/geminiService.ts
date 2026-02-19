import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ComplexityLevel, JudgmentAnalysis } from "../types";

// ── Multi-key rotation: auto-fallback on 429 rate limits ──
const API_KEYS: string[] = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean) as string[];

if (API_KEYS.length === 0) {
  console.error("No Gemini API keys found. Set GEMINI_API_KEY_1..4 in .env.local");
}

let currentKeyIndex = 0;

const getClient = () => {
  if (API_KEYS.length === 0) {
    throw new Error("API_KEY is missing. Please set it in the environment.");
  }
  return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
};

const rotateKey = (): boolean => {
  const nextIndex = (currentKeyIndex + 1) % API_KEYS.length;
  if (nextIndex === currentKeyIndex && API_KEYS.length === 1) return false;
  // If we've cycled through all keys, return false
  currentKeyIndex = nextIndex;
  return true;
};

const is429Error = (err: any): boolean =>
  err?.message?.includes('429') ||
  err?.message?.includes('RESOURCE_EXHAUSTED') ||
  err?.status === 429 ||
  err?.code === 429 ||
  err?.httpStatusCode === 429;

/**
 * Wraps any async Gemini operation with automatic key rotation.
 * If a 429 is detected, switches to the next API key and retries.
 * Cycles through all keys before giving up.
 */
const withKeyRotation = async <T>(operation: () => Promise<T>): Promise<T> => {
  const startIndex = currentKeyIndex;
  let triedKeys = 0;

  while (triedKeys < API_KEYS.length) {
    try {
      return await operation();
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;

      if (is429Error(err)) {
        triedKeys++;
        console.warn(`Key ${currentKeyIndex + 1}/${API_KEYS.length} rate-limited (429). Rotating...`);
        if (triedKeys < API_KEYS.length) {
          rotateKey();
          // Brief pause before retrying with new key
          await new Promise(r => setTimeout(r, 300));
          continue;
        }
      }
      throw err;
    }
  }

  throw new Error(
    'All API keys have hit their rate limit. Please wait a minute and try again.'
  );
};

const MODEL_NAME = "gemini-3-flash-preview"; 

const SYSTEM_INSTRUCTION = `
You are Legal AI, an elite AI Legal Assistant for Indian Law.
Your Goal: Democratize access to Indian legal knowledge using advanced reasoning.

STRICT PROTOCOLS:
1. DISCLAIMER: You MUST end every single response with this exact line in bold/italics:
   "**Disclaimer: This information is for educational purposes only and does not constitute legal advice. Please consult a qualified advocate for professional counsel.**"

2. AUTHENTICITY: Use ONLY valid Indian laws (IPC, CrPC/BNSS, BNS, BSA, Constitution of India, etc.).
   - If citing the Indian Penal Code (IPC), also mention the corresponding section in the new Bharatiya Nyaya Sanhita (BNS) if applicable.

3. STRUCTURE:
   - Use Markdown for formatting.
   - Use "##" for headers.
   - Use bullet points for readability.

4. ELI5 MODE (If requested):
   - Use metaphors (e.g., "Think of a contract like a promise...").
   - Avoid Latin maxims unless explained immediately.

5. SAFETY:
   - Do not assist in committing crimes or evading the law.
   - Do not predict court outcomes (e.g., "You will win this case").
`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
};

export const streamChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  complexity: ComplexityLevel,
  languageCode: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    await withKeyRotation(async () => {
      const ai = getClient();
    
      // Enrich prompt based on complexity
      let finalPrompt = message;
      if (complexity === ComplexityLevel.ELI5) {
        finalPrompt = `(Explain this to a 5-year-old using simple analogies): ${message}`;
      } else if (complexity === ComplexityLevel.Professional) {
        finalPrompt = `(Provide a detailed legal analysis with case law references if possible): ${message}`;
      }

      // Add language instruction
      if (languageCode && languageCode !== 'en') {
        const langName = LANGUAGE_NAMES[languageCode] || languageCode;
        finalPrompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE] ${finalPrompt}`;
      }

      const chat = ai.chats.create({
        model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
        ]
      },
      history: history
    });

    const result = await chat.sendMessageStream({ message: finalPrompt });

    for await (const chunk of result) {
      if (abortSignal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    });
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const analyzeDocument = async (
  fileBase64: string,
  mimeType: string,
  prompt: string
) => {
  return await withKeyRotation(async () => {
    const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        {
            inlineData: {
                mimeType: mimeType,
                data: fileBase64
            }
        },
        { text: `${prompt}\n\nPerform a legal analysis of this document. Summarize key parties, obligations, and potential liabilities.` }
      ]
    },
    config: {
        systemInstruction: SYSTEM_INSTRUCTION
    }
  });

    return response.text;
  });
};

// ── Snap & Solve (OCR + Legal Explainer) ───────────────────────────
export const snapAndSolve = async (
  fileBase64: string,
  mimeType: string,
  languageCode: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    await withKeyRotation(async () => {
      const ai = getClient();

      let textPrompt = `You are **Legal AI Snap & Solve** — an Indian legal document OCR reader and explainer.

A citizen has photographed a physical legal document (challan, court notice, FIR copy, legal notice, summons, warrant, rent agreement, etc.). Your job:

## STEP 1 — OCR EXTRACTION
- Extract ALL text from the image accurately.
- Present the extracted text inside a fenced code block titled "📄 Extracted Text".
- If parts are illegible, mark them as [illegible].
- Preserve structure (headings, sections, table rows) as closely as possible.

## STEP 2 — DOCUMENT IDENTIFICATION
- **Document Type**: What kind of document is this? (e.g., Traffic Challan, Court Summons, Legal Notice u/s 80 CPC, FIR Copy, Bail Order, Rent Agreement, etc.)
- **Issuing Authority**: Who issued it? (e.g., "Traffic Police, Mumbai", "District Court, Varanasi")
- **Date & Reference Number**: If visible.

## STEP 3 — PLAIN-LANGUAGE EXPLANATION
Explain what this document means in simple, everyday language as if talking to a person with no legal background:
- **What happened?** (1-2 lines)
- **What does it ask you to do?** (obligations, deadlines, amounts to pay)
- **What happens if you ignore it?** (consequences — arrest warrant, penalty, ex-parte order, etc.)

## STEP 4 — LEGAL CONTEXT
- Cite the specific law / section mentioned (IPC/BNS, CrPC/BNSS, Motor Vehicles Act, etc.)
- Explain what that section means in simple terms.
- If the document references old law (IPC/CrPC), also mention the equivalent new law (BNS/BNSS).

## STEP 5 — YOUR ACTION PLAN
Numbered steps the citizen should take:
1. Immediate action (pay fine / appear in court / reply to notice)
2. Deadline (if any)
3. Where to go (which court/office, online portal if applicable)
4. Whether a lawyer is recommended
5. Estimated cost (court fee / fine range)

## STEP 6 — ⚠️ IMPORTANT WARNINGS
Alert the citizen about:
- Time limits (limitation periods)
- Consequences of non-compliance
- Common mistakes people make with this type of document

End with: **⚠️ Disclaimer: This is an AI-powered reading and explanation for educational purposes only. Always verify with the original document and consult a qualified advocate for legal action.**`;

    if (languageCode && languageCode !== 'en') {
      const langName = LANGUAGE_NAMES[languageCode] || languageCode;
      textPrompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE] ${textPrompt}`;
    }

    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          { text: textPrompt },
        ],
      },
      config: {
        temperature: 0.2,
      },
    });

    for await (const chunk of response) {
      if (abortSignal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    });
  } catch (error) {
    console.error("Snap & Solve Error:", error);
    throw error;
  }
};

export const generateJurisdictionAnalysis = async (
  text: string,
  languageCode: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    await withKeyRotation(async () => {
      const ai = getClient();

      let prompt = `You are an expert Indian legal jurisdiction advisor. Analyze the following legal situation and tell the citizen EXACTLY where to file their complaint or case.

Rules:
- Start with a clear "🏛️ **Jurisdiction Verdict**" header stating the primary forum in one line (e.g., "File at: **Cyber Crime Police Station** + **Consumer Forum**")
- Then provide a structured breakdown:

**1. Primary Forum** — The main authority where the complaint should go first
  - Full name of the court/forum/authority
  - Why this is the right forum (1 line)
  - Specific section/act that gives this forum jurisdiction

**2. Alternative/Additional Forums** — Other bodies that may also have jurisdiction
  - List each with reason

**3. Which Court Level?**
  - District Court / High Court / Supreme Court — and why
  - Mention pecuniary jurisdiction if relevant (e.g., "Amount < ₹1 Crore → District Consumer Forum")
  - Mention territorial jurisdiction ("File where the cause of action arose or where defendant resides")

**4. NOT Here** — Common mistakes people make
  - Forums where people wrongly go for this type of issue and why it won't work

**5. Quick Reference Table:**
| Forum | When to Go | Filing Fee | Time Limit |
|-------|-----------|------------|------------|
| (fill actual data) |

**6. Online Filing Options** — If e-filing is available, provide the exact portal URL

Key forums to consider:
- Police Station (FIR under IPC/BNS for criminal matters)
- Magistrate Court (for private complaints under CrPC 156(3)/BNSS)
- Civil Court (property, contracts, money recovery)
- Consumer Forum/Commission (consumer disputes, deficiency of service)
- Labour Court / Industrial Tribunal (employment disputes)
- Family Court (divorce, custody, maintenance)
- NCLT (company disputes, insolvency)
- Lok Adalat (pre-litigation settlement)
- Cyber Crime Cell (online fraud, cyber offences)
- RERA (real estate disputes)
- NGT (environmental matters)
- Human Rights Commission (fundamental rights violations)

Here is the legal situation to analyze:

${text}`;

    if (languageCode && languageCode !== 'en') {
      const langName = LANGUAGE_NAMES[languageCode] || languageCode;
      prompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE] ${prompt}`;
    }

    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    for await (const chunk of response) {
      if (abortSignal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    });
  } catch (error) {
    console.error("Jurisdiction Analysis Error:", error);
    throw error;
  }
};

export const generateActionPlan = async (
  text: string,
  languageCode: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    await withKeyRotation(async () => {
      const ai = getClient();

      let prompt = `You are a practical legal action planner for Indian citizens. Read the following legal explanation and convert it into a clear, numbered step-by-step ACTION PLAN — a checklist that tells the citizen exactly what to DO next.

Rules:
- Format as a numbered checklist with clear steps (Step 1, Step 2, etc.)
- Each step should have:
  - A bold action title (e.g., "**Gather Evidence**")
  - Specific items to collect or actions to take (documents, screenshots, receipts, etc.)
  - If applicable, a specific website URL or government portal (e.g., cybercrime.gov.in, services.ecourts.gov.in)
  - The specific form/category to select on that portal
- Include estimated timelines where possible (e.g., "FIR must be filed within 24 hours")
- Add a "📞 Emergency Contacts" section at the end with relevant helpline numbers (Women: 181, Cyber Crime: 1930, Police: 100, Legal Aid: NALSA 15100)
- Use checkboxes (☐) for sub-items so citizens can mentally track progress
- Keep it practical, specific, and actionable — no legal theory
- End with a reminder to consult a real advocate for their specific case

Here is the legal text to convert into an action plan:

${text}`;

    if (languageCode && languageCode !== 'en') {
      const langName = LANGUAGE_NAMES[languageCode] || languageCode;
      prompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE] ${prompt}`;
    }

    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.4,
      }
    });

    for await (const chunk of response) {
      if (abortSignal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    });
  } catch (error) {
    console.error("Action Plan Error:", error);
    throw error;
  }
};

export const simplifyLegalText = async (
  text: string,
  languageCode: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    await withKeyRotation(async () => {
      const ai = getClient();

      let prompt = `You are a friendly storyteller who makes law easy for everyone. Take the following legal explanation and rewrite it so a 10-year-old child can understand it perfectly.

Rules:
- Use simple everyday words — no legal jargon at all
- Use fun analogies, short stories, or "imagine this..." scenarios
- If there are section numbers or law names, keep them but explain what they mean in parentheses
- Use emojis sparingly to make it friendly (1-2 per paragraph max)
- Keep the same information but make it feel like a bedtime story explanation
- End with the same disclaimer but in simple words too

Here is the legal text to simplify:

${text}`;

    if (languageCode && languageCode !== 'en') {
      const langName = LANGUAGE_NAMES[languageCode] || languageCode;
      prompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE] ${prompt}`;
    }

    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    for await (const chunk of response) {
      if (abortSignal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    });
  } catch (error) {
    console.error("Simplify Error:", error);
    throw error;
  }
};

export const compareLaws = async (topic1: string, topic2: string) => {
    return await withKeyRotation(async () => {
      const ai = getClient();
    const prompt = `Compare the following two legal concepts/laws in the context of Indian Law:
    1. ${topic1}
    2. ${topic2}
    
    Create a comparison table followed by a summary of key differences and similarities.`;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION }
    });

    return response.text;
    });
};

// ── Scam Check / Cyber Safety ──────────────────────────────────────
export const analyzeScam = async (
  message: string,
  languageCode: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    await withKeyRotation(async () => {
      const ai = getClient();

      let prompt = `You are 🕵️ **Legal AI Scam Detector** — India's AI-powered cyber fraud analyst. A citizen has forwarded you a suspicious message, call, or link. Analyze it forensically.

## YOUR TASK:
Analyze the following message/description and determine if it is a SCAM, SUSPICIOUS, or SAFE.

## OUTPUT FORMAT (strictly follow this):

### 🚨 Verdict
State one of:
- 🔴 **SCAM DETECTED** — [Name of scam pattern, e.g. "Electricity Bill Disconnection Scam"]
- 🟡 **SUSPICIOUS** — [Reason it's suspicious]
- 🟢 **LIKELY SAFE** — [Brief reason]

### 🔍 Red Flags Identified
- List each red flag with explanation (urgency tactics, fake links, impersonation, demand for payment, etc.)
- Use ❌ emoji before each red flag

### ⚖️ Applicable Indian Laws
For each relevant law, provide:
- **Section** — What it covers — **Punishment**
Relevant laws to consider:
- IT Act, 2000 (Sec 66C identity theft, 66D cheating by personation, 43 unauthorized access)
- BNS (Sec 318 cheating, Sec 319 cheating by personation, Sec 336 forgery, Sec 340 forgery for cheating)
- IPC equivalents (Sec 420 cheating, 419 personation, 468 forgery for cheating) — mention both old and new
- RBI guidelines on UPI/banking fraud
- TRAI regulations on spam calls/SMS

### 🛡️ What You Should Do RIGHT NOW
Numbered action steps:
1. **Immediate action** (block number, don't click link, etc.)
2. **Report it** — Exact portal/number:
   - Cyber Crime Portal: cybercrime.gov.in (or call 1930)
   - Report SMS: Forward to 1909 (TRAI DND)
   - Report UPI fraud: Contact your bank + file on NPCI dispute portal
   - Report phishing: Report on the platform (WhatsApp → Report, etc.)
3. **Protect yourself** — Change passwords, enable 2FA, check statements
4. **If money was lost** — File FIR at nearest Cyber Crime Police Station within 24 hours (Golden Hour for fund recovery)

### 📋 Scam Pattern Database Match
Briefly describe the known scam pattern this matches (e.g., "This matches the KYC Expiry Scam pattern where fraudsters impersonate banks..."). If it's a new variant, say so.

### 💡 How This Scam Works (Modus Operandi)
Explain how this particular scam typically operates in 3-4 steps.

Be thorough, cite specific sections, and be protective of the citizen. Always err on the side of caution — if in doubt, flag it as suspicious.

End with:
**⚠️ Disclaimer: This analysis is AI-generated for educational awareness. If you have suffered financial loss, immediately call 1930 (Cyber Crime Helpline) and file an FIR.**

---
MESSAGE TO ANALYZE:

${message}`;

    if (languageCode && languageCode !== 'en') {
      const langName = LANGUAGE_NAMES[languageCode] || languageCode;
      prompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE] ${prompt}`;
    }

    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    for await (const chunk of response) {
      if (abortSignal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    });
  } catch (error) {
    console.error("Scam Check Error:", error);
    throw error;
  }
};

// ── Legal-Flow (Visual Roadmap / Flowchart Generator) ──────────────
export const generateLegalFlowchart = async (
  query: string,
  languageCode: string,
  abortSignal?: AbortSignal
): Promise<{ mermaid: string; explanation: string }> => {
  try {
    return await withKeyRotation(async () => {
      const ai = getClient();

    let prompt = `You are **Legal AI Legal-Flow**, an Indian legal process visualizer. The citizen wants a step-by-step visual roadmap for a legal process.

## YOUR TASK:
Generate a Mermaid.js flowchart for the given legal process AND a brief text explanation.

## STRICT OUTPUT FORMAT:
You MUST return EXACTLY two sections separated by the marker "---EXPLANATION---". Nothing else.

**Section 1: Mermaid code** (raw mermaid flowchart syntax, NO markdown fences)
**Section 2: Explanation** (after the ---EXPLANATION--- marker)

## MERMAID RULES (CRITICAL — follow exactly):
- Start with: flowchart TD
- Use simple node IDs like A, B, C, D, E, etc.
- Use square brackets for normal steps: A[Step text]
- Use curly braces for decisions: D{Decision?}
- Use arrows: A --> B or A -->|label| B
- Keep step text SHORT (max 8 words per node)
- Use -- Yes --> and -- No --> for decision branches
- Maximum 15 nodes to keep it readable
- Do NOT use special characters like quotes, parentheses, or colons INSIDE node text
- Do NOT use subgraph
- Do NOT wrap in code fences
- Include relevant Indian law sections in steps where applicable (e.g., "File FIR - Sec 173 BNSS")

## EXPLANATION RULES:
- After the ---EXPLANATION--- marker, provide a numbered explanation of each step
- Mention specific law sections, timelines, fees, and tips
- Keep it concise — max 2-3 lines per step
- End with the standard disclaimer

## EXAMPLE OUTPUT:
flowchart TD
    A[Incident Occurs] --> B{Cognizable Offence?}
    B -- Yes --> C[Go to Any Police Station]
    B -- No --> D[File Private Complaint - Sec 223 BNSS]
    C --> E[File FIR - Sec 173 BNSS]
    E --> F[Get Free FIR Copy]
    F --> G{FIR Registered?}
    G -- Yes --> H[Investigation Begins]
    G -- No --> I[Approach SP or Magistrate - Sec 175 BNSS]

---EXPLANATION---
1. **Incident Occurs** — Note the date, time, and details immediately.
2. **Cognizable Offence?** — If it involves theft, assault, murder, etc., police MUST register FIR.
...

## NOW GENERATE FOR:
${query}`;

    if (languageCode && languageCode !== 'en') {
      const langName = LANGUAGE_NAMES[languageCode] || languageCode;
      prompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE but keep Mermaid node IDs in English letters A-Z. Node text can be in ${langName}.] ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    const raw = response.text || '';

    // Split on the marker
    const parts = raw.split('---EXPLANATION---');
    let mermaidCode = parts[0]?.trim() || '';
    const explanation = parts[1]?.trim() || '';

    // Clean up mermaid code — remove any accidental fences
    mermaidCode = mermaidCode
      .replace(/^```mermaid\s*/i, '')
      .replace(/^```\s*/gm, '')
      .replace(/\s*```$/gm, '')
      .trim();

    return { mermaid: mermaidCode, explanation };
    });
  } catch (error) {
    console.error("Legal-Flow Error:", error);
    throw error;
  }
};

// ── Case Study Analysis ────────────────────────────────────────────
export const generateCaseStudy = async (
  query: string,
  languageCode: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
) => {
  try {
    let prompt = `You are **Legal AI Case Study Expert** — an elite Indian legal scholar who explains landmark and important court cases in vivid, educational detail.

## YOUR TASK:
The citizen wants a detailed case study analysis. Search your knowledge for the case and provide an exhaustive breakdown.

## OUTPUT FORMAT (follow strictly):

### 📋 Case Identity
- **Case Name**: Full citation (e.g., "Kesavananda Bharati v. State of Kerala, AIR 1973 SC 1461")
- **Court**: Which court decided it (Supreme Court / High Court / Tribunal)
- **Date of Judgment**: When it was decided
- **Bench**: Judges who heard the case (if landmark)
- **Citation**: AIR / SCC / SCR citation
- **Case Type**: Constitutional / Criminal / Civil / PIL / Writ etc.

### 📖 Background & Context
Explain the historical and social context in which this case arose. What was happening in India at that time? Why was this case important? (4-6 lines)

### 👥 Parties Involved
| Party | Role | Represented By |
|-------|------|---------------|
| (Petitioner/Appellant name) | Petitioner | Advocate name if known |
| (Respondent name) | Respondent | Advocate name if known |

### 📜 Facts of the Case
Narrate the complete facts in chronological order as a story — make it easy to understand:
1. What happened first
2. What led to the dispute
3. How it reached the court
(Use numbered steps, 5-8 facts)

### ⚖️ Legal Issues / Questions Before the Court
List each legal question the court had to answer:
1. Issue 1
2. Issue 2
(These are the specific legal questions framed by the court)

### 📊 Arguments

**Petitioner's Arguments:**
1. Argument 1
2. Argument 2

**Respondent's Arguments:**
1. Argument 1
2. Argument 2

### 🏛️ Judgment & Reasoning
- **Decision**: What did the court decide? (1-2 lines)
- **Ratio Decidendi**: The core legal principle established
- **Key Observations**: Important quotes or observations by the judges
- **Majority/Dissent**: If there was a split verdict, explain both sides

### 📐 Legal Principle Established
Explain the legal principle/doctrine this case established in simple language. Why is it studied in law schools?

### 🔗 Related Cases & Precedents
| Case | Relevance |
|------|-----------|
| (Related case 1) | How it connects |
| (Related case 2) | How it connects |

### 📈 Impact & Legacy
- How did this case change Indian law?
- Is it still followed today?
- Any subsequent modifications by later judgments?

### 🔗 Useful Links & Resources
Provide REAL, working links where possible:
- **Full Judgment**: https://indiankanoon.org/search/?formInput={case name formatted}
- **SCI Website**: https://main.sci.gov.in/
- **Case Status**: https://services.ecourts.gov.in/
- **Legal Commentary**: Suggest specific legal databases (SCC Online, Manupatra, LiveLaw)

### 🗺️ Visual Case Flow
Generate a Mermaid.js flowchart showing how this case progressed:
- Use \`\`\`mermaid code fence
- Show: Incident → Lower Court → Appeal → High Court → Supreme Court (as applicable)
- Include key decision points
- Maximum 10-12 nodes
- Start with: flowchart TD
- Use simple node IDs (A, B, C...)
- Keep node text under 8 words

**Important Rules:**
- If you don't know a case, say so clearly — do NOT hallucinate fake cases or citations
- Always mention if the case has been overruled or distinguished by a later judgment
- Use real section numbers and act names
- End with the standard disclaimer

---
CASE TO ANALYZE:

${query}`;

    if (languageCode && languageCode !== 'en') {
      const langName = LANGUAGE_NAMES[languageCode] || languageCode;
      prompt = `[RESPOND IN ${langName.toUpperCase()} LANGUAGE but keep case citations, section numbers, and Mermaid code in English] ${prompt}`;
    }

    await withKeyRotation(async () => {
      const ai = getClient();
      if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const response = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          temperature: 0.3,
        },
      });

      for await (const chunk of response) {
        if (abortSignal?.aborted) break;
        if (chunk.text) {
          onChunk(chunk.text);
        }
      }
    });
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Case Study Error:", error);
    throw error;
  }
};

// ── Judgment Analyzer (PDF text → structured analysis) ─────────────
export const analyzeJudgment = async (
  judgmentText: string,
  onChunk: (text: string) => void,
  abortSignal?: AbortSignal
): Promise<JudgmentAnalysis | null> => {
  try {
    let fullResponse = '';

    await withKeyRotation(async () => {
      const ai = getClient();

      const prompt = `You are **Legal AI Judgment Analyzer** — an expert Indian legal AI that dissects Supreme Court judgments.

You will receive the full text of an Indian court judgment. Analyze it and return a **strictly valid JSON** object with the following structure. Return ONLY the JSON — no markdown fences, no explanation outside the JSON.

{
  "catchwords": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "summary": "A comprehensive 200-300 word plain-language summary of the entire judgment — what happened, what was argued, what was decided.",
  "case_flow": [
    { "step": 1, "stage": "Origin / Incident", "description": "What originally happened that led to this case" },
    { "step": 2, "stage": "Lower Court / Tribunal", "description": "What happened at the first court level" },
    { "step": 3, "stage": "Appeal / High Court", "description": "How and why it was appealed" },
    { "step": 4, "stage": "Supreme Court Hearing", "description": "Key arguments and observations" },
    { "step": 5, "stage": "Final Verdict", "description": "The final decision and its reasoning" }
  ],
  "statutes": [
    {
      "section": "Section 302",
      "act": "Indian Penal Code, 1860",
      "explanation": "Punishment for murder — Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine."
    }
  ],
  "cited_cases": [
    {
      "case_name": "Kesavananda Bharati v. State of Kerala",
      "citation": "(1973) 4 SCC 225",
      "context": "Cited to establish the basic structure doctrine"
    }
  ],
  "court": "Supreme Court of India",
  "date": "2024-03-15",
  "judges": ["Justice A", "Justice B"],
  "parties": {
    "petitioner": "Name of Petitioner",
    "respondent": "Name of Respondent"
  },
  "decision": "One-line summary of the final order — e.g., 'Appeal dismissed. Conviction upheld.'",
  "case_type": "Criminal Appeal"
}

## RULES:
1. **catchwords**: Exactly 5 legal keyword tags that a lawyer would use to classify this case. Think headnotes.
2. **summary**: Write like explaining to a law student. Cover facts, issues, arguments, and decision.
3. **case_flow**: Provide 4-7 steps showing how the case progressed from incident to final verdict. This is NOT a flowchart — it's a narrative timeline. Each step should be 1-3 sentences.
4. **statutes**: Extract EVERY Act and Section mentioned or relied upon. For each, explain what that section actually says in plain English. If the judgment cites IPC sections, also mention the BNS equivalent if applicable.
5. **cited_cases**: Extract EVERY other case cited in this judgment. Include the citation reference if mentioned. Explain in one line why it was cited.
6. **judges**: Full names of all judges on the bench.
7. **parties**: Identify petitioner/appellant and respondent.
8. **decision**: The final order in one clear sentence.
9. **case_type**: One of: Criminal Appeal, Civil Appeal, Writ Petition, Special Leave Petition, Review Petition, PIL, Transfer Petition, Contempt, or Other.
10. **date**: In YYYY-MM-DD format. If not found, use "unknown".

Return ONLY valid JSON. No markdown. No code fences. No commentary before or after the JSON.

--- JUDGMENT TEXT ---

${judgmentText.slice(0, 80000)}`;

      const response = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      for await (const chunk of response) {
        if (abortSignal?.aborted) break;
        if (chunk.text) {
          fullResponse += chunk.text;
          onChunk(chunk.text);
        }
      }
    });

    // Parse the JSON
    try {
      // Clean up any stray markdown fences
      let cleaned = fullResponse.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleaned) as JudgmentAnalysis;
    } catch (parseErr) {
      console.error('Failed to parse judgment analysis JSON:', parseErr);
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Judgment Analysis Error:", error);
    throw error;
  }
};

// ── AI Search: search across judgment text snippets ────────────────
export const aiSearchJudgments = async (
  query: string,
  caseSnippets: { id: string; text: string }[],
  abortSignal?: AbortSignal
): Promise<string[]> => {
  try {
    return await withKeyRotation(async () => {
      const ai = getClient();

      const snippetList = caseSnippets
        .map((s, i) => `[ID:${s.id}]\n${s.text.slice(0, 500)}`)
        .join('\n---\n');

      const prompt = `You are a legal search engine. Given a user query and a list of case text snippets, return ONLY a JSON array of IDs that are most relevant to the query. Return 0-20 IDs max, most relevant first.

User query: "${query}"

Case snippets:
${snippetList}

Return ONLY a JSON array of ID strings, e.g.: ["10001-2023", "judis-12345"]. No explanation.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const raw = response.text?.trim() || '[]';
      try {
        return JSON.parse(raw) as string[];
      } catch {
        return [];
      }
    });
  } catch (error) {
    console.error("AI Search Error:", error);
    return [];
  }
};