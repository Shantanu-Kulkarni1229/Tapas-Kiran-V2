// Generates small FICTIONAL PDFs for demos and tests:  npm run sample-docs
// Nothing here is real law or real police procedure. Section numbers and rules are made up.
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const outDir = path.resolve(process.argv[2] || "../sample-docs");
fs.mkdirSync(outDir, { recursive: true });

const docs = {
  "Sample Lost Property Act (Fictional)": [
    ["Section 1. Short title.", "This Act may be called the Sample Lost Property Act. It is a fictional law used only for demonstrating a document assistant."],
    ["Section 2. Definitions.", "In this Act, 'found item' means any movable object picked up by a person who is not its owner. 'Station' means the nearest police station of the area where the item was found."],
    ["Section 3. Duty to report.", "A person who finds an item worth more than 500 sample units shall hand it over to the station within 7 days of finding it. Failure to do so is an offence under Section 9."],
    ["Section 4. Register of found items.", "The station house officer shall record every found item in the Found Item Register with the date, a description, and the name of the finder."],
    ["Section 5. Public notice.", "For items worth more than 5,000 sample units, the station shall display a notice for 30 days at the station notice board before any disposal."],
    ["Section 6. Return to owner.", "The owner may claim the item by giving proof of ownership. The station shall record the claim and release the item against a signed receipt."],
    ["Section 7. Unclaimed items.", "An item not claimed within 90 days shall be given to the finder if the finder asks for it in writing, otherwise it shall be auctioned by the station under the direction of the district officer."],
    ["Section 8. Perishable items.", "Perishable items may be disposed of immediately and the reason recorded in the register."],
    ["Section 9. Penalty.", "Failure to report a found item under Section 3 is punishable with a fine of up to 2,000 sample units."],
  ],
  "Sample Station Procedure - Lost Property Report (Fictional)": [
    ["1. Purpose", "This fictional procedure explains how a station handles a lost property report from a citizen."],
    ["2. Receiving the report", "The duty officer asks the citizen for a description of the item, the place and time it was lost, and contact details. The officer then enters the report in the Lost Property Register."],
    ["3. Issuing the acknowledgement", "The officer gives the citizen a numbered acknowledgement slip. The slip must show the register number and the date."],
    ["4. Checking found items", "The officer checks the Found Item Register for a matching item. If a match is found, the officer follows Section 6 of the Sample Lost Property Act for return to the owner."],
    ["5. Follow up", "If no match is found, the report stays open for 90 days. The officer calls the citizen once if a matching item is later found."],
    ["6. Closing the report", "The report is closed when the item is returned or after 90 days. The closing date is written in the register."],
  ],
  "Sample Evidence Handling Guideline (Fictional)": [
    ["1. Scope", "This fictional guideline describes how a station labels and stores physical items kept as evidence."],
    ["2. Labelling", "Each item gets a tag showing the case number, the date, the place of collection, and the name of the officer who collected it."],
    ["3. Packing", "Items are packed separately. Wet items are dried before sealing. Sharp items are placed in a rigid container."],
    ["4. Storage", "Items are kept in the locked evidence room. The key is held by the evidence clerk. Every entry and exit is written in the Evidence Movement Register."],
    ["5. Transfer to court", "Items sent to court travel with a forwarding memo. The receiving clerk signs the memo, and the signed copy is filed with the case."],
  ],
};

for (const [title, sections] of Object.entries(docs)) {
  const pdf = new PDFDocument({ size: "A4", margin: 60 }); // A4 height 842: the footer at y=760 stays inside the page
  pdf.pipe(fs.createWriteStream(path.join(outDir, `${title}.pdf`)));

  // Repeat each section so the file spans several pages, giving the header/footer cleaner something to remove.
  const body = [...sections, ...sections.map(([h, t]) => [h + " (annex)", t + " " + t])];
  let page = 1;
  const decorate = () => {
    pdf.fontSize(8).text("FICTIONAL SAMPLE DOCUMENT - NOT REAL", 60, 30);
    pdf.text(`Page ${page}`, 60, 760);
    pdf.y = 70;
  };
  decorate();
  pdf.on("pageAdded", () => {
    page++;
    decorate();
  });

  pdf.fontSize(16).text(title, { align: "center" }).moveDown();
  body.forEach(([heading, text], i) => {
    if (i && i % 4 === 0) pdf.addPage();
    pdf.fontSize(12).font("Helvetica-Bold").text(heading).font("Helvetica").fontSize(11).text(text).moveDown();
  });
  pdf.end();
}
console.log(`Wrote ${Object.keys(docs).length} sample PDFs to ${outDir}`);
