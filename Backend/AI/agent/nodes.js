// ============================================================
// TAPAS KIRAN — LangGraph Agent Nodes
// Maharashtra Police SOP AI Assistant
// ============================================================
// Graph Flow:
// query → classify_mode → retrieve_context → generate_response → end
//               ↓ (if caselaw)
//         web_search → generate_response → end
// ============================================================

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { TAPAS_KIRAN_SYSTEM_PROMPT, QUERY_CLASSIFIER_PROMPT, CONTEXT_PROMPT } from "../prompts/systemPrompt.js";
import { retrieveContext, retrieveLawContext, retrieveSOPContext, retrieveFormContext } from "../rag/retriever.js";
import { formatHistoryAsString } from "../memory/conversationMemory.js";
import { webSearchTool } from "../tools/webSearch.js";
import { kbSearchTool, lawCrossRefTool } from "../tools/kbSearchTool.js";
import { getFormTemplate } from "../prompts/templates.js";

// ─────────────────────────────────────────
// LLM Instance
// ─────────────────────────────────────────
function getLLM(streaming = false) {
  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_MODEL || "gpt-4o",
    temperature: 0.2,
    streaming,
    maxTokens: 6000,
  });
}

// ─────────────────────────────────────────
// NODE 1: Query Classifier
// Determines mode: INVESTIGATION_SOP | FORM_AUTOFILL | LAW_LOOKUP | CASELAW_UPDATE
// ─────────────────────────────────────────
export async function classifyQueryNode(state) {
  const { query } = state;

  // Quick keyword-based pre-classification (saves LLM call for obvious cases)
  const queryLower = query.toLowerCase();

  let mode;

  if (
    // Officer explicitly wants to **draft/fill** a form or template
    (
      queryLower.includes("form") ||
      queryLower.includes("format") ||
      queryLower.includes("template") ||
      queryLower.includes("draft") ||
      queryLower.includes("भरुन") ||
      queryLower.includes("भरून") ||
      queryLower.includes("भरून द्या") ||
      queryLower.includes("fill")
    ) &&
    (
      // And they mention a specific form/type (FIR, IIF, panchnama, chargesheet, etc.)
      queryLower.includes("fir") ||
      queryLower.includes("iif") ||
      queryLower.includes("panchnama") ||
      queryLower.includes("panchanama") ||
      queryLower.includes("chargesheet") ||
      queryLower.includes("charge sheet") ||
      queryLower.includes("seizure") ||
      queryLower.includes("arrest") ||
      queryLower.includes("आरोपी पत्र") ||
      queryLower.includes("पंचनामा")
    )
  ) {
    mode = "FORM_AUTOFILL";
  } else if (
    queryLower.includes("latest") ||
    queryLower.includes("recent") ||
    queryLower.includes("judgment") ||
    queryLower.includes("न्यायनिर्णय") ||
    queryLower.includes("order") ||
    queryLower.includes("circular") ||
    queryLower.includes("notification") ||
    queryLower.includes("case law") ||
    queryLower.includes("guideline")
  ) {
    mode = "CASELAW_UPDATE";
  } else if (
    queryLower.includes("section") ||
    queryLower.includes("कलम") ||
    queryLower.includes("bns") ||
    queryLower.includes("bnss") ||
    queryLower.includes("ipc") ||
    queryLower.includes("act") ||
    queryLower.includes("law") ||
    queryLower.includes("कायदा") ||
    queryLower.includes("procedure")
  ) {
    mode = "LAW_LOOKUP";
  } else if (
    queryLower.includes("sop") ||
    queryLower.includes("investigate") ||
    queryLower.includes("तपास") ||
    queryLower.includes("what to do") ||
    queryLower.includes("काय करावे") ||
    queryLower.includes("steps") ||
    queryLower.includes("how to")
  ) {
    mode = "INVESTIGATION_SOP";
  } else if (
    queryLower.includes("forensic") ||
    queryLower.includes("फोरेन्सिक") ||
    queryLower.includes("fsl") ||
    queryLower.includes("fingerprint") ||
    queryLower.includes("dna") ||
    queryLower.includes("hash") ||
    queryLower.includes("sha-256") ||
    queryLower.includes("md5") ||
    queryLower.includes("cctv extraction") ||
    queryLower.includes("chain of custody") ||
    queryLower.includes("digital evidence") ||
    queryLower.includes("डिजिटल पुरावा") ||
    queryLower.includes("sample collection") ||
    queryLower.includes("expert witness") ||
    queryLower.includes("postmortem") ||
    queryLower.includes("serology")
  ) {
    mode = "FORENSIC_SUPPORT";
  } else if (
    queryLower.includes("check my fir") ||
    queryLower.includes("review my fir") ||
    queryLower.includes("compliance") ||
    queryLower.includes("check this draft") ||
    queryLower.includes("review this draft") ||
    queryLower.includes("missing field") ||
    queryLower.includes("wrong section") ||
    queryLower.includes("verify this fir") ||
    queryLower.includes("तपासा") ||
    queryLower.includes("त्रुटी")
  ) {
    mode = "COMPLIANCE_CHECK";
  } else {
    // Use LLM for ambiguous queries
    try {
      const llm = getLLM();
      const prompt = QUERY_CLASSIFIER_PROMPT.replace("{query}", query);
      const response = await llm.invoke([new HumanMessage(prompt)]);
      const classifiedMode = response.content.trim().toUpperCase();
      const validModes = ["INVESTIGATION_SOP", "FORM_AUTOFILL", "LAW_LOOKUP", "CASELAW_UPDATE", "FORENSIC_SUPPORT", "COMPLIANCE_CHECK"];
      mode = validModes.includes(classifiedMode) ? classifiedMode : "INVESTIGATION_SOP";
    } catch {
      mode = "INVESTIGATION_SOP";
    }
  }

  console.log(`🎯 Query classified as: ${mode}`);
  return { ...state, mode };
}

