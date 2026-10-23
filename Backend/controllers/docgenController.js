import { TEMPLATES } from "../services/docgen/templates.js";
import { buildDocx } from "../services/docgen/build.js";
import { draftNarrative } from "../services/docgen/draft.js";
import { GeneratedDoc } from "../models/GeneratedDoc.js";
import { historyScope } from "../utils/scope.js";

export const templates = (req, res) => res.json({ templates: TEMPLATES });

// Step 1: the LLM drafts the narrative. The officer reviews/edits it in the UI.
export async function draft(req, res) {
  const { template, fields, notes } = req.valid;
  res.json({ narrative: await draftNarrative(template, fields, notes) });
}

// Step 2: after review, build the .docx from exactly what the officer approved.
export async function generate(req, res) {
  const { template, fields, narrative } = req.valid;
  const values = { ...fields, [TEMPLATES[template].narrative.key]: narrative };
  const buffer = await buildDocx(template, values);

  await GeneratedDoc.create({ userId: req.user._id, stationKey: req.user.stationKey, template, fields, narrative });
  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename="${template}.docx"`,
  });
  res.send(buffer);
}

export async function generatedHistory(req, res) {
  const items = await GeneratedDoc.find(historyScope(req.user)).sort({ createdAt: -1 }).limit(50).select("template createdAt").lean();
  res.json({ items });
}
