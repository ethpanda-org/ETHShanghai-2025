# CrediNet: Dezentrales Kreditnetzwerk

> **Whitepaper (German Version)**

## Executive Summary

Beim Übergang in die nächste Evolution des Internets – Web3 und Metaverse – fehlen vertrauenswürdige, kombinierbare und nutzersouveräne digitale Identitäten sowie Kreditdaten. Dieses fundamentale Defizit bremst Web3.0; kredit-, versicherungs-, eigentums- oder gesellschaftsorientierte Anwendungen, die auf „Menschen“ basieren, können auf Blockchains wie Ethereum nicht flächendeckend stattfinden. Bestehende Kreditsysteme sind isoliert, undurchsichtig und zentralisiert – sie erfüllen nicht die Anforderungen einer offenen digitalen Gesellschaft.

CrediNet ist ein auf Blockchain basierendes dezentrales Kreditprotokoll, das Nutzern eigenständige, selbstverwaltete und ertragsbringende Kreditdatendienste bietet. Mit dem innovativen „Kreditspektrum“ werden On- und Off-Chain-Verhalten in dynamische, visuelle SBTs (Soulbound Tokens) übersetzt, die biometrische Merkmale, Fähigkeiten, Vermögen, Gesundheit und Verhalten lebensbegleitend speichern.

CrediNet soll zur kritischen Infrastruktur für die dezentrale Gesellschaft (DeSoc) und das Metaverse werden.

## Kerninnovationen

1. **Blockchain-basierter Datenschutz** und Nutzerdatenherrschaft
2. **Kreditspektrum**: Fünf-Dimensionen-Modell (Fundament, Ability, Fortune, Health, Behavior) zur wissenschaftlichen Quantifizierung menschlicher Kreditwürdigkeit
3. **Dynamische SBT-Medaillons**: Visualisierbare, wachsende, interaktive Kunstwerke als Kreditporträt
4. **Rückführung des Datenwerts**: Nutzer erhalten Token für valide Daten und laufende Passiverträge durch Datenlizenzierung

---

## I. Zersplittertes Kreditökosystem

- **Zentralisierte Kontrolle**: Datenmonopole, Nutzer haben keine Verfügungsgewalt
- **Dateninseln**: Identitäts-, Finanz-, Gesundheits-, Bildungsdaten sind voneinander isoliert
- **Fehlende Interoperabilität**: Web2-Scores lassen sich nicht in Web3 übertragen
- **Schlechte UX**: wiederholte KYC, Privatsphäre geht verloren
- **Fehlende Anreize**: Nutzer erhalten nichts für ihre Daten

---

## II. CrediNet-Lösungsüberblick

- **Souveränität**: Nutzer sind Eigentümer ihrer Daten und erzielen daraus Erträge
- **Multidimensionales Modell**: Fünf gewichtete Dimensionen ergeben den C-Score
- **Verifizierbare Ausweise**: Zero-Knowledge-Beweise sichern Datenechtheit; nur Hashes liegen On-Chain
- **Wirtschaftliche Anreize**: CRN-Token für Datenbeiträge; automatisierte Ertragsverteilung via Smart Contracts
- **Visualisierung**: Abstrakte Daten werden zu dynamischen, personalisierbaren SBT-Medaillons
- **Passivertrag**: Datenlizenzierung generiert laufende Einnahmen

---

## III. Kreditspektrum – multidimensionales, dynamisches Kreditmodell

C-Score = gewichtete Summe der fünf Dimensionen :

| **Dimension** | **Kürzel** | **Gewicht** | **Kernindikatoren**                                            |
| ------------------- | ----------------- | ----------------- | -------------------------------------------------------------------- |
| Fundament           | K                 | 25 %              | Identitäts- & Biometrie-Validierung, offizielle Dokumente           |
| Ability             | A                 | 30 %              | Bildungszertifikate, Skill-NFTs, Code-Commits, Deployments           |
| Fortune             | F                 | 20 %              | Asset-Diversität, Kredithistorie, Ertragsstabilität                |
| Health              | H                 | 15 %              | Check-up-Berichte, Vitaldaten-Trends, Datenkontinuität              |
| Behavior            | B                 | 10 %              | Compliance, Vertrags- bzw. Governance-Teilnahme, Community-Beiträge |

Dynamische SBTs visualisieren jeden Score als einzigartiges, nicht übertragbares On-Chain-Kunstwerk.

---

## IV. Technische Architektur (Schichtenmodell)

### Architektur-Ebenen

1. W3C-konforme DID-Erstellung
2. Client verschlüsselt & hasht Nutzerdaten → Verifizierbare Ausweise (VC)
3. Nur VC-Hashes landen auf Ethereum; Rohdaten bleiben beim Nutzer
4. Scoring-Engine aktualisiert C-Score & Spektrum
5. Medaillons-Contract rendert neues SBT-Design
6. Drittanwendungen fragen – nach Autorisierung – Score oder einzelne Claims ab

### Daten-Workflow

```
Nutzerdaten → Client (Verschlüsselung/Hash) → Upload-Log → Hash 
→ Ethereum-Attest → Score-Update → SBT-Refresh → Datenmarkt
```

---

## V. Anwendungsszenarien

1. **DeFi**: Undercollateralized Loans, risikoadjustierte Prämien
2. **HR & Recruiting**: Vertrauenswürdige On-Chain-Lebensläufe
3. **Metaverse & Gaming**: Kreditbasierte Sozial- und Wirtschaftserlebnisse
4. **Versicherung & Gesundheit**: Personalisierte Tarife
5. **DAO-Governance**: Sybil-Resistenz & Beitragsquantifizierung
6. **Cross-Border & Compliance**: Portables digitales Ident-Set
7. **On-Chain-Awards**: Leistungs-NFTs direkt im SBT verankert

---

## VI. CRN-Token-Ökonomie

### Tokenverteilung (max. Supply fix)

| Kategorie | Anteil | Details |
|-----------|--------|---------|
| **Datenbeiträger** | 50% | Dimensionsgewichtet |
| **Ecosystem/Team** | 20% | 4-Jahres-Linear |
| **Strategische Reserve** | 15% | DAO-Treasury |
| **Investoren** | 10% | 18-Monats-Lock-up, dann linear |
| **Community & Airdrop** | 5% | Initial Bootstrap |

### Einnahmenverteilung

- **90%** der Datenabfragegebühren fließen an Datenlieferanten
- **10%** in die DAO-Kasse

---

## VII. Ökosystem & Partnerschaften

### Gesucht

- **Datenanbieter**: Personen, DAOs, Unternehmen
- **Datenabnehmer**: DeFi-Protokolle, HR-Plattformen, Metaverse-Projekte, Versicherer, Pharma
- **Infrastrukturpartner**: Wallets, Oracles, dezentrale Speicher, Identitätsprotokolle
- **DAOs und Communitys**: für Governance, Modell-Updates, Ertragsverteilung

---

## VIII. Wettbewerbsvorteile

CrediNet positioniert sich als Middleware zwischen Datenquellen und Drittanwendungen und etabliert einen „Eigen-, Selbst-, Genuss-"-Datenmarkt – bisher in Web3 einzigartig.

---

## IX. Roadmap

### Phase 1 – Foundation (Q4 2025 – Q1 2026)

#### Technische Integration

- Vervollständigen Sie die Integration von World ID und self.xyz: Implementieren Sie die Funktion „Sign in with Worldcoin/self.xyz" in der CrediNet dApp, um den Verifizierungs- und Benutzerbindungsprozess des Zero-Knowledge-Proofs abzuschließen
- Entwickeln Sie einen Off-Chain-Indexer: Erstellen Sie einen grundlegenden Dienst, der das Verhalten von Benutzerbindungsadressen in den Hauptnetzketten von World Chain und Ethereum erfassen und auflösen kann
- Bereitstellen Sie Kern-Smart Contracts: Bereitstellen Sie den Soulbound Token (SBT) Medaillenvertrag und den CRN-Token-Vertrag im Ethereum Mainnet