// ─────────────────────────────────────────
// NODE 2: Context Retriever
// Fetches relevant KB context + decides if web search needed
// ─────────────────────────────────────────
export async function retrieveContextNode(state) {
  const { query, mode } = state;

  let kbContext = null;
  let needsWebSearch = false;

  try {
    // Retrieve from KB based on mode
    switch (mode) {
      case "LAW_LOOKUP":
        kbContext = await retrieveLawContext(query);
        break;
      case "FORM_AUTOFILL":
        kbContext = await retrieveFormContext(query);
        break;
      case "INVESTIGATION_SOP": {
        // Retrieve both SOP context AND applicable BNS/BNSS law sections in parallel
        const [sopCtx, lawCtx] = await Promise.all([
          retrieveSOPContext(query),
          retrieveLawContext(`BNS BNSS sections applicable for: ${query}`),
        ]);
        const parts = [sopCtx, lawCtx].filter(Boolean);
        kbContext = parts.length > 0 ? parts.join("\n\n━━━━━ BNS/BNSS SECTION CONTEXT ━━━━━\n\n") : null;
        break;
      }
      case "CASELAW_UPDATE":
        kbContext = await retrieveContext(query, { k: 4 });
        needsWebSearch = true; // Always search web for latest case laws
        break;
      case "FORENSIC_SUPPORT": {
        // Retrieve forensic SOP + relevant BSA evidence law in parallel
        const [forCtx, bsaCtx] = await Promise.all([
          retrieveSOPContext(`forensic evidence protocol: ${query}`),
          retrieveLawContext(`BSA 2023 BSA evidence admissibility digital forensic: ${query}`),
        ]);
        const parts = [forCtx, bsaCtx].filter(Boolean);
        kbContext = parts.length > 0 ? parts.join("\n\n━━━━━ BSA / EVIDENCE LAW CONTEXT ━━━━━\n\n") : null;
        break;
      }
      case "COMPLIANCE_CHECK": {
        // Retrieve law context to validate sections in the draft
        const [compLaw, compSop] = await Promise.all([
          retrieveLawContext(`BNS BNSS section validation compliance: ${query}`),
          retrieveSOPContext(`FIR chargesheet mandatory fields: ${query}`),
        ]);
        const parts = [compLaw, compSop].filter(Boolean);
        kbContext = parts.length > 0 ? parts.join("\n\n━━━━━ SOP / FORM REQUIREMENTS CONTEXT ━━━━━\n\n") : null;
        break;
      }
    }

    // If KB has no context, flag for web search
    if (!kbContext) {
      needsWebSearch = true;
    }

  } catch (error) {
    console.error("❌ Context retrieval error:", error.message);
    needsWebSearch = true;
  }

  return { ...state, kbContext, needsWebSearch };
}

// ─────────────────────────────────────────
// NODE 3: Web Search Node (conditional)
// Runs only when KB lacks info or mode is CASELAW_UPDATE
// ─────────────────────────────────────────
export async function webSearchNode(state) {
  const { query, kbContext } = state;

  let webContext = null;

  try {
    const searchResult = await webSearchTool.invoke({
      query: query,
      maxResults: 4,
    });

    if (searchResult && !searchResult.startsWith("⚠️ Web search unavailable")) {
      webContext = searchResult;
    }
  } catch (error) {
    console.error("❌ Web search node error:", error.message);
  }

  return { ...state, webContext };
}

