**Suspicious Activity Report (SAR)**

**Subject:** Off-chain Outflow to Sanctioned Entity (OFAC/UN SDN-Listed Counterparty) — RWA Token Redemption

**Reporting Institution:**
ChainLex Compliance Services Limited
SFC Licence No.: CLX-TYPE1/9 (example)
Compliance Contact: Ada Chen, Compliance Manager
Email: [compliance@chainlex.io](mailto:compliance@chainlex.io) | Phone: +852 2211 8899

**Internal Case Ref.:** CLX-SAR-20251028-014
**Date of Report:** 28 October 2025

---

## 1. Executive Summary

On 24–26 October 2025, customer **Mr. Zhang Wei** redeemed tokenized RWA bonds (HKRWA-Bond) on our platform for HKD 850,000. Tracing shows proceeds were converted to fiat and wired off-chain within 6 hours to **Bank Account A at Bank B (Country Y)**, the ultimate beneficiary of which is **Company S**, an entity appearing on public sanctions lists (OFAC SDN entry **SDN-012345**) and subject to international restrictions. Blockchain tracing and bank wire evidence indicate coordinated layering and rapid cross-border movement consistent with attempts to evade sanctions and obscure beneficial ownership. Based on reasonable grounds to suspect proceeds are linked to wrongdoing and sanctions evasion, we submit this SAR.

---

## 2. Reporting Entity Details

- **Name:** ChainLex Compliance Services Limited
- **Address:** 12/F, Example Tower, Hong Kong
- **License/Regulatory:** SFC licensed (Type 1 & 9) & registered VASP (where applicable)
- **Primary Contact:** Ada Chen (Compliance Manager) — [compliance@chainlex.io](mailto:compliance@chainlex.io) — +852 2211 8899

---

## 3. Subject / Customer Details

- **Name:** Zhang Wei
- **Customer ID:** CLX-CUST-20250921-078
- **Customer Type:** Individual — Retail investor
- **Nationality / Domicile:** PRC (resident Hong Kong contact)
- **KYC Status:** Onboarded 21 Sep 2025 — Basic KYC completed; Source-of-funds documents incomplete (no verifiable corporate invoices or third-party bank statements for the deposit)
- **Associated On-chain Wallet(s):** `0x9e4a...f2B1`
- **Associated Off-chain Bank Account (receiving of proceeds):** Bank B — Account A — Beneficiary: Company S (offshore)

---

## 4. Transaction / Activity Details

- **Asset / Product:** HKRWA-Bond (tokenized corporate bond, HKD-denominated)
- **Purchase Date:** 24 Oct 2025 — Purchase value HKD 850,000 (funded from Customer’s Bank A account via on-platform fiat settlement).
- **Redemption / Withdrawal Date:** 26 Oct 2025 — Customer requested and executed full redemption to external on-chain wallet `0x9e4a...f2B1`.
- **On-chain Movement:** 26 Oct 2025, 10:33 HKT — `0x9e4a...f2B1` transferred equivalent stablecoin to an off-ramp aggregator. Tx Hash: `0xabc123...def`.
- **Off-chain Wire:** 26 Oct 2025, 16:20 HKT — Off-ramp aggregator executed SWIFT MT103 showing funds wired to **Bank B (Country Y)**, Account A, Beneficiary **Company S**. Reference: SWIFT 20251026/CLX/00123.
- **Amount:** HKD 850,000 (equivalent USD 108,900 approx).
- **Timing Pattern:** Rapid conversion and same-day settlement (redemption → on-chain → off-ramp → wire to sanctioned beneficiary within ~6 hours).
- **Remark:** On-chain flow includes short-lived intermediary addresses and immediate off-ramp, consistent with layering.

---

## 5. Grounds for Suspicion / Red Flags