#### Kreditmodell V1

1. Entwerfen und implementieren Sie ein anfängliches On-Chain-Kreditmodell: Erstellen Sie zunächst Fähigkeits-/Vermögens-/Verhaltensdimensionskredite (Vermögenswerte/Transaktionsverhalten/Liquiditätsbereitstellung/Mining/Knotenbereitstellung/Teilnahme an DeFi-Protokollen/Zahlungsverhalten/Community- und Governance-Verhalten/Entwicklungs- und Fähigkeitsverhalten/Kredit- und Reputationsverhalten/historische Ausfallaufzeichnungen/Metaverse-Verhalten/On-Chain-Identitätsauthentifizierung oder besondere Errungenschaften)
2. Generieren Sie dynamische Medaillenprototypen: Entwickeln Sie Algorithmen, die dynamisch SBT-Medaillen mit unterschiedlichem Erscheinungsbild generieren können

#### Community und Start-up

- Start des ersten Community-Programms: für frühe Unterstützer und Entwicklergemeinschaften
- Veröffentlichen Sie detaillierte technische Dokumente und Integrationsrichtlinien, um die ersten Öko-Partner anzuziehen

### Phase 2 – Expansion (Q2-Q4 2026)

**Ziel**: Erweitern Sie die Benutzerbasis, bereichern Sie die Kreditdimension und starten Sie den Kernwirtschaftszyklus.

#### Kernaufgaben

**1. Kreditmodell V2 und Datenanreicherung**

- Einführung des Portals „verifizierbare Zertifikate": Ermöglicht es Benutzern, die Plattform unabhängig auszuwählen und den Kredit in den Dimensionen Eckpfeiler/Reichtum/Fähigkeit/Verhalten/Gesundheit zu bereichern
- Optimieren Sie Kreditalgorithmen: Führen Sie maschinelle Lernmodelle ein, um die Qualität und das Risiko des On-Chain-Verhaltens genauer zu bewerten

**2. Ökologische Zusammenarbeit und Integration**

- Erreichen der ersten Gruppe strategischer Partner: Erreichen einer Zusammenarbeit mit 1–2 führenden DeFi-Protokollen und 1 bekannten DAO als erste Anwendungsszenarien für CrediNet-Kredite (z. B. Bereitstellung von Kreditzinsnachlässen oder gewichtete Abstimmung basierend auf Kreditpunkten)
- Veröffentlichungspartner-API: Ermöglicht es Drittanbieterprojekten, die Kreditwürdigkeit eines Benutzers einfach abzufragen (nach Benutzerautorisierung)
- Starten Sie die erste Auswahlveranstaltung „On-Chain Credit Annual Award" und richten Sie Auszeichnungen wie „Best Innovation", „Outstanding Construction", „Community Contribution" und „Best Application" ein, um herausragende Web3.0-Praktiker zu belohnen und ihre Errungenschaften zu präsentieren In der SBT-Medaille des Gewinners in Form eines speziellen NFTs eingraviert

**3. Start der Token-Ökonomie**

- Start des CRN-Token-Airdrops: Basierend auf den frühen On-Chain-Beiträgen der Benutzer und der Community-Beteiligung wird CRN an die erste Gruppe von Benutzern Airdrop gegeben, um Netzwerkeffekte zu stimulieren
- Initiieren Sie die Einkommensverteilung der Datennutzung: Implementieren Sie intelligente Verträge, die automatisch 90% der Datenabfragegebühren von Drittanbietern an datenbeitragende Benutzer zuweisen

### Phase 3 – Prosperity (2027)

**Ziel**: Eine ausgereifte Kreditinfrastruktur zu werden, vollständig auf eine dezentrale Governance umzusteigen und die Offline-Datenfusion zu erforschen.

#### Kernaufgaben

**1. Kreditmodell V3 und dezentrale Governance**

