// Fixed form templates (ported from v1's text templates). The layout never changes:
// officers fill the fields, and the LLM may only draft the one free-text "narrative" field.
// A field is [key, label] or [key, label, "long"] for a multi-line box.
// ponytail: field lists are a faithful but condensed port of the v1 IIF forms (checkbox groups
// become plain text fields). Compare with the official printed forms before real use.

const OFFICER = [["ioName", "IO name"], ["ioRank", "Rank (हुद्दा)"], ["ioBadge", "Badge No."]];
const PANCHAS = [["panch1Name", "Panch 1 name (पंच १)"], ["panch1Address", "Panch 1 address"], ["panch2Name", "Panch 2 name (पंच २)"], ["panch2Address", "Panch 2 address"]];
const HEADER = [["district", "District (जिल्हा)"], ["policeStation", "Police Station (पोलीस ठाणे)"], ["year", "Year (वर्ष)"], ["firNo", "FIR No. (गुन्हा क्र.)"], ["date", "Date (दिनांक)"]];

export const TEMPLATES = {
  "IIF-1": {
    title: "I.I.F.-1 – First Information Report (FIR) / प्रथम तक्रार अहवाल",
    narrative: { key: "firContent", label: "First information contents (प्रथम तक्रारीचा मजकूर)" },
    sections: [
      { title: "General", fields: [...HEADER, ["firDateTime", "Date & time of FIR"], ["act", "Act"], ["sections", "Sections (कलमे)"]] },
      { title: "Occurrence", fields: [["day", "Day"], ["dateFrom", "Date from"], ["dateTo", "Date to"], ["timeFrom", "Time from"], ["timeTo", "Time to"], ["infoDate", "Information received: date"], ["infoTime", "Information received: time"], ["gdEntryNo", "GD entry no."], ["infoType", "Type of information"]] },
      { title: "Place of occurrence", fields: [["directionDistance", "Direction & distance from P.S."], ["beatNo", "Beat no."], ["occurrenceAddress", "Address (घटनास्थळ)"]] },
      { title: "Complainant", fields: [["complainantName", "Name (नाव)"], ["complainantFatherName", "Father's/Husband's name"], ["complainantDOB", "DOB / year"], ["complainantNationality", "Nationality"], ["complainantUID", "UID no."], ["complainantAddress", "Address"], ["complainantOccupation", "Occupation"], ["complainantPhone", "Phone"]] },
      { title: "Accused", fields: [["accusedName", "Name / alias"], ["accusedRelativeName", "Relative's name"], ["accusedAddress", "Address"], ["delayReason", "Reason for delay in reporting"]] },
      { title: "Property", fields: [["propertyCategory", "Category"], ["propertyType", "Type"], ["propertyDescription", "Description"], ["propertyValue", "Value (Rs.)"], ["totalPropertyValue", "Total value (Rs.)"], ["inquestNo", "Inquest report / U.D. case no."]] },
      { title: "Action taken", fields: [["actionTaken", "Action taken (केलेली कारवाई)"], ["signDate", "Date"], ["officerName", "Officer-in-charge"], ["officerRank", "Rank"], ["officerBadge", "Badge No."], ["legalSections", "Applicable BNS/BNSS sections"]] },
    ],
  },
  "IIF-2": {
    title: "I.I.F.-2 – Crime Details Form / गुन्ह्याचे तपशील",
    narrative: { key: "placeDescription", label: "Description of place of occurrence (घटनेच्या ठिकाणाचे वर्णन)" },
    sections: [
      { title: "General", fields: [...HEADER, ["actSection", "Act and section"]] },
      { title: "2-A Crime details", fields: [["witnessName", "Place shown by: name"], ["witnessFather", "Father's name"], ["witnessAddress", "Address"], ["majorHead", "Major head"], ["minorHead", "Minor head"], ["methods", "Methods"], ["conveyances", "Conveyances used"], ["characterAssumed", "Character assumed"], ["language", "Language / slang used"], ["specialFeatures", "Special features"], ["placeType", "Type of place"], ["propertyTypeInvolved", "Type of property involved"]] },
      { title: "2-B Victim", fields: [["victimName", "Full name"], ["victimDOB", "DOB / year"], ["victimSex", "Sex"], ["victimNationality", "Nationality"], ["victimReligion", "Religion"], ["victimSCST", "SC/ST"], ["victimOccupation", "Occupation"], ["victimAddress", "Address"], ["victimInjury", "Injury (grievous/simple)"], ["weapon", "Means / weapon"], ["victimRemarks", "Remarks"]] },
      { title: "2-C Place & evidence", fields: [["motive", "Motive of crime"], ["stolenProperty", "Properties stolen / involved"], ["physicalEvidence", "Physical evidence recovered / seized"], ["panchnamaDateTime", "Date & time of panchnama"], ...PANCHAS, ...OFFICER, ["legalSections", "Applicable sections"]] },
    ],
  },
  "IIF-3": {
    title: "I.I.F.-3 – Property Search & Seizure Form / मालमत्ता शोध व जप्ती (u/s 185 BNSS)",
    narrative: { key: "propertyDescription", label: "Description of seized property (जप्त मालमत्तेचे वर्णन)" },
    sections: [
      { title: "General", fields: [...HEADER, ["actSection", "Act and section"], ["propertyNature", "Nature of property (stolen / suspicious / material evidence ...)"]] },
      { title: "Seizure", fields: [["seizureDate", "Date of seizure"], ["seizureTime", "Time of seizure"], ["seizurePlace", "Place of seizure"], ["seizurePlaceDescription", "Description of place"], ["seizurePurpose", "Purpose of seizure"], ["custodyPurpose", "Purpose of custody"], ["producedInCourt", "To be produced before court"], ["storage", "Storage / preservation"], ["damaged", "Property damaged/destroyed before seizure"]] },
      { title: "Person from whom seized", fields: [["seizedFromName", "Name"], ["seizedFromFather", "Father's/Husband's name"], ["seizedFromSex", "Sex"], ["seizedFromAge", "Age"], ["seizedFromOccupation", "Occupation"], ["seizedFromAddress", "Address"]] },
      { title: "Witnesses", fields: [["witness1Name", "Witness 1 name"], ["witness1Address", "Witness 1 address"], ["witness2Name", "Witness 2 name"], ["witness2Address", "Witness 2 address"]] },
      { title: "Panchas & officer", fields: [...PANCHAS, ["signDate", "Date"], ...OFFICER] },
    ],
  },
  "IIF-4": {
    title: "I.I.F.-4 – Arrest / Court Surrender Form / अटक – न्यायालयात समर्पण",
    narrative: { key: "criminalHistory", label: "Criminal history observations (गुन्हेगारी इतिहास)" },
    sections: [
      { title: "3A Arrest", fields: [...HEADER, ["gdNo", "GD no."], ["accusedCode", "Alphanumeric code of accused"], ["arrestDate", "Date of arrest/surrender"], ["arrestTime", "Time"], ["arrestPlace", "Place"], ["courtName", "Court (if surrendered)"], ["actsSections", "Acts and sections"], ["arrestStatus", "Arrest status"]] },
      { title: "Accused", fields: [["accusedName", "Name"], ["accusedFather", "Father's/Husband's/Guardian's name"], ["alias", "Aliases"], ["nationality", "Nationality"], ["religion", "Religion"], ["caste", "Caste / tribe"], ["occupation", "Occupation"], ["permanentAddress", "Permanent address"], ["presentAddress", "Present address"], ["injuries", "Injuries / physical condition"]] },
      { title: "3B Rights & search", fields: [["rightsDate", "Informed of grounds of arrest: date"], ["rightsTime", "Time"], ["rightsPlace", "Place"], ["articlesFound", "Articles found on search (NIL if none)", "long"]] },
      { title: "Physical features", fields: [["sex", "Sex"], ["dob", "DOB / year"], ["build", "Build"], ["height", "Height (cm)"], ["complexion", "Complexion"], ["idMarks", "Identification marks"], ["deformities", "Deformities"], ["otherFeatures", "Other features (hair, eyes, speech, tattoo ...)", "long"]] },
      { title: "3C Profile", fields: [["fingerprintTaken", "Fingerprints taken"], ["livingStatus", "Living status"], ["education", "Education"], ["incomeGroup", "Income group"], ["otherCases", "Wanted in other cases"]] },
      { title: "Panchas & officer", fields: [...PANCHAS, ["sigPlace", "Place"], ["sigDate", "Date"], ...OFFICER, ["legalSections", "Applicable sections"]] },
    ],
  },
  "IIF-5": {
    title: "I.I.F.-5 – Final Report (Chargesheet) / अंतिम अहवाल (आरोपी पत्र)",
    narrative: { key: "briefFacts", label: "Brief facts of the case (थोडक्यात माहिती)" },
    sections: [
      { title: "General", fields: [...HEADER, ["chargeSheetNo", "Final report / chargesheet no."], ["finalReportDate", "Date of final report"], ["act", "Act"], ["sections", "Sections"], ["reportType", "Type of final report"], ["chargeSheetType", "Original / supplementary"], ["complainantName", "Complainant name"], ["complainantFather", "Father's/Husband's name"], ["propertiesTable", "Properties / articles", "long"]] },
      { title: "Accused", fields: [["accusedName", "Name"], ["accusedFather", "Father's/Husband's name"], ["accusedDOB", "DOB / year"], ["accusedSex", "Sex"], ["accusedNationality", "Nationality"], ["religion", "Religion"], ["occupation", "Occupation"], ["address", "Address"], ["arrestDate", "Date of arrest"], ["bailDate", "Date of release on bail"], ["courtDate", "Date forwarded to court"], ["chargedSections", "Under acts & sections"], ["sureties", "Bailers / sureties"], ["previousConvictions", "Previous convictions"], ["accusedStatus", "Status (custody / absconding / proclaimed offender)"]] },
      { title: "Witnesses & evidence", fields: [["witnessTable", "Witness list (name, age, occupation, address, evidence)", "long"], ["evidenceDetails", "Seized property / evidence", "long"], ["labAnalysis", "Result of laboratory analysis"]] },
      { title: "Officer", fields: [...OFFICER, ["signDate", "Date"], ["legalSections", "Applicable sections"]] },
    ],
  },
  PANCHNAMA: {
    title: "Spot Panchnama / घटनास्थळ पंचनामा (u/s 161 BNSS)",
    narrative: { key: "sceneDescription", label: "Description of scene (घटनास्थळाचे वर्णन)" },
    sections: [
      { title: "General", fields: [...HEADER, ["panchnamaDateTime", "Date & time of panchnama"], ["panchnamaPlace", "Place of panchnama"]] },
      { title: "Panchas", fields: PANCHAS },
      { title: "Observations", fields: [["evidenceObserved", "Evidence observed (आढळलेले पुरावे)", "long"]] },
      { title: "Officer", fields: [...OFFICER, ["signDate", "Date"]] },
    ],
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);