// ─────────────────────────────────────────
// NODE 4: Response Generator
// Combines context + history → generates bilingual response
// ─────────────────────────────────────────
export async function generateResponseNode(state) {
  const { query, mode, kbContext, webContext, sessionId, streaming } = state;

  // Build chat history context
  const chatHistory = formatHistoryAsString(sessionId || "default");

  // Build combined context
  let fullContext = "";
  let hasKBContext = false;

  if (kbContext) {
    fullContext += `📚 KNOWLEDGE BASE:\n${kbContext}\n\n`;
    hasKBContext = true;
  }

  if (webContext) {
    fullContext += `🌐 WEB SEARCH RESULTS:\n${webContext}\n\n`;
  }

  if (!fullContext) {
    fullContext = "No specific context retrieved. Use AI knowledge with ⚠️ AI/Internet Generated Answer (Not in KB) marker.";
  }

  // Get form template if FORM_AUTOFILL mode
  let formTemplate = "";
  if (mode === "FORM_AUTOFILL") {
    const formType = detectFormType(query);
    const template = getFormTemplate(formType);
    if (template) {
      formTemplate = `\n\nUSE THIS EXACT FORM STRUCTURE:\n${template}`;
    }
  }

  // ── Build crime-specific statute sheet ─────────────────────────
  const statuteSheet = buildCrimeStatuteSheet(query);

  // Build the final prompt
  const systemPrompt = TAPAS_KIRAN_SYSTEM_PROMPT;

  const userPrompt = `
CURRENT QUERY MODE: ${mode}

RETRIEVED CONTEXT:
${fullContext}${formTemplate}
${statuteSheet ? `\nPRE-RESOLVED STATUTE REFERENCE SHEET (authoritative — use these EXACT numbers):\n${statuteSheet}\n` : ""}

CONVERSATION HISTORY:
${chatHistory}

OFFICER'S QUERY: ${query}

═══════════════════════════════════════════════════════════════
MANDATORY INSTRUCTIONS — FOLLOW ALL WITHOUT EXCEPTION
═══════════════════════════════════════════════════════════════
${!hasKBContext ? "⚠️  KB NOTE: Answer is NOT confirmed in knowledge base — prefix with '⚠️ AI Generated – Verification Required'\n" : ""}
1. LANGUAGE: Marathi section first (official police style), then English section.

2. MODE FORMAT: Follow the ${mode} output structure from the system prompt exactly.

3. FORMS: Only produce IIF / FIR / Panchnama forms when mode is FORM_AUTOFILL or officer explicitly requests a form/template/draft.

4. SECTION NUMBERS — STRICTLY ENFORCED:
   a. The PRE-RESOLVED STATUTE SHEET above lists exact, verified section numbers.
   b. Use EXACTLY those numbers in your ⚖️ Section Block and throughout the response.
   c. NEVER write [X] or [?] for any section already listed in the Sheet.
   d. If you know an additional relevant section not in the Sheet, include it with the real number.
   e. Only use [?] if a section is completely unknown (very rare) AND absent from the Sheet.

5. POCSO AGE GUARD — CRITICAL:
   a. POCSO applies ONLY to victims UNDER 18 years of age.
   b. If victim age ≥ 18 → State explicitly: "POCSO does not apply — victim is [age] years (adult)."
   c. If victim age < 18 → Apply POCSO Sec 3, 5(n), 19 compulsorily.
   d. If age is unknown → Note: "Verify victim's age immediately — POCSO applicability depends on this."

6. AGGRAVATED PROVISIONS (non-negotiable for relevant cases):
   • Rape by stepfather / guardian / teacher / employer → BNS 64(2)(f) MUST be stated prominently
   • Rape + recording + viral threat → BNS 77 + BNS 351(2) + IT Act 66E + IT Act 67 MUST all appear
   • SC/ST victim → SC/ST (PoA) Act sections MUST be listed under Special Acts

7. ACCUSED RIGHTS (whenever arrest is discussed):
   MUST explicitly mention: BNSS Sec 47 (grounds communicated), BNSS Sec 51 (medical exam),
   BNSS Sec 58 (produced within 24 hrs), BNSS Sec 46 (no unnecessary restraint).

8. MANDATORY ⚖️ SECTION BLOCK — appears at the end of EVERY response using this exact markdown format:

## ⚖️ लागू कायदेशीर कलमे / Applicable Legal Sections

**📗 BNS 2023 — Bharatiya Nyaya Sanhita (Substantive Offences)**

| Section | Offence Name | Description |
|---------|-------------|-------------|
| **Sec [REAL NUMBER]** | [Offence Name] | [One-line description] |

*(List ALL applicable BNS sections in the table — NO [X] placeholders)*

**📘 BNSS 2023 — Bharatiya Nagarik Suraksha Sanhita (Procedure)**

| Section | Procedure / Power | Description |
|---------|------------------|-------------|
| **Sec [REAL NUMBER]** | [Procedure/Power] | [One-line description] |

*(Always include: 173 FIR, 35 Arrest, 47 Rights, 51 Medical, 58 24-hr, 185 Search, 187 Remand, 193 Chargesheet)*

**📙 BSA 2023 — Bharatiya Sakshya Adhiniyam (Evidence)**

| Section | Evidence Rule | Description |
|---------|--------------|-------------|
| **Sec [REAL NUMBER]** | [Evidence Rule] | [One-line description] |

*(Include Sec 57 electronic records, Sec 113 consent presumption for rape/dowry cases)*

**🔴 Special Acts (if applicable)**

| Act | Section | Provision | Description |
|-----|---------|-----------|-------------|
| [Act Name] | **Sec [REAL NUMBER]** | [Provision] | [One-line description] |

*(POCSO / IT Act / NDPS / SC-ST PoA Act as applicable)*

---

9. SUPERVISORY FLAG: Add "⚠️ **SUPERVISORY REVIEW RECOMMENDED**" if case involves death in custody, communal/political sensitivity, media-sensitive matter, or organised crime link.

10. FINAL LINE of every response (mandatory):
> ⚖️ *TAPAS KIRAN Assist operates strictly in assistive mode. All legal authority, accountability, and final decisions remain with authorized police officers.*
> 📌 **References:** [cite applicable statute books / KB documents used]

11. MARKDOWN FORMATTING — MANDATORY FOR ALL RESPONSES:
    The chat interface renders markdown natively. Use proper markdown throughout:
    - **Major section headings**: Use ## (e.g., ## तात्काळ कारवाई / Immediate Actions)
    - **Sub-headings**: Use ### (e.g., ### Physical Evidence)
    - **Bold**: Use **text** for: section numbers, act names, key legal terms, important warnings
    - **Horizontal dividers**: Use --- to separate major sections (NOT ━━━ or ═══ characters)
    - **Bullet lists**: Use - for unordered items (NOT • Unicode bullets)
    - **Numbered steps**: Use 1. 2. 3. for ordered action sequences
    - **Tables**: Use markdown tables (| Col | Col |) for structured data like section references
    - **Blockquotes**: Use > for the final TAPAS KIRAN declaration
    - **NEVER use ASCII box art**: No ━━━, ═══, ───, or similar Unicode line-drawing characters
    - **NEVER output plain paragraph walls** — break content into headed sections
    - Step-by-step actions, evidence items, arrest checks — always as numbered/bulleted lists

SELF-AUDIT before outputting:
  ✔ No [X] in section block   ✔ POCSO age guard applied      ✔ BNS 64(2)(f) if trust relationship
  ✔ Accused rights cited       ✔ Supervisory flag if needed   ✔ Final declaration present
  ✔ Markdown headings (##)     ✔ Section tables (| | |)       ✔ No ASCII box art (━━━ / ═══)
`;

  try {
    const llm = getLLM(streaming || false);

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await llm.invoke(messages);
    const answer = response.content;

    return { ...state, answer, error: null };

  } catch (error) {
    console.error("❌ Response generation error:", error.message);
    const fallback = `❌ Error generating response: ${error.message}\n\nPlease try rephrasing your query or check API key configuration.`;
    return { ...state, answer: fallback, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// CRIME STATUTE SHEET BUILDER
// Detects crime type from query text and returns a pre-resolved,
// authoritative BNS / BNSS / BSA / Special Act section sheet.
// This is injected directly into the LLM prompt so it NEVER
// has to guess or output [X] placeholders.
// ═══════════════════════════════════════════════════════════════
function buildCrimeStatuteSheet(query) {
  const q = query.toLowerCase();

  // ── Age extraction (for POCSO / juvenile guard) ─────────────────
  const ageMatch = query.match(/(\d{1,2})\s*(?:year|yrs|वर्ष)/i);
  const victimAge = ageMatch ? parseInt(ageMatch[1], 10) : null;
  const isMinorVictim = victimAge !== null && victimAge < 18;

  // ── Crime-type flags ────────────────────────────────────────────
  const isSuicide         = /suicide|आत्महत्या|self.harm|विषारी|poison|hung herself|hung himself|फाशी|jumped/.test(q);
  const isAbetmentSuicide = isSuicide && /husband|पती|wife|matrimon|cruelty|manas|mental|त्रास|harassment|relative|सासू|सासरे|नातेवाईक|in.law|taunt|छेड/.test(q);
  // Dowry death: woman died + husband/in-laws context (even without the word "dowry")
  const isDowryDeath      = /dowry death|हुंडा मृत्यू|304b/.test(q) ||
                            (isSuicide && /husband|पती|matrimon|सासू|सासरे|in.law|wife/.test(q) && /poison|विषारी|burn|जाळणे|hang|फाशी/.test(q));
  const isDomesticViolence= /dowry|हुंडा|domestic violence|cruelty by husband|498|मानसिक त्रास|mental.*harass|पतीने/.test(q) || isAbetmentSuicide;
  const isSexualOffence   = /rape|sexual assault|लैंगिक अत्याचार|बलात्कार|outrage modesty|voyeur|stalking|शरीरसंबंध/.test(q);
  const isSexualHarass    = /harassment|sexual harass|छेडछाड/.test(q) && !isSexualOffence;
  const isRecordingThreat = /video|record|viral|blackmail|ब्लॅकमेल|व्हिडीओ|धमकी|threat/.test(q);
  const isTrustRelation   = /stepfather|step father|सावत्र वडील|guardian|custod|relative|husband|employer|teacher|principal|uncle|अंकल/.test(q);
  // Murder: only flag if NOT clearly a suicide/abetment case
  const isMurder          = /murder|खून|homicide|culpable homicide|हत्या/.test(q) && !isAbetmentSuicide && !isDowryDeath;
  const isAttemptMurder   = /attempt.*murder|attempt.*kill/.test(q);
  const isTheft           = /theft|चोरी|steal/.test(q);
  const isRobbery         = /robbery|दरोडा|dacoity/.test(q);
  const isKidnapping      = /kidnap|अपहरण|abduct/.test(q);
  const isCheating        = /cheating|फसवणूक|fraud/.test(q);
  const isAcidAttack      = /acid|ऍसिड/.test(q);
  const isExtortion       = /extortion|खंडणी|blackmail/.test(q);
  const isCyberCrime      = /cyber|digital|online|social media|it act|hacking|66e|67/.test(q);
  const isNDPS            = /ndps|narcotics|drugs|nasha|अंमली|ganja|smack|charas/.test(q);
  const isSCSTOffence     = /sc.st|scheduled caste|scheduled tribe|atrocity|poa act/.test(q);

  const sheets = [];

  // ── SEXUAL OFFENCES ──────────────────────────────────────────────
  if (isSexualOffence) {
    const bnsSections = [
      "  • BNS Sec 63         — Rape (Definition)                        — Non-consensual penile/object penetration; definition clause",
      "  • BNS Sec 64(1)      — Rape (Punishment)                        — Rigorous imprisonment not less than 10 years; may extend to life + fine",
      "  • BNS Sec 64(2)(f)   — Rape by person in position of trust/authority — Stepfather, guardian, employer, teacher; RI min 10 yrs to life (ENHANCED)".concat(
        isTrustRelation ? "  ← APPLIES (stepfather/trust relationship detected)" : ""
      ),
      "  • BNS Sec 77         — Voyeurism                                — Recording/watching woman in private act without consent; 1–3 yrs (1st), 3–7 yrs (repeat)",
      "  • BNS Sec 74         — Assault to outrage modesty               — Assault/criminal force on woman; RI 1–5 years + fine",
      "  • BNS Sec 75         — Sexual harassment                        — Unwelcome sexual acts/demands; RI up to 3 years + fine",
      "  • BNS Sec 78         — Stalking                                 — Repeated unwanted contact/monitoring; RI up to 3 yrs (1st), 5 yrs (repeat)",
    ];
    if (isRecordingThreat) {
      bnsSections.push(
        "  • BNS Sec 351(2)     — Criminal Intimidation (video threat)   — Threatening to damage reputation by publishing video; RI up to 7 years",
        "  • BNS Sec 351(3)     — Criminal intimidation by anonymous comm — RI up to 2 years"
      );
    }
    if (isMinorVictim) {
      bnsSections.push(
        "  • BNS Sec 65(1)      — Rape of child under 12 years           — RI not less than 20 years; may extend to life or death penalty",
        "  • BNS Sec 70(2)      — Gang rape of woman under 18            — RI for life; fine payable to victim for medical/rehab"
      );
    }

    const bnssSections = [
      "  • BNSS Sec 173       — FIR registration                        — Mandatory registration of cognizable offence; copy to complainant free",
      "  • BNSS Sec 176(2)    — Investigation by DSP rank or above       — Mandatory for rape cases; cannot be delegated below DSP",
      "  • BNSS Sec 180       — Examination of witnesses by police       — Statements recorded in writing; signed by witness",
      "  • BNSS Sec 183       — Confessional statement before Magistrate — Only Magistrate-recorded confession admissible",
      "  • BNSS Sec 185       — Search by police officer                 — Search of accused premises / digital devices; panchnama mandatory",
      "  • BNSS Sec 187       — Remand / Custody                         — Production before Magistrate; custody extended only by Magistrate order",
      "  • BNSS Sec 193       — Chargesheet / Final Report               — Submitted to Magistrate within prescribed time after investigation",
      "  • BNSS Sec 35        — Arrest without warrant                   — Grounds: reasonable complaint / credible information of cognizable offence",
      "  • BNSS Sec 43        — How arrest is made                       — Officer shall touch/confine body; not use more force than necessary",
      "  • BNSS Sec 46        — No unnecessary restraint                 — Accused not to be restrained beyond what is necessary to prevent escape",
      "  • BNSS Sec 47        — Grounds of arrest communicated           — Accused MUST be informed of grounds at moment of arrest",
      "  • BNSS Sec 48        — Notice to nominated person of arrest     — Arrested person's nominated person to be informed immediately",
      "  • BNSS Sec 51(1)     — Medical examination of arrested person   — By registered medical practitioner within 24 hrs",
      "  • BNSS Sec 51(2)     — Medical examination of rape victim        — Mandatory; must be conducted by female medical officer",
      "  • BNSS Sec 58        — Produced before Magistrate within 24 hrs — Accused cannot be detained > 24 hrs without Magistrate's order",
      "  • BNSS Sec 482       — Anticipatory bail                         — Application to HC / Sessions Court before arrest",
    ];

    const bsaSections = [
      "  • BSA Sec 57         — Electronic records (admissibility)       — Electronic record is admissible as documentary evidence",
      "  • BSA Sec 58         — Presumption as to electronic records      — Court presumes records genuine if certified; burden on accused",
      "  • BSA Sec 113        — Presumption as to absence of consent      — Once intercourse proved, onus on accused to prove consent",
      "  • BSA Sec 22         — Conduct / motive as relevant fact         — Prior conduct, motive, and relationship pattern admissible",
    ];

    const specialActs = [];
    if (isRecordingThreat || isCyberCrime) {
      specialActs.push(
        "  • IT Act Sec 66E     — Violation of privacy (image recording)  — Capturing/publishing private image without consent; 3 yrs / Rs 2 lakh fine",
        "  • IT Act Sec 67      — Publishing obscene material online       — Threatening to publish video; RI 5 yrs + fine (1st offence)"
      );
    }
    if (isMinorVictim) {
      specialActs.push(
        "  • POCSO Act Sec 3    — Penetrative sexual assault on child (<18)— Minimum 10 years RI; may extend to life imprisonment",
        "  • POCSO Act Sec 5(n) — Aggravated penetrative sexual assault    — By relative/guardian/stepfather; min 20 yrs RI to life or death",
        "  • POCSO Act Sec 19   — Mandatory reporting obligation           — ANY person aware of offence MUST report to SJPU or local police",
        "  • POCSO Act Sec 22   — Punishment for false reporting           — False FIR against minor attracts 6 months imprisonment",
        "  • POCSO Act Sec 33   — Special Court for POCSO trials           — Designated Special Court; trial in-camera; identity protected"
      );
    } else if (victimAge !== null && victimAge >= 18) {
      specialActs.push(
        "  ⚠️  POCSO DOES NOT APPLY — Victim age is " + victimAge + " years (≥ 18). Apply BNS 64 + IT Act 66E/67 instead."
      );
    } else {
      specialActs.push(
        "  ⚠️  POCSO APPLICABILITY — Victim age not confirmed. Verify age immediately. If < 18, POCSO Sec 3/5/19 apply."
      );
    }
    if (isSCSTOffence) {
      specialActs.push(
        "  • SC/ST (PoA) Act Sec 3(1)(xii) — Sexual exploitation of SC/ST woman — Enhanced punishment; mandatory special court",
        "  • SC/ST (PoA) Act Sec 14A — Special Court jurisdiction          — All offences to be tried by designated Special Court only"
      );
    }

    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — SEXUAL OFFENCE SECTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + bnsSections.join("\n"));
    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📘 BNSS 2023 — INVESTIGATION PROCEDURE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + bnssSections.join("\n"));
    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📙 BSA 2023 — EVIDENCE SECTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + bsaSections.join("\n"));
    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔴 SPECIAL ACTS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + specialActs.join("\n"));
  }

  // ── MURDER / CULPABLE HOMICIDE ───────────────────────────────────
  if (isMurder) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — MURDER / HOMICIDE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BNS Sec 100        — Murder (definition)                     — Culpable homicide amounting to murder\n" +
      "  • BNS Sec 101        — Culpable homicide (not murder)          — Without intention to cause death; RI up to 10 yrs or life\n" +
      "  • BNS Sec 103        — Punishment for murder                   — Death or RI for life + fine\n" +
      "  • BNS Sec 106        — Causing death by negligence             — RI up to 5 years + fine\n" +
      (isAttemptMurder ? "  • BNS Sec 109        — Attempt to murder                        — RI up to 10 yrs or life (if hurt caused)\n" : "") +
      "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📘 BNSS 2023 — MURDER INVESTIGATION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BNSS Sec 173       — FIR registration\n" +
      "  • BNSS Sec 176       — Inquest / investigation into death\n" +
      "  • BNSS Sec 183       — Confessional statement before Magistrate\n" +
      "  • BNSS Sec 185       — Search of scene and premises\n" +
      "  • BNSS Sec 187       — Remand\n" +
      "  • BNSS Sec 193       — Chargesheet\n" +
      "  • BNSS Sec 35        — Arrest without warrant\n" +
      "  • BNSS Sec 47        — Grounds of arrest communicated to accused\n" +
      "  • BNSS Sec 58        — Production before Magistrate within 24 hours\n" +
      "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📙 BSA 2023 — EVIDENCE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BSA Sec 57         — Electronic records admissible\n" +
      "  • BSA Sec 26         — Confession to police officer (NOT admissible directly)\n" +
      "  • BSA Sec 28         — Confession before Magistrate — admissible"
    );
  }

  // ── KIDNAPPING ────────────────────────────────────────────────────
  if (isKidnapping) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — KIDNAPPING / ABDUCTION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BNS Sec 137(2)     — Kidnapping from lawful guardianship      — Minor taken without guardian consent; RI up to 7 years\n" +
      "  • BNS Sec 139(1)     — Kidnapping for ransom / murder           — RI for life; may extend to death penalty\n" +
      "  • BNS Sec 140        — Kidnapping to secretly confine           — RI up to 7 years + fine\n" +
      "  • BNS Sec 141        — Abducting woman to compel marriage       — RI up to 10 years + fine"
    );
  }

  // ── ABETMENT OF SUICIDE / DOWRY DEATH / MATRIMONIAL CRUELTY ────────
  if (isAbetmentSuicide || isDowryDeath || isDomesticViolence) {
    const bnsSec = [
      "  • BNS Sec 85         — Cruelty by husband or relatives          — Mental/physical cruelty amounting to danger to life/health; RI up to 3 yrs + fine",
      "  • BNS Sec 86         — Definition of cruelty (for Sec 85)       — Wilful conduct causing injury/danger; or harassment for unlawful demand",
    ];
    if (isDowryDeath) {
      bnsSec.unshift(
        "  • BNS Sec 80         — Dowry death (PRIMARY)                   — Woman's unnatural death within 7 yrs of marriage; shown to be caused by cruelty/harassment; RI min 7 yrs to life + fine  ← APPLY THIS FIRST"
      );
    }
    if (isAbetmentSuicide) {
      bnsSec.push(
        "  • BNS Sec 108        — Abetment of suicide                     — If person commits suicide by instigation/conspiracy/intentional facilitation; RI up to 10 yrs or life + fine",
        "  • BNS Sec 45         — Abetment (definition)                   — Instigating/engaging/intentionally aiding commission of offence"
      );
    }
    bnsSec.push(
      "  • BNS Sec 351(2)     — Criminal intimidation                    — Threatening to injure victim; RI up to 7 yrs (if threat to cause death/GH)"
    );

    const bnssSec = [
      "  • BNSS Sec 173       — FIR registration                        — Mandatory; unnatural death of wife = cognizable offence",
      "  • BNSS Sec 176       — Inquest into death                      — Magistrate/police inquest mandatory for unnatural death (Sec 176(1))",
      "  • BNSS Sec 180       — Examination of witnesses                — Statement of family members, neighbours, in-laws",
      "  • BNSS Sec 183       — Confessional statement before Magistrate— Only Magistrate-recorded confession admissible",
      "  • BNSS Sec 185       — Search of premises                      — Search accused's house; seize poison bottle, phone, letters",
      "  • BNSS Sec 187       — Remand / custody extension              — Produced before Magistrate; extended custody by judicial order only",
      "  • BNSS Sec 193       — Chargesheet / Final Report              — Submit to Magistrate after investigation",
      "  • BNSS Sec 35        — Arrest without warrant                  — Cognizable offence; arrest all named accused",
      "  • BNSS Sec 47        — Grounds of arrest communicated          — Inform accused of grounds at moment of arrest",
      "  • BNSS Sec 51        — Medical examination of arrested person  — By registered medical practitioner within 24 hrs",
      "  • BNSS Sec 58        — Produced before Magistrate within 24 hrs— Cannot detain > 24 hrs without Magistrate order",
    ];

    const bsaSec = [
      "  • BSA Sec 22         — Prior conduct / motive as relevant fact  — Pattern of cruelty, harassment messages, prior complaints admissible",
      "  • BSA Sec 57         — Electronic records admissible           — Call records, WhatsApp messages, CCTV footage",
      "  • BSA Sec 26         — Confession to police (NOT admissible directly) — Must record before Magistrate",
      "  • BSA Sec 28         — Confession before Magistrate            — Admissible if voluntary; important for abetment cases",
      "  • BSA Sec 113        — Presumption in dowry death cases        — If shown cruelty/harassment by husband/relatives, court shall presume abetment",
    ];

    const specialSec = [
      "  • PWDVA 2005 Sec 3   — Domestic violence (definition)          — Physical, sexual, verbal, emotional, economic abuse within matrimonial home",
      "  • PWDVA 2005 Sec 12  — Application for protection order        — Victim or any person on behalf can apply to Magistrate",
      "  • PWDVA 2005 Sec 18  — Protection order                        — Court may prohibit accused from committing further acts",
      "  • Dowry Prohibition Act 1961 Sec 3 — Giving/taking dowry      — Imprisonment min 5 yrs + fine ≥ Rs 15,000 (if demand proved)",
    ];
    if (isSCSTOffence) {
      specialSec.push("  • SC/ST (PoA) Act Sec 3(1)(r/s) — Intentional insult/cruelty targeting SC/ST victim — RI min 6 months to 5 yrs");
    }

    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — DOWRY DEATH / ABETMENT / CRUELTY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + bnsSec.join("\n"));
    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📘 BNSS 2023 — INVESTIGATION PROCEDURE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + bnssSec.join("\n"));
    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📙 BSA 2023 — EVIDENCE SECTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + bsaSec.join("\n"));
    sheets.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔴 SPECIAL ACTS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + specialSec.join("\n"));
  }

  // ── THEFT / ROBBERY ────────────────────────────────────────────────
  if (isTheft || isRobbery) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — PROPERTY OFFENCES\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      (isTheft   ? "  • BNS Sec 303(2)    — Theft                                    — RI up to 3 years + fine\n  • BNS Sec 305      — Theft in dwelling house                 — RI up to 7 years + fine\n" : "") +
      (isRobbery ? "  • BNS Sec 309(2)    — Robbery                                  — RI up to 10 years + fine\n  • BNS Sec 310(2)   — Dacoity                                  — RI up to 10 years; all members liable\n" : "")
    );
  }

  // ── CHEATING / FRAUD ───────────────────────────────────────────────
  if (isCheating) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — CHEATING / FRAUD\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BNS Sec 318(2)    — Cheating                                 — RI up to 3 years + fine\n" +
      "  • BNS Sec 318(4)    — Cheating by dishonest inducement          — Delivery of property; RI up to 7 years + fine\n" +
      "  • BNS Sec 318(3)    — Cheating by personation                  — RI up to 3 years + fine"
    );
  }

  // ── EXTORTION / CRIMINAL INTIMIDATION ─────────────────────────────
  if (isExtortion || (isRecordingThreat && !isSexualOffence)) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — EXTORTION / INTIMIDATION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BNS Sec 308(2)    — Extortion                                — RI up to 3 years; or fine; or both\n" +
      "  • BNS Sec 308(4)    — Extortion (fear of death/grievous hurt)   — RI up to 10 years + fine\n" +
      "  • BNS Sec 351(2)    — Criminal intimidation                    — Threatening to injure person/property/reputation; RI up to 7 years\n" +
      "  • BNS Sec 351(3)    — Criminal intimidation by anonymous comm  — RI up to 2 years"
    );
  }

  // ── ACID ATTACK ────────────────────────────────────────────────────
  if (isAcidAttack) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📗 BNS 2023 — ACID ATTACK\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BNS Sec 118(1)    — Acid attack                              — RI not less than 10 years; may extend to life\n" +
      "  • BNS Sec 118(2)    — Attempt to throw acid                    — RI not less than 5 years; may extend to 7 years + fine"
    );
  }

  // ── NDPS ────────────────────────────────────────────────────────────
  if (isNDPS) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔴 NDPS ACT 1985\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • NDPS Sec 8        — Core prohibition on production/sale/use\n" +
      "  • NDPS Sec 20       — Cannabis offences: small qty 1 yr; commercial 10 yrs to life\n" +
      "  • NDPS Sec 21       — Manufactured drugs: small qty 1 yr; commercial 10 yrs to life\n" +
      "  • NDPS Sec 37       — Bail restrictions: presumption against bail; PP to be heard"
    );
  }

  // ── CYBER CRIME (standalone, not already covered in sexual offences) ─
  if (isCyberCrime && !isSexualOffence) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔴 IT ACT 2000 — CYBER OFFENCES\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • IT Act Sec 66     — Computer-related offences (hacking)      — RI up to 3 years + fine\n" +
      "  • IT Act Sec 66C    — Identity theft                           — RI up to 3 years + Rs 1 lakh fine\n" +
      "  • IT Act Sec 66E    — Violation of privacy (image recording)   — RI up to 3 years + Rs 2 lakh fine\n" +
      "  • IT Act Sec 67     — Publishing/transmitting obscene material — RI up to 5 years + fine (1st offence)"
    );
  }

  // ── Generic BNSS block if no specific crime matched ─────────────────
  if (sheets.length === 0) {
    sheets.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📘 BNSS 2023 — STANDARD PROCEDURE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "  • BNSS Sec 173      — FIR registration\n" +
      "  • BNSS Sec 35       — Arrest without warrant\n" +
      "  • BNSS Sec 47       — Grounds of arrest communicated\n" +
      "  • BNSS Sec 51       — Medical examination of arrested person\n" +
      "  • BNSS Sec 58       — Production before Magistrate within 24 hrs\n" +
      "  • BNSS Sec 185      — Search\n" +
      "  • BNSS Sec 187      — Remand\n" +
      "  • BNSS Sec 193      — Chargesheet"
    );
  }

  return (
    "\n\n╔══════════════════════════════════════════════════════════╗\n" +
    "║  PRE-RESOLVED STATUTE REFERENCE SHEET                   ║\n" +
    "║  Use EXACTLY these section numbers in your response.    ║\n" +
    "║  DO NOT output [X] or [?] for ANY section listed below. ║\n" +
    "╚══════════════════════════════════════════════════════════╝\n" +
    sheets.join("\n\n") + "\n"
  );
}

// ─────────────────────────────────────────
// HELPER: Detect which IIF form is needed
// ─────────────────────────────────────────
function detectFormType(query) {
  const q = query.toLowerCase();

  if (q.includes("iif-1") || q.includes("fir") || q.includes("first information")) return "IIF-1";
  if (q.includes("iif-2") || q.includes("crime detail")) return "IIF-2";
  if (q.includes("iif-3") || q.includes("seizure") || q.includes("property search")) return "IIF-3";
  if (q.includes("iif-4") || q.includes("arrest") || q.includes("surrender")) return "IIF-4";
  if (q.includes("iif-5") || q.includes("chargesheet") || q.includes("final report")) return "IIF-5";
  if (q.includes("panchnama") || q.includes("spot panchnama")) return "PANCHNAMA";

  return "IIF-1"; // Default to FIR if unclear
}
