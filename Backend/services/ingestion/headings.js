// Detects "this line starts a new legal section / heading".
// Shared by the cleaner (never glue a heading onto the previous line) and the chunker.

// Explicit words: always a real section boundary.
const STRONG = /^(?:Section|Sec\.?|Article|Rule|Regulation|कलम|धारा|नियम)\s*([0-9]+[A-Za-z]?(?:\([0-9A-Za-z]+\))*)/i;
const CHAPTER = /^(?:CHAPTER|अध्याय)\s+([IVXLC0-9]+)/i;
// Bare numbers like "103. Punishment for murder." (BNS/IPC style) or "3.2 Arrest procedure".
const NUMBERED = /^([0-9]{1,3}[A-Z]?)\.\s+[A-Zऀ-ॿ(]/;
const DOTTED = /^([0-9]+(?:\.[0-9]+)+)\.?\s+\S/;

// Returns { sectionNumber, strong } or null. "strong" = split even if the previous section is short.
export function headingInfo(line) {
  const l = line.trim();
  let m;
  if ((m = l.match(STRONG))) return { sectionNumber: m[1], strong: true };
  if ((m = l.match(CHAPTER))) return { sectionNumber: `Chapter ${m[1]}`, strong: true };
  if ((m = l.match(NUMBERED)) || (m = l.match(DOTTED))) return { sectionNumber: m[1], strong: false };
  return null;
}
