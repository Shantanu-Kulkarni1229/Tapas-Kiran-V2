// ============================================================
// DOCUMENT LOADER — RAG Pipeline for Tapas Kiran
// Loads: PDFs, DOCX, TXT, XLSX files — RECURSIVELY from /docs
// Supports nested subfolders (blank forms/, SOP/, laws/, etc.)
// ============================================================

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { fileURLToPath } from "url";

// CJS interop — pdf-parse v2 uses named export PDFParse class
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to uploaded law manuals, SOPs, IIF forms
export const DOCS_DIR = path.join(__dirname, "../docs");

// Supported file extensions
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".xlsx", ".xls"];

/**
 * Recursively walk a directory and return all file paths
 * @param {string} dirPath
 * @param {string[]} fileList - accumulator
 * @returns {string[]}
 */
function walkDirectory(dirPath, fileList = []) {
  if (!fs.existsSync(dirPath)) return fileList;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, fileList); // recurse
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

/**
 * Load a PDF file and return raw text using pdf-parse
 */
async function loadPDF(filePath) {
  try {
    const parser = new PDFParse({ url: filePath });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error(`❌ Error loading PDF ${filePath}:`, error.message);
    return "";
  }
}

/**
 * Load a DOCX file and return raw text using mammoth
 */
async function loadDOCX(filePath) {
  try {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error(`❌ Error loading DOCX ${filePath}:`, error.message);
    return "";
  }
}

/**
 * Load a plain text file
 */
function loadTXT(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`❌ Error loading TXT ${filePath}:`, error.message);
    return "";
  }
}

/**
 * Load an XLSX / XLS file and return text content
 * Each sheet is converted to pipe-delimited rows
 */
async function loadXLSX(filePath) {
  try {
    const XLSX = (await import("xlsx")).default;
    const workbook = XLSX.readFile(filePath);
    const lines = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      lines.push(`=== Sheet: ${sheetName} ===`);
      for (const row of rows) {
        lines.push(row.join(" | "));
      }
    }
    return lines.join("\n");
  } catch (error) {
    console.error(`❌ Error loading XLSX ${filePath}:`, error.message);
    return "";
  }
}

/**
 * Load ALL supported documents from a directory RECURSIVELY
 * Supported: .pdf, .docx, .txt, .md, .xlsx, .xls
 * Walks all nested subfolders automatically
 * @param {string} dirPath - root directory to scan
 * @returns {Array<{content: string, metadata: object}>}
 */
export async function loadDocumentsFromDirectory(dirPath = DOCS_DIR) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️ Docs directory not found: ${dirPath}. Creating...`);
    fs.mkdirSync(dirPath, { recursive: true });
    return [];
  }

  // Recursively collect all supported file paths
  const allFiles = walkDirectory(dirPath);
  const documents = [];

  console.log(`🔍 Found ${allFiles.length} documents across all subfolders...`);

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    // Use relative path from DOCS_DIR as source label (preserves subfolder context)
    const relPath = path.relative(dirPath, filePath);

    console.log(`📄 Loading: ${relPath}`);
    let content = "";

    switch (ext) {
      case ".pdf":
        content = await loadPDF(filePath);
        break;
      case ".docx":
        content = await loadDOCX(filePath);
        break;
      case ".txt":
      case ".md":
        content = loadTXT(filePath);
        break;
      case ".xlsx":
      case ".xls":
        content = await loadXLSX(filePath);
        break;
    }

    if (content.trim()) {
      // Determine category from parent folder name for richer metadata
      const folder = path.relative(dirPath, path.dirname(filePath)).split(path.sep)[0] || "root";

      documents.push({
        content: content.trim(),
        metadata: {
          source: relPath,
          sourceName: path.basename(filePath),
          folder: folder,
          filePath,
          fileType: ext,
          loadedAt: new Date().toISOString(),
        },
      });
      console.log(`   ✅ Loaded: ${relPath} (${Math.round(content.length / 1024)} KB)`);
    } else {
      console.warn(`   ⚠️ Empty content: ${relPath}`);
    }
  }

  console.log(`\n✅ Total: ${documents.length} documents loaded from ${dirPath}`);
  return documents;
}

/**
 * Split documents into chunks suitable for embedding
 * Using RecursiveCharacterTextSplitter for smart chunking
 */
export async function splitDocuments(documents) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,          // ~500 chars per chunk (Devanagari tokenizes at 3x; 500 chars ≈ 1500 tokens max)
    chunkOverlap: 100,       // 100 char overlap for context continuity
    separators: [
      "\n\n",               // Paragraph boundaries
      "\n",                 // Line boundaries
      "।",                  // Marathi sentence end
      ".",                  // English sentence end
      " ",
      "",
    ],
  });

  const chunks = [];
  for (const doc of documents) {
    const docChunks = await splitter.createDocuments(
      [doc.content],
      [doc.metadata]
    );
    chunks.push(...docChunks);
  }

  console.log(`✅ Split into ${chunks.length} chunks`);
  return chunks;
}

/**
 * Load a single document from buffer (for real-time uploads via API)
 * @param {Buffer} buffer - file buffer
 * @param {string} fileName - original file name
 * @param {string} mimeType - file MIME type
 */
export async function loadDocumentFromBuffer(buffer, fileName, mimeType) {
  let content = "";

  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      content = result.text;
    } catch (err) {
      console.error(`❌ PDF buffer parse error:`, err.message);
    }
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    try {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } catch (err) {
      console.error(`❌ DOCX buffer parse error:`, err.message);
    }
  } else {
    // Plain text / markdown
    content = buffer.toString("utf-8");
  }

  return {
    content: content.trim(),
    metadata: {
      source: fileName,
      fileType: path.extname(fileName),
      loadedAt: new Date().toISOString(),
    },
  };
}
