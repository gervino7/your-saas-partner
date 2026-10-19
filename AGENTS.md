# Architecture rules

- Evaluation PDFs are generated only in the export-evaluation-pdf edge function using caller-authorized RPC data; never recalculate HR scores in the client.
- Evaluation archives use RPC-derived audience variants and authenticated encryption bound to the storage path; organization-level storage access must not reveal confidential feedback.
- Keep the uploaded function's explicit JWT gateway verification enabled and additionally validate the caller in code; RPCs remain the sole source of evaluation permissions.