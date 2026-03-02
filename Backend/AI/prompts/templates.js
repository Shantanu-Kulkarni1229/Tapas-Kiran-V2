// ============================================================
// IIF FORM TEMPLATES — All 5 IIF Forms + Supporting Forms
// Tapas Kiran — Maharashtra Police AI Assistant
// ============================================================

export const IIF_1_TEMPLATE = `
I.I.F.-1 – FIRST INFORMATION REPORT (FIR) / एकीकृत अन्वेषण फॉर्म - 1 – प्रथम तक्रार अहवाल
════════════════════════════════════════════════════════

1. District (जिल्हा): {district}
   P.S. (पोलीस ठाणे): {policeStation}
   Year (वर्ष): {year}
   FIR No. (प्रथम तक्रार अह. क्र.): {firNo}
   Date & Time of FIR (दिनांक व वेळ): {firDateTime}

2. Acts & Sections (अधिनियम व कलमे):
   Act: {act}
   Sections: {sections}

3. Occurrence of Offence (गुन्ह्याचा प्रकार):
   Day: {day}
   Date From: {dateFrom}   Date To: {dateTo}
   Time From: {timeFrom}   Time To: {timeTo}

4. Information received at P.S.:
   Date: {infoDate}   Time: {infoTime}
   
5. General Diary Reference:
   Entry No.: {gdEntryNo}
   Date & Time: {gdDateTime}
   Type of Information: {infoType}

6. Place of Occurrence (घटनास्थळ):
   Direction & Distance from P.S.: {directionDistance}
   Beat No.: {beatNo}
   Address: {occurrenceAddress}

7. Complainant / Informant Details (तक्रारदार/माहिती देणाऱ्याचे तपशील):
   Name (नाव): {complainantName}
   Father's/Husband's Name (वडिलांचे/पतीचे नाव): {complainantFatherName}
   DOB/Year (जन्म तारीख/वर्ष): {complainantDOB}
   Nationality (राष्ट्रीयत्व): {complainantNationality}
   UID No.: {complainantUID}
   Address (पत्ता): {complainantAddress}
   Occupation (व्यवसाय): {complainantOccupation}
   Phone/Mobile (फोन/मोबाईल): {complainantPhone}

8. Accused Details (आरोपीचे तपशील):
   Name/Alias (नाव/टोपणनाव): {accusedName}
   Relative's Name (नातेवाईकाचे नाव): {accusedRelativeName}
   Address (पत्ता): {accusedAddress}

9. Reasons for Delay in Reporting (उशिराने तक्रार नोंदवण्याची कारणे): {delayReason}

10. Particulars of Property (मालमत्तेचे तपशील):
    Category: {propertyCategory}
    Type: {propertyType}
    Description: {propertyDescription}
    Value (Rs.): {propertyValue}
    Total Value (Rs.): {totalPropertyValue}

11. Inquest Report / U.D. Case No.: {inquestNo}

12. First Information Contents (प्रथम तक्रारीचा मजकूर):
{firContent}

13. Action Taken (केलेली कारवाई):
    [ ] Registered FIR and investigating
    [ ] Directed to IO
    [ ] Refused investigation (with reason)
    [ ] Transferred to P.S.: ___________
    Action: {actionTaken}

14. Signature: _______________   Date: {signDate}
    Officer-In-Charge (अधिकारी): {officerName}
    Rank (हुद्दा): {officerRank}   Badge No.: {officerBadge}

⚖️ Applicable BNS/BNSS Sections: {legalSections}
📌 References: Bombay Police Manual | BNS 2023 | BNSS 2023
`;

export const IIF_2_TEMPLATE = `
I.I.F.-2 – CRIME DETAILS FORM / गुन्ह्याचे तपशील फॉर्म
════════════════════════════════════════════════════════

District (जिल्हा): {district} | P.S. (पोलीस ठाणे): {policeStation}
Year (वर्ष): {year} | FIR No. (गुन्हा क्र.): {firNo} | Date (तारीख): {date}

── FORM 2-A: CRIME DETAILS ──────────────────────────
1. Act and Section (कायदा व कलम): {actSection}

2. Place Shown By (घटना दाखवणारा):
   Name: {witnessName} | Father's Name: {witnessFather} | Address: {witnessAddress}

3. Type of Crime (गुन्ह्याचा प्रकार):
   (i)   Major Head (प्रमुख शीर्षक): {majorHead}
   (ii)  Minor Head (गौण शीर्षक): {minorHead}
   (iii) Method(s) (पद्धती): {methods}
   (iv)  Conveyances Used (वाहने): {conveyances}
   (v)   Character Assumed (वेष): {characterAssumed}
   (vi)  Language/Slang Used (भाषा/बोली): {language}
   (vii) Special Feature-1: {specialFeature1}
   (viii)Special Feature-2: {specialFeature2}
   (ix)  Special Feature-3: {specialFeature3}
   (x)   Type of Place (ठिकाणाचा प्रकार): {placeType}
   (xi)  Type of Property Involved (मालमत्तेचा प्रकार): {propertyTypeInvolved}

── FORM 2-B: PARTICULARS OF VICTIMS ─────────────────
(1)  Full Name (संपूर्ण नाव): {victimName}
(2)  Date/Year of Birth (जन्मतारीख/वर्ष): {victimDOB}
(3)  Sex (लिंग): {victimSex}
(4)  Nationality (राष्ट्रीयत्व): {victimNationality}
(5)  Religion (धर्म): {victimReligion}
(6)  SC/ST (अनुसूचित जाती/जमाती): {victimSCST}
(7)  Occupation (व्यवसाय): {victimOccupation}
(8)  Address (पत्ता): {victimAddress}
(9)  Injury: Grievous/Simple (दुखापत): {victimInjury}
(10) Means/Weapon (साधन/शस्त्र): {weapon}
(11) Remarks (नोंदी): {victimRemarks}

── FORM 2-C: PLACE & EVIDENCE ───────────────────────
5.  Motive of Crime (गुन्ह्याचे कारण): {motive}
6.  Details of Properties Stolen/Involved: {stolenProperty}
7.  Description of Place of Occurrence (घटनेच्या ठिकाणाचे वर्णन): {placeDescription}
8.  Map (नकाशा): [Attach if applicable / लागू असल्यास जोडावे]
9.  Physical Evidence Recovered/Seized: {physicalEvidence}
10. Date & Time of Panchnama: {panchnamaDateTime}
11. Panchas:
    Panch 1: Name: {panch1Name} | Address: {panch1Address} | Signature: ___
    Panch 2: Name: {panch2Name} | Address: {panch2Address} | Signature: ___
12. IO Name: {ioName} | Rank: {ioRank} | Badge No.: {ioBadge} | Signature: ___

⚖️ Applicable Sections: {legalSections}
📌 References: BNS 2023 | BNSS 2023 | Bombay Police Manual
`;

