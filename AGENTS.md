# Architecture rules

- Evaluation PDFs are generated only in the export-evaluation-pdf edge function using caller-authorized RPC data; client score previews are provisional and server scores remain authoritative.
- Evaluation archives use RPC-derived audience variants and authenticated encryption bound to the storage path; organization-level storage access must not reveal confidential feedback.
- Keep the uploaded function's explicit JWT gateway verification enabled and additionally validate the caller in code; RPCs remain the sole source of evaluation permissions.
- Evaluation UI uses feature components and RPC hooks for workflow and evaluation reads; score upserts, profile/reference reads and the export journal use authorized tables, while cabinet settings use transactional RPCs to preserve the server-controlled circuit.