1. **Receiving beneficiary (Company S) appears on sanctions lists** (publicly available sanctions designations). The beneficiary’s corporate structure and beneficial owner are opaque.
2. **Rapid on-chain to off-chain conversion** — proceeds routed through an off-ramp aggregator immediately after withdrawal to avoid on-chain holding and to obscure origin.
3. **Structuring / layering behaviour** — transaction used short-lived intermediary addresses and a single consolidated wire to a sanctioned beneficiary (pattern consistent with deliberate obfuscation).
4. **Insufficient source-of-funds documentation** — customer failed to provide verifiable third-party bank statements or commercial contracts to justify the high-value purchase.
5. **Mismatch between declared purpose and flow** — customer declared “personal investment”, yet funds routed to a corporate beneficiary on a sanctions list.
6. **Adverse intelligence linkage** — blockchain intelligence provider flagged `0x9e4a...f2B1` as transacting with addresses previously associated with sanctioned networks.
7. **Customer response** — compliance outreach on 26 Oct (email and phone) received evasive or no substantive documentation.

Because the beneficiary is sanctions-designated, the transaction raises immediate concerns of **sanctions evasion** and **money laundering**, and there are reasonable grounds to suspect the funds represent proceeds of unlawful activity or are intended to violate sanctions restrictions.

---

## 6. Supporting Evidence (attached/indexed)

- Platform trade record: `CLX_PURCHASE_20251024_078.pdf` (purchase confirmation, timestamps).
- On-chain transaction trace and graph: `ChainTrace_0x9e4a.pdf` (showing intermediary addresses and flow).
- Off-ramp SWIFT MT103 and bank wire screenshot: `SWIFT_20251026_MT103.png`.
- Customer KYC file: `KYC_ZHANGWEI_20250921.pdf` (copy of passport, address proof) — incomplete source-of-funds evidence.
- AML risk engine alert: `Xcompl_Alert_CLX-SAR-20251028-014.pdf` (E-AML score 92/100).
- Compliance communication log: `CLX_COMMS_20251026_20251027.pdf` (emails / call notes).

---

## 7. Internal Measures Taken

- **26 Oct 2025 (11:00 HKT):** Automated AML system flagged the redemption (E-AML score 92) and escalated to manual review.
- **26 Oct 2025 (12:10 HKT):** Manual review confirmed suspicious pattern; compliance attempted immediate outreach to customer for source documentation.
- **26 Oct 2025 (15:20 HKT):** Off-ramp provider confirmed wire executed to beneficiary Company S (Bank B, Country Y).
- **26 Oct 2025 (17:45 HKT):** Account activity limited per internal policy (suspend further withdrawals); monitored for further outbound flows.
- **28 Oct 2025:** Decision to file SAR with JFIU and notify relevant supervisory contact internally. No funds recall feasible after off-chain wire settlement; request for law enforcement assistance recommended.

---

## 8. Legal / Regulatory Basis

- **Hong Kong:** Under the Anti-Money Laundering and Counter-Terrorist Financing Ordinance (Cap. 615), reporting entities must file a Suspicious Transaction Report (STR/SAR) with JFIU where they know or have reasonable grounds to suspect that property is criminal property or related to terrorist financing; failure to report may attract criminal sanctions.
- **Sanctions Compliance:** Transactions involving sanctioned persons/entities (e.g., OFAC SDN, UN listings, or other national sanctions lists) may violate sanctions laws and create additional obligations for freezing and reporting to law enforcement/regulators.
- **Internal Policy & Industry Practice:** ChainLex follows a “know your counterparty, blocklist screening and enhanced due diligence” regime for high-risk flows, including immediate escalation and SAR filing where required.

---

## 9. Requested Action / Assistance

- We request JFIU and relevant enforcement agencies to review the attached evidence and consider investigative measures to:

  1. Confirm beneficiary Company S’s identity and ownership;
  2. Assess whether the wire to Bank B constitutes sanctions evasion or money laundering;
  3. Determine whether an account freeze, recall or other enforcement step is possible through local or international cooperation.

---

## 10. Declaration

I declare that, to the best of my knowledge and belief, the information in this report is true, complete and submitted in good faith under the reporting obligations applicable to ChainLex.

**Authorized Officer:** Ada Chen
**Title:** Compliance Manager
**Signature:** ************\_\_************
**Date:** 28 October 2025

---

## 11. Submission / Filing Details

- **Method:** e-STR via goAML (or JFIU designated e-STR portal) and secure email copy to internal regulatory affairs.
- **Attachments:** See Supporting Evidence list (Appendix).
- **Retention:** Full case file retained per Cap. 615 record-keeping obligations.