export const IIF_3_TEMPLATE = `
I.I.F.-3 – PROPERTY SEARCH & SEIZURE FORM / मालमत्ता शोध व जप्ती फॉर्म
(Search / Production / Recovery u/s. 185 B.N.S.S.)
════════════════════════════════════════════════════════

District (जिल्हा): {district} | P.S. (पोलीस ठाणे): {policeStation}
Year (वर्ष): {year} | FIR/Case No.: {firNo} | Date (दिनांक): {date}

Act and Section (कायदा व कलम): {actSection}

Nature of Property Seized / जप्त मालमत्तेचा प्रकार:
   [ ] Stolen (चोरीचा)  [ ] Borrowed (उसने)  [ ] Suspicious (संशयास्पद)
   [ ] Unclaimed (मालक नसलेला)  [ ] Material Evidence (भौतिक पुरावा)
   Type: {propertyNature}

4(a). Date of Seizure (जप्तीची तारीख): {seizureDate}
4(b). Time of Seizure (जप्तीची वेळ): {seizureTime}
4(c). Place from where Seized (जप्तीचे ठिकाण): {seizurePlace}
4(d). Description of Place: {seizurePlaceDescription}

5.    Person from whom Seized (ज्याच्याकडून जप्त केले):
      Name: {seizedFromName} | Father's/Husband's: {seizedFromFather}
      Sex: {seizedFromSex} | Age: {seizedFromAge}
      Occupation: {seizedFromOccupation} | Address: {seizedFromAddress}

6(i). Witness 1 (साक्षीदार १):
      Name: {witness1Name} | Father's: {witness1Father}
      Sex: {witness1Sex} | Age: {witness1Age}
      Occupation: {witness1Occupation} | Address: {witness1Address}

6(ii).Witness 2 (साक्षीदार २):
      Name: {witness2Name} | Father's: {witness2Father}
      Sex: {witness2Sex} | Age: {witness2Age}
      Occupation: {witness2Occupation} | Address: {witness2Address}

7.    Purpose for Seizure (जप्ती कारण): {seizurePurpose}
8.    Purpose for Custody (ठेव कारण): {custodyPurpose}
9.    Property to be Produced Before Court (न्यायालयात सादर): {producedInCourt}

10.   Description of Seized Property (जप्त मालमत्तेचे वर्णन):
      {propertyDescription}

11.   Storage/Preservation (साठवण/सुरक्षित ठेव): {storage}

12.   Property Seized in Presence of Panchas: {panchNames}

13.   Any Property Damaged/Destroyed Before Seizure: {damaged}

14.   Panchas (Name, Full Address, Signature):
      1) {panch1Name}, {panch1Address} — Signature: ___
      2) {panch2Name}, {panch2Address} — Signature: ___

      Date (दिनांक): {signDate}
      IO Name: {ioName} | Rank: {ioRank} | Badge No.: {ioBadge} | Signature: ___

── घटनास्थळ पंचनामा / SPOT PANCHNAMA ──────────────────
Date (दिनांक): {spotDate}
Panch 1 Name (पंच १): {spotPanch1}
Panch 2 Name (पंच २): {spotPanch2}
Description of Scene (घटनास्थळाचे वर्णन): {sceneDescription}
Sketch/Map: [Attach if applicable]
Panch 1 Signature: ___   Panch 2 Signature: ___
IO Name & Signature: {ioName} | Rank: {ioRank} | Badge: {ioBadge}

⚖️ Applicable Sections: u/s 185 BNSS + {additionalSections}
📌 References: BNSS 2023 | BNS 2023 | Bombay Police Manual
`;

