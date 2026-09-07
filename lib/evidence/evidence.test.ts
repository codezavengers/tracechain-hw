import { describe, it, expect } from "vitest"
import { createEvidenceRecord, verifyEvidenceRecord, GENESIS_HASH } from "./evidence"

describe("evidence integrity verification", () => {
  const base = {
    caseId: "TC-2026-1001",
    type: "MANUAL_EVIDENCE",
    title: "KYC request acknowledgement",
    summary: "Exchange acknowledged the KYC request.",
    content: { ticket: "EX-4821", status: "acknowledged" },
    createdBy: "Lead Investigator",
    prevHash: GENESIS_HASH,
    provenance: "KNOWN_ATTRIBUTION" as const,
  }

  it("VERIFIED when recomputed hash matches the stored hash", async () => {
    const record = await createEvidenceRecord(base)
    const result = await verifyEvidenceRecord(record, base.content, true)
    expect(result.status).toBe("VERIFIED")
    expect(result.recomputedHash).toBe(record.contentHash)
  })

  it("INTEGRITY_MISMATCH when the original content was altered", async () => {
    const record = await createEvidenceRecord(base)
    const tampered = { ...base.content, status: "rejected" }
    const result = await verifyEvidenceRecord(record, tampered, true)
    expect(result.status).toBe("INTEGRITY_MISMATCH")
    expect(result.recomputedHash).not.toBe(record.contentHash)
  })

  it("CONTENT_UNAVAILABLE when the original content is not retained", async () => {
    const record = await createEvidenceRecord(base)
    const result = await verifyEvidenceRecord(record, undefined, false)
    expect(result.status).toBe("CONTENT_UNAVAILABLE")
    expect(result.recomputedHash).toBeNull()
  })

  it("filename participates in the hash and preserves verifiability", async () => {
    const withFile = await createEvidenceRecord({ ...base, filename: "report.pdf" })
    expect(withFile.filename).toBe("report.pdf")
    const ok = await verifyEvidenceRecord(withFile, base.content, true)
    expect(ok.status).toBe("VERIFIED")
  })
})