- Vollständiger Übergang zur Community-Governance: Richten Sie CrediNet DAO ein und verwenden Sie CRN-Token, um über wichtige Entscheidungen wie die Gewichtungsanpassung des Kreditmodells und die Verwendung von Schatzgeldern abzustimmen
- Führen Sie chainübergreifende Kredite ein: Indizieren und integrieren Sie das Benutzerverhalten in anderen Mainstream-L1, um eine Panorama-Kreditansicht zu erstellen

**2. Die Explosion von Anwendungsszenarien**

- Tief in traditionelle Bereiche vorgedrungen: Zusammenarbeit mit Versicherungs- und Rekrutierungsplattformen, um innovative Produkte auf der Grundlage von On-Chain-Krediten zu erkunden
- Werden Sie zum „Pass" des Metaversums

**3. Datenschutz- und Compliance-Innovation**

- Tiefe Integration Zero-Knowledge-Beweis: Entwickeln Sie eine Technologie, mit der Benutzer nachweisen können, dass ihre Kreditwürdigkeit einen bestimmten Schwellenwert erreicht, ohne Rohdaten offenzulegen, um ultimative Privatsphäre zu erreichen
- Erkunden Sie den rechtlichen Rahmen für Compliance: Bieten Sie Benutzern mehr Kanäle für traditionelle Off-Chain-Kredite, die nach der Überprüfung durch offizielle Institutionen in den gesetzlich zulässigen Bereichen in die Kette geladen werden können

### Phase 4 – Symbiosis (2028)

Ökologischer Aufbau und Krediterweiterung, Einführung von Datenkäufern von Drittanbietern (z. B. Versicherungen, Rekrutierungsplattformen), Einführung des Datenmarktes V1, Optimierung von Kreditalgorithmen, Rechtsinformationen und dynamischer Datenerweiterung.

### Phase 5 – Horizon (2029+)

Metaverse und tiefe Integration, tiefe Integration mit der Metaverse-Plattform, DAO-Tools und DeFi-Protokollen, Entwicklung kreditbasierter sozialer und finanzieller Anwendungsszenarien, dynamischer automatischer Datenaktualisierung und Echtzeit-Kreditbewertung. Passive Dateneinnahmen sind zu einem wichtigen Teil der UBI-Einnahmen im Metaverse geworden.

---

## X. Team

Wird zu einem späteren Zeitpunkt bekannt gegeben.

---

## XI. Risikofaktoren

- **Risiken von Smart Contracts**: Kernverträge wurden von mehreren führenden Wirtschaftsprüfungsgesellschaften geprüft, aber es gibt immer noch mögliche Schlupflöcher
- **Regulatorische Unsicherheit**: Die globale regulatorische Richtlinie zu DeFi, Datenschutz und digitalen Vermögenswerten entwickelt sich immer noch und kann Auswirkungen auf Projekte haben
- **Adoptionsrate Risiko**: Der Erfolg eines Projekts hängt vom Aufbau des Ökosystems und der Akzeptanz durch Nutzer und Partner ab
- **Modellrisiko**: Kredit-Scoring-Algorithmen können unentdeckte Vorurteile aufweisen und müssen durch Community-Governance kontinuierlich optimiert werden
- **Verwaltung privater Schlüssel**: Benutzer müssen den privaten Schlüssel ordnungsgemäß aufbewahren, da der Verlust dazu führt, dass das Kreditvermögen nicht wiederhergestellt werden kann

---

## XII. Haftungsausschluss

Dieses Dokument stellt weder ein Angebot noch eine Aufforderung zum Kauf von Wertpapieren oder Investitionsprodukten dar. Es dient ausschließlich Informationszwecken und ist keine Anlage-, Rechts- oder Steuerberatung. Das Projekt unterliegt erheblichen technologischen, wirtschaftlichen und regulatorischen Risiken; ein Erreichen der Ziele ist nicht garantiert. Jede Teilnehmerin und jeder Teilnehmer muss eigene Recherchen betreiben und trägt sämtliche Risiken selbst.