export const IIF_4_TEMPLATE = `
I.I.F.-4 – ARREST / COURT SURRENDER FORM / अटक / न्यायालयात समर्पण फॉर्म
(Separate memo for each accused / प्रत्येक आरोपीसाठी स्वतंत्र फॉर्म)
════════════════════════════════════════════════════════

── FORM 3A ──────────────────────────────────────────

1. District (जिल्हा): {district} | P.S. (पोलीस ठाणे): {policeStation}
   FIR/Proceeding No.: {firNo} | GD No.: {gdNo} | Year: {year} | Date: {date}
   Alphanumeric Code of Accused: {accusedCode}

2. Date, Time & Place of Arrest/Surrender:
   Date (दिनांक): {arrestDate} | Time (वेळ): {arrestTime}
   GD No.: {arrestGD} | Place: {arrestPlace}
   P.S.: {arrestPS} | District: {arrestDistrict} | State: {arrestState}

3. Name of Court (if surrendered): {courtName}

4. Acts and Sections (कायदे व कलमे): {actsSections}

5. Arrest Status (लागू ते ✓ चिन्हांकित):
   {arrestStatus}

6. Particulars of Accused (आरोपीची माहिती):
   (i)   Name (नाव): {accusedName}
   (ii)  Father's/Husband's/Guardian's Name: {accusedFather}
   (iii) First Alias (पहिला टोपणनाव): {alias1}
   (iv)  Second Alias (दुसरा टोपणनाव): {alias2}
   (v)   Nationality (राष्ट्रीयत्व): {nationality}
   (vi)  Voter ID: {voterId} | Passport No.: {passportNo}
         Date of Issue: {passportIssueDate} | Place: {passportIssuePlace}
   (vii) Religion (धर्म): {religion}
   (viii)Caste/Tribe (जात/जमात): {caste}
   (ix)  SC/ST/OBC: {scstObc}
   (x)   Occupation (व्यवसाय): {occupation}
   (xi)  Permanent Address (State/District/P.S.): {permanentAddress}
   (xii) Present Address (State/District/P.S.): {presentAddress}

7. Injuries/Physical Condition of Accused: {injuries}

── FORM 3B ──────────────────────────────────────────

8.  Accused Informed of Grounds of Arrest & Legal Rights on:
    Date: {rightsDate} | Time: {rightsTime} | Place: {rightsPlace}

9.  Articles Found on Search of Accused:
    1) {article1}
    2) {article2}
    3) {article3}
    (If none → NIL)

10. Physical Features of Accused:
    Sex: {sex} | DOB/Year: {dob} | Build (शरीरयष्टी): {build}
    Height (cms): {height} | Complexion (रंग): {complexion}
    Identification Marks: {idMarks} | Deformities: {deformities}
    Teeth: {teeth} | Hair: {hair} | Eyes: {eyes}
    Speech/Voice: {speech} | Dress Habits: {dress}
    Languages: {languages} | Burn Marks: {burnMarks}
    Mole (खुण): {mole} | Scar (ओरखडा): {scar} | Tattoo: {tattoo}
    Forehead: {forehead} | Ear: {ear} | Nose: {nose}
    Moustache: {moustache} | Face: {face} | Lips: {lips}

── FORM 3C ──────────────────────────────────────────

11. Fingerprint Taken (बोटांचे ठसे): {fingerprintTaken}

12. Socio-Economic Profile:
    (a) Living Status: {livingStatus}
    (b) Education: {education}
    (c) Occupation: {socioOccupation}
    (d) Income Group: {incomeGroup}

13. Criminal History Observations:
    [ ] Dangerous  [ ] Escaped Bail Earlier  [ ] Armed
    [ ] Works with Accomplices  [ ] Past Criminal Record
    [ ] Repeat Offender  [ ] Likely to Escape Bail
    [ ] Likely to Threaten Victims/Witnesses
    [ ] Wanted in Other Cases: {otherCases}
    Observations: {criminalHistory}

14. Panchas (पंच — नाव, पत्ता, स्वाक्षरी):
    1) {panch1Name}, {panch1Address} — Signature: ___
    2) {panch2Name}, {panch2Address} — Signature: ___

15. Signature & Thumb Impression of Accused: ___

16. Place: {sigPlace} | Date: {sigDate}

17. IO Name: {ioName} | Rank: {ioRank} | Badge No.: {ioBadge} | Signature: ___

⚖️ Applicable Sections: {legalSections}
📌 References: BNSS 2023 | BNS 2023 | Bombay Police Manual
`;

