// ============================================================
// KNOWLEDGE BASE TOOL — RAG Search for Tapas Kiran
// Searches uploaded police manuals, laws, SOPs
// ============================================================

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { retrieveContext, retrieveLawContext, retrieveSOPContext } from "../rag/retriever.js";

/**
 * Knowledge Base Search Tool
 * Searches the vector store of uploaded police documents
 */
export const kbSearchTool = tool(
  async ({ query, searchType = "general" }) => {
    try {
      let context;

      switch (searchType) {
        case "law":
          context = await retrieveLawContext(query);
          break;
        case "sop":
          context = await retrieveSOPContext(query);
          break;
        default:
          context = await retrieveContext(query);
      }

      if (!context) {
        return "⚠️ No relevant information found in the knowledge base for this query. Will use AI reasoning with ⚠️ AI/Internet Generated Answer (Not in KB) marker.";
      }

      return `📚 Knowledge Base Results:\n\n${context}`;

    } catch (error) {
      console.error("❌ KB search error:", error.message);
      return `⚠️ Knowledge base search failed: ${error.message}`;
    }
  },
  {
    name: "knowledge_base_search",
    description:
      "Search the Maharashtra Police knowledge base (uploaded manuals, BNS, BNSS, BSA, NDPS, POCSO, Standing Orders, IIF forms). Use this FIRST before web search for any police/law related query.",
    schema: z.object({
      query: z
        .string()
        .describe("The specific query to search in the knowledge base"),
      searchType: z
        .enum(["general", "law", "sop"])
        .optional()
        .default("general")
        .describe(
          "Type of search: 'law' for section lookups, 'sop' for investigation procedures, 'general' for all"
        ),
    }),
  }
);

/**
 * BNS/IPC Section Cross-Reference Tool
 */
