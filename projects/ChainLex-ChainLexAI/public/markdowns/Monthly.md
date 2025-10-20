# **RWA Project Monthly Report**

### _ChainLex RWA Compliance & Operations Summary_

**Reporting Period:** 1 – 31 October 2025
**Prepared by:** ChainLex Compliance & Risk Division
**Date of Report:** 5 November 2025

---

## **1. Executive Summary**

October 2025 saw steady growth in tokenized asset onboarding and continued alignment with Hong Kong’s _Securities and Futures Ordinance_ (Cap. 571) and _Anti-Money Laundering and Counter-Terrorist Financing Ordinance_ (Cap. 615).
Operational risk remained moderate; no material breaches or enforcement actions occurred. Two suspicious-transaction reports (SARs) were filed with JFIU for proactive compliance, both linked to off-chain outflows to high-risk jurisdictions.

---

## **2. Platform Overview**

| Metric                        | September 2025 | October 2025 | Δ (%)   |
| ----------------------------- | -------------- | ------------ | ------- |
| Active tokenized assets (RWA) | 38             | 45           | +18%    |
| Total value locked (TVL, HKD) | 112 million    | 127 million  | +13%    |
| Active verified investors     | 216            | 241          | +11.6%  |
| On-chain transactions         | 4,862          | 5,137        | +5.6%   |
| Off-chain settlements (fiat)  | 143            | 157          | +9.8%   |
| SARs / STRs filed             | 1              | 2            | —       |
| System uptime                 | 99.91 %        | 99.94 %      | +0.03 % |

---

## **3. Asset Composition (as of 31 Oct 2025)**

| Asset Class                         | Token Symbol | Jurisdiction       | Market Value (HKD million) | Share % |
| ----------------------------------- | ------------ | ------------------ | -------------------------- | ------- |
| Commercial Real Estate Notes        | CRE-01       | HK / SG            | 42.0                       | 33.1 %  |
| Infrastructure Debt (Green Bond)    | INF-02       | HK                 | 28.5                       | 22.4 %  |
| SME Invoice Pool                    | SME-03       | SG                 | 21.0                       | 16.5 %  |
| Tokenized Treasury Bills            | T-Bills      | US / HK            | 25.5                       | 20.1 %  |
| Other (Private Credit / Art-backed) | VAR-04       | Multi-jurisdiction | 10.0                       | 7.9 %   |

**Total:** 127 million HKD

---

## **4. Compliance & Risk Monitoring**

### 4.1 KYC / AML

- 98.3 % of active investors passed full KYC verification.
- 4 accounts under enhanced due diligence (EDD) for source-of-funds clarification.
- 2 SARs filed (high-risk jurisdiction & sanctioned entity cases).
- No breaches of Travel-Rule compliance for VA transfers.

### 4.2 Sanctions & Screening

- Daily batch screening against OFAC, UN, EU, HKMA lists via ChainLex Xcompl.
- Zero matches among active corporate counterparties.
- One alert (false positive) involving similar-name entity cleared within 24 hours.

### 4.3 Transaction Monitoring Highlights

- AI-driven anomaly detection triggered 37 alerts (vs 45 in Sept, −17.8 %).
- Primary anomaly patterns: transaction velocity > 3σ baseline (62 %), geographic risk flag (27 %), wallet clustering (11 %).
- Average alert closure time: 5.4 hours.

### 4.4 Regulatory Reporting

- 2 SARs submitted to JFIU.
- Quarterly compliance self-assessment filed to SFC Virtual Asset Division.
- No external inspection or inquiry received during period.

---

## **5. Technical & Operational Metrics**

| Parameter                     | Result                                               | Note                         |
| ----------------------------- | ---------------------------------------------------- | ---------------------------- |
| Smart-contract audit status   | Passed (Quantstamp v2.3)                             | No critical vulnerabilities  |
| Chain reliability             | 99.94 % uptime (Ethereum + Polygon)                  | Routine maintenance < 30 min |
| Custody coverage              | 100 % of RWA tokens insured under licensed custodian | Policy renewed Oct 2025      |
| System incidents              | 0 security breaches / 1 minor latency event          | Resolved within 1 hour       |
| AI compliance engine accuracy | Precision 96.7 % / Recall 94.8 %                     | Benchmark vs manual audit    |

---

## **6. Financial Overview**

| Item                              | Amount (HKD)      | Notes                  |
| --------------------------------- | ----------------- | ---------------------- |
| Platform revenue (fees + spreads) | 3.21 million      | +9 % MoM               |
| Operating expenses                | 2.04 million      | Flat QoQ               |
| Net operating income              | 1.17 million      | +24 % QoQ              |
| R&D expenditure                   | 0.46 million      | AI model optimization  |
| Compliance cost ratio             | 11.8 % of revenue | within target (< 15 %) |

---

## **7. Strategic Developments**

- Integrated **AIWENFA Agent Layer v1.2**, enabling explainable risk classification and automatic SAR drafting.
- Initiated pilot with **HashKey Exchange** for compliant secondary listing of tokenized debt.
- Engaged external counsel on cross-jurisdictional RWA licensing (HK ↔ SG).
- Began feasibility assessment for ZK-based proof-of-ownership attestation module (Layer 3 upgrade target Q1 2026).

---

## **8. Outlook for November 2025**

- Target TVL growth > 10 %.
- Finalize integration with SFC e-Compliance API sandbox.
- Conduct semi-annual external AML audit (Nov 2025).
- Publish first tokenization impact white paper with industry partners.

---

## **9. Attachments**

1. Monthly Transaction Dataset (`TXN_202510.csv`)
2. AI Risk Model Summary Report (`Xcompl_Metrics_202510.pdf`)
3. SAR Filing Receipts (`JFIU_ACK_20251019_&_20251026.pdf`)
4. Custody Reconciliation Statement (`Custodian_HKTrust_Oct25.pdf`)
5. Audit Certificate (`Quantstamp_Audit_Oct2025.pdf`)

---

## **10. Compliance Certification**

> I hereby certify that this monthly report is accurate and complete to the best of my knowledge and prepared in accordance with the Anti-Money Laundering and Counter-Terrorist Financing Ordinance (Cap. 615), the Securities and Futures Ordinance (Cap. 571), and ChainLex’s internal compliance manual.

**Authorized Officer:** Ada Chen
**Title:** Compliance Manager
**Date:** 5 November 2025
**Signature:** ************\_\_************
