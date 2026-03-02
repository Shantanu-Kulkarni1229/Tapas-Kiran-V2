TAPAS KIRAN — RAG KNOWLEDGE BASE
==================================

This folder contains the documents used to train the 
Tapas Kiran AI Agent's Retrieval-Augmented Generation (RAG) system.

WHAT TO ADD HERE
-----------------
Place any of these documents in this folder (PDF, DOCX, or TXT format):

PRIORITY 1 — Core Laws (BNS/BNSS/BSA 2023):
  - Bharatiya Nyaya Sanhita (BNS) 2023
  - Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023
  - Bharatiya Sakshya Adhiniyam (BSA) 2023

PRIORITY 2 — Maharashtra Police Manuals:
  - Bombay Police Manual (Volume I, II, III)
  - Maharashtra Police Standing Orders
  - Crime Manual
  - Traffic Manual

PRIORITY 3 — Special Laws:
  - NDPS Act 1985
  - POCSO Act 2012
  - IT Act 2000
  - Prevention of Corruption Act

PRIORITY 4 — IIF Forms & Templates:
  - IIF-1 (FIR) official format
  - IIF-2 (Crime Details) official format
  - IIF-3 (Property Seizure) official format
  - IIF-4 (Arrest) official format
  - IIF-5 (Chargesheet) official format

PRIORITY 5 — Judgments & Circulars:
  - Bombay High Court judgments
  - Supreme Court judgments (police related)
  - Maharashtra Government Circulars/GRs

UPLOAD VIA API
--------------
Admins can also upload documents at runtime via:
  POST /api/ai/documents/upload
  (Admin auth required)

REINDEX
-------
After adding files manually, call:
  POST /api/ai/documents/reindex
  (Admin auth required)

NOTE: All documents are processed into an in-memory vector store
using OpenAI text-embedding-3-small embeddings. The store is 
rebuilt on every server restart from this folder.