export const lawCrossRefTool = tool(
  async ({ ipcSection }) => {
    // Static cross-reference map for common IPC → BNS sections
    const crossRefMap = {
      // Offences against body
      "302": "BNS 103 (Murder)",
      "304": "BNS 105 (Culpable Homicide not amounting to murder)",
      "304A": "BNS 106 (Causing death by negligence)",
      "304B": "BNS 80 (Dowry death)",
      "307": "BNS 109 (Attempt to murder)",
      "308": "BNS 110 (Attempt to commit culpable homicide)",
      "309": "BNS 226 (Attempt to commit suicide)",
      "323": "BNS 115(2) (Voluntarily causing hurt — simple)",
      "324": "BNS 115(2) (Voluntarily causing hurt by dangerous weapon)",
      "325": "BNS 116(2) (Voluntarily causing grievous hurt)",
      "326": "BNS 117(2) (Voluntarily causing grievous hurt by dangerous weapon)",
      "326A": "BNS 118(1) (Acid attack)",
      "326B": "BNS 118(2) (Attempt to throw acid)",

      // Sexual offences
      "354": "BNS 74 (Assault or criminal force on woman to outrage modesty)",
      "354A": "BNS 75 (Sexual harassment)",
      "354B": "BNS 76 (Assault with intent to disrobe)",
      "354C": "BNS 77 (Voyeurism)",
      "354D": "BNS 78 (Stalking)",
      "375": "BNS 63 (Definition of Rape)",
      "376": "BNS 64 (Rape — punishment)",
      "376A": "BNS 66 (Rape causing death or persistent vegetative state)",
      "376AB": "BNS 65(1) (Rape of woman under 12 years)",
      "376B": "BNS 67 (Sexual intercourse by husband on wife during separation)",
      "376C": "BNS 68 (Sexual intercourse by person in authority)",
      "376D": "BNS 70 (Gang rape)",
      "376DA": "BNS 70(2) (Gang rape of woman under 18)",
      "376DB": "BNS 65(2) (Gang rape of woman under 12)",

      // Dowry / domestic violence
      "498A": "BNS 85 (Cruelty by husband or relatives)",
      "406": "BNS 316 (Criminal breach of trust — dowry articles)",

      // Kidnapping / abduction
      "363": "BNS 137(2) (Kidnapping from India / lawful guardianship)",
      "364": "BNS 139(1) (Kidnapping for ransom/murder)",
      "365": "BNS 140 (Kidnapping to secretly confine)",
      "366": "BNS 141 (Kidnapping, abducting woman to compel marriage)",
      "366A": "BNS 142 (Procuration of minor girl)",
      "366B": "BNS 143 (Importation of girl from foreign country)",
      "367": "BNS 144 (Kidnapping with grievous hurt/slavery)",

      // Property offences
      "379": "BNS 303(2) (Theft)",
      "380": "BNS 305 (Theft in dwelling house)",
      "381": "BNS 306 (Theft by clerk/servant)",
      "382": "BNS 307 (Theft after preparation for hurt)",
      "383": "BNS 308(1) (Extortion)",
      "384": "BNS 308(2) (Extortion — punishment)",
      "386": "BNS 308(4) (Extortion by putting person in fear of death)",
      "390": "BNS 309(1) (Robbery definition)",
      "392": "BNS 309(2) (Robbery — punishment)",
      "393": "BNS 309(3) (Attempt to commit robbery)",
      "394": "BNS 309(4) (Voluntarily causing hurt in robbery)",
      "395": "BNS 310(2) (Dacoity)",
      "396": "BNS 311 (Dacoity with murder)",
      "397": "BNS 312 (Robbery/dacoity with attempt to cause death)",
      "399": "BNS 314(1) (Making preparation to commit dacoity)",
      "400": "BNS 314(2) (Belonging to gang of dacoits)",
      "403": "BNS 314 (Dishonest misappropriation of property)",
      "405": "BNS 316(1) (Criminal breach of trust — definition)",
      "406": "BNS 316(2) (Criminal breach of trust — punishment)",
      "409": "BNS 316(5) (CBT by public servant/banker/merchant)",

      // Fraud / cheating
      "415": "BNS 318(1) (Cheating — definition)",
      "417": "BNS 318(2) (Cheating — punishment)",
      "419": "BNS 318(3) (Cheating by personation)",
      "420": "BNS 318(4) (Cheating with dishonest inducement to deliver property)",

      // Document forgery
      "463": "BNS 336(1) (Forgery — definition)",
      "465": "BNS 336(2) (Forgery — punishment)",
      "467": "BNS 337(1) (Forgery of valuable security / will)",
      "468": "BNS 338 (Forgery for purpose of cheating)",
      "469": "BNS 339 (Forgery for purpose of harming reputation)",
      "471": "BNS 340 (Using forged document as genuine)",
      "472": "BNS 341 (Making/possessing counterfeit seal)",

      // Hurt — wrongful restraint/confinement
      "341": "BNS 126(1) (Wrongful restraint)",
      "342": "BNS 127(1) (Wrongful confinement)",
      "343": "BNS 127(2) (Wrongful confinement for 3+ days)",
      "344": "BNS 127(3) (Wrongful confinement for 10+ days)",
      "345": "BNS 127(4) (Wrongful confinement of person for whose liberation writ issued)",
      "346": "BNS 127(5) (Wrongful confinement in secret)",

      // Criminal intimidation / defamation
      "499": "BNS 356 (Defamation — definition)",
      "500": "BNS 356(2) (Defamation — punishment)",
      "503": "BNS 351(1) (Criminal intimidation)",
      "504": "BNS 352 (Intentional insult)",
      "506": "BNS 351(2)(3) (Punishment for criminal intimidation)",
      "507": "BNS 351(4) (Criminal intimidation by anonymous communication)",
      "508": "BNS 353 (Act caused by inducing person to believe he will be rendered an object of Divine displeasure)",

      // Rioting / unlawful assembly
      "141": "BNS 189 (Unlawful assembly)",
      "143": "BNS 190 (Punishment for unlawful assembly member)",
      "144": "BNS 191(1) (Joining unlawful assembly armed with deadly weapon)",
      "145": "BNS 191(2) (Joining/continuing in unlawful assembly knowing it has been commanded to disperse)",
      "146": "BNS 191(3) (Rioting)",
      "147": "BNS 191(4) (Punishment for rioting)",
      "148": "BNS 191(5) (Rioting armed with deadly weapon)",
      "149": "BNS 190 (Every member liable for common object)",

      // Offences against state / terrorist
      "121": "BNS 147 (Waging war against Government of India)",
      "124A": "BNS 152 (Acts endangering sovereignty, unity, integrity — sedition equivalent)",

      // Body corporate / hurt vehicular
      "279": "BNS 281 (Rash driving or riding on public way)",
      "304A": "BNS 106(1) (Causing death by negligence — vehicular)",
    };

    // CrPC → BNSS cross-reference
    const crpcBnssMap = {
      "154": "BNSS 173 (FIR — information in cognizable cases)",
      "155": "BNSS 174 (Information as to non-cognizable cases)",
      "156": "BNSS 175 (Police officer's power to investigate cognizable case)",
      "157": "BNSS 176 (Procedure for investigation)",
      "160": "BNSS 179 (Police officer's power to require attendance of witnesses)",
      "161": "BNSS 180 (Examination of witnesses by police)",
      "162": "BNSS 181 (Statements to police not to be signed)",
      "163": "BNSS 182 (No inducement to be offered)",
      "164": "BNSS 183 (Recording of confessions and statements)",
      "173": "BNSS 193 (Report of police officer on completion of investigation — chargesheet)",
      "41": "BNSS 35 (When police may arrest without warrant)",
      "41A": "BNSS 35(3) (Notice of appearance before police officer)",
      "46": "BNSS 43 (Arrest — how made)",
      "47": "BNSS 44 (Search of place entered by person sought to be arrested)",
      "49": "BNSS 46 (No unnecessary restraint)",
      "50": "BNSS 47 (Person arrested to be informed of grounds of arrest and right to bail)",
      "50A": "BNSS 48 (Obligation of person making arrest to inform about arrest etc.)",
      "54": "BNSS 51 (Examination of arrested person by medical officer)",
      "55A": "BNSS 53 (Health and safety of arrested person)",
      "56": "BNSS 57 (Person arrested to be taken before Magistrate or officer in charge)",
      "57": "BNSS 58 (Person arrested not to be detained more than 24 hours)",
      "58": "BNSS 59 (Police to report apprehensions)",
      "91": "BNSS 94 (Summons to produce document or other thing)",
      "100": "BNSS 105 (Persons in charge of closed place to allow search)",
      "102": "BNSS 106 (Power of police officer to seize certain property)",
      "165": "BNSS 185 (Search by police officer)",
      "166": "BNSS 186 (When officer in charge of police station may require another to issue search warrant)",
      "167": "BNSS 187 (Custody — Magistrate's remand power)",
      "170": "BNSS 190 (Cases to be sent to Magistrate when evidence is sufficient)",
      "207": "BNSS 230 (Supply of copy of police report and other documents)",
      "309": "BNSS 346 (Power to postpone or adjourn proceedings)",
      "313": "BNSS 351 (Power to examine the accused)",
      "436": "BNSS 478 (Bail in bailable offence)",
      "437": "BNSS 479 (When bail may be taken in non-bailable offence)",
      "438": "BNSS 482 (Direction for grant of bail to person apprehending arrest — anticipatory bail)",
      "439": "BNSS 483 (Special powers of High Court or Court of Sessions regarding bail)",
    };

    const ipcRef = crossRefMap[ipcSection];
    const crpcRef = crpcBnssMap[ipcSection];

    if (ipcRef) {
      return `IPC Section ${ipcSection} → ${ipcRef}\n\nNote: BNS 2023 replaces IPC 1860. Always use BNS sections in new cases registered after 01 July 2024.`;
    }
    if (crpcRef) {
      return `CrPC Section ${ipcSection} → ${crpcRef}\n\nNote: BNSS 2023 replaces CrPC 1973. Use BNSS sections for all proceedings initiated after 01 July 2024.`;
    }

    return `IPC Section ${ipcSection}: No direct cross-reference found in built-in map. Please check BNS 2023 directly or search the knowledge base. ⚠️ AI/Internet Generated Answer (Not in KB)`;
  },
  {
    name: "law_cross_reference",
    description:
      "Get BNS 2023 equivalent of an IPC section, or BNSS 2023 equivalent of a CrPC section. Use when officer asks about IPC→BNS or CrPC→BNSS cross-walks.",
    schema: z.object({
      ipcSection: z
        .string()
        .describe("The IPC section number (e.g., '302', '420', '376')"),
    }),
  }
);