export const IIF_5_TEMPLATE = `
I.I.F.-5 – FINAL REPORT FORM (CHARGESHEET) / अंतिम अहवाल फॉर्म (आरोपी पत्र)
════════════════════════════════════════════════════════

── PAGE 1: GENERAL DETAILS ──────────────────────────

District (जिल्हा): {district} | P.S. (पो.स्टे.): {policeStation}
Year (वर्ष): {year} | FIR No. (गु.र.क्र.): {firNo} | Date (दिनांक): {date}
Final Report/Charge Sheet No. (अंतिम अहवाल/आरोपी पत्र क्र.): {chargeSheetNo}
Date of Final Report (दिनांक): {finalReportDate}

Act (भारतीय न्याय संहिता २०२३): {act}
Section (कलम): {sections}

Type of Final Report (अहवालाचा प्रकार):
   {reportType}
   Options: Charge Sheeted | Not Charge Sheeted (want of evidence) | FR Undetect | FR Untraced | FR Offence Abated | FR Unoccurred

If FR Unoccurred: {frUnoccurredType}
   Options: False | Mistake of Fact | Mistake of Law | Non-Cognizable | Civil Nature

If Charge Sheeted: {chargeSheetType}
   Options: Original | Supplementary

Name of I.O. (तपासणी अधिकाऱ्याचे नाव): {ioName}
Rank (पदनाम): {ioRank} | No. (क्रमांक): {ioNo}

Complainant/Informant:
   (a) Name (तक्रारदाराचे नाव): {complainantName}
   (b) Father's/Husband's Name: {complainantFather}

Details of Properties/Articles:
   Sr.No | Description | Estimated Value (Rs.) | PS Property Register No. | From Whom Seized | Disposal
   {propertiesTable}

── PAGE 2: ACCUSED DETAILS ──────────────────────────

Particulars of Accused (आरोपीची माहिती):
   Name (नाव): {accusedName}
   Father's/Husband's Name: {accusedFather}
   Date/Year of Birth: {accusedDOB}
   Sex (लिंग): {accusedSex} | Nationality: {accusedNationality}
   Passport No.: {passportNo} | Issue Date: {passportDate} | Issue Place: {passportPlace}
   Religion (धर्म): {religion} | SC/ST: {scst}
   Occupation (व्यवसाय): {occupation}
   Address (पत्ता): {address} | Verified: {verified}
   Provisional Criminal No.: {provCriminalNo}
   Regular Criminal No.: {regCriminalNo}
   Date of Arrest: {arrestDate}
   Date of Release on Bail: {bailDate}
   Date Forwarded to Court: {courtDate}
   Under Acts & Sections: {chargedSections}
   Bailers/Sureties Name & Address: {sureties}
   Previous Convictions: {previousConvictions}
   Status: {accusedStatus}
   (Custody / Absconding / Proclaimed Offender)

Summary Charges: {summaryCharges}

── PAGE 3: WITNESSES & EVIDENCE ─────────────────────

Witness List:
   Sr.No | Witness Name | Age | Occupation | Address | Nature of Evidence
   {witnessTable}

Details of Seized Property/Evidence:
   {evidenceDetails}

If FIR is False — Action u/s 182/211 IPC: {falseFIRAction}
Result of Laboratory Analysis: {labAnalysis}

── PAGE 4: FINAL SECTION ────────────────────────────

Brief Facts of the Case (थोडक्यात माहिती):
{briefFacts}

IO Signature: ___ | Rank: {ioRank} | Date: {signDate}
Countersigned by: ___ | Designation: ___

⚖️ Applicable Sections: {legalSections}
📌 References: BNS 2023 | BNSS 2023 | Bombay Police Manual | IPC 1860 (cross-ref)
`;

export const PANCHNAMA_TEMPLATE = `
घटनास्थळ पंचनामा / SPOT PANCHNAMA
Javab Panchanama (u/s 161 BNSS / CrPC)
════════════════════════════════════════════════════════

District (जिल्हा): {district} | P.S.: {policeStation}
FIR No.: {firNo} | Date (दिनांक): {date}

Panch 1 (पंच १): {panch1Name} | Address: {panch1Address}
Panch 2 (पंच २): {panch2Name} | Address: {panch2Address}

Date & Time of Panchnama: {panchnamaDateTime}
Place of Panchnama: {panchnamaPlace}

Description of Scene / घटनास्थळाचे वर्णन:
{sceneDescription}

Evidence Observed / आढळलेले पुरावे:
{evidenceObserved}

Sketch/Map: [Attach if applicable / लागू असल्यास जोडावे]

Panch 1 Signature: ___ | Panch 2 Signature: ___

IO Name: {ioName} | Rank: {ioRank} | Badge No.: {ioBadge}
Date: {signDate} | Signature: ___

📌 References: BNSS 2023 u/s 161 | Bombay Police Manual
`;

// Helper: get form template by type
export const getFormTemplate = (formType) => {
  const templates = {
    "IIF-1": IIF_1_TEMPLATE,
    "IIF-2": IIF_2_TEMPLATE,
    "IIF-3": IIF_3_TEMPLATE,
    "IIF-4": IIF_4_TEMPLATE,
    "IIF-5": IIF_5_TEMPLATE,
    "PANCHNAMA": PANCHNAMA_TEMPLATE,
  };
  return templates[formType.toUpperCase()] || null;
};
