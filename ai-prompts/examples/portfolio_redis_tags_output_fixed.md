# Portfolio Redis Tags Output - Vollständiges Transformations-Beispiel

## Eingabe-Dokument

**Basis:** Ein realistisches Portfolio-Management-Dokument mit hierarchischer Struktur zur Demonstration der vollständigen Text-zu-Redis-Transformation.

**Input-Eigenschaften:**
- YAML Front Matter: ✅ vollständig
- Hierarchie-Ebenen: 4 Levels (# ## ### + Text)
- Text-Komplexität: Deutsch + Fachbegriffe
- Struktur-Herausforderungen: Gemischte Hierarchie, Listen, Fachsprache

## Erwartete Redis-Tags Output

### Document-Level-Tag
```
{RedisDoc: key=doc:portfolio_management_strategien:001 ; title="Portfolio Management Strategien" ; author="Oskar Schindler" ; created="2024-12-27" ; total_chunks=23 ; category="investment" ; language="de" ; tags=["portfolio", "risikomanagement", "diversifikation", "investment"] ; children=["ch:risikomanagement_grundlagen:001", "ch:praktische_umsetzung:002"]}
```

### Chapter-Level-Tags (# Headers)

#### Chapter 1: Risikomanagement Grundlagen
```
{RedisChunk: key=ch:risikomanagement_grundlagen:001 ; parent=doc:portfolio_management_strategien:001 ; children=["para:risiko_bewertungsmethoden:001", "para:portfoliotheorie_fundamentals:002"] ; text="# Risikomanagement Grundlagen\n\nDiversifikation ist der Grundstein erfolgreicher Investments. Ein ausgewogenes Portfolio reduziert das Gesamtrisiko durch geschickte Verteilung der Investments auf verschiedene Anlageklassen.\n\nModerne Portfoliotheorie nach Markowitz zeigt mathematisch, dass durch optimale Kombination verschiedener Assets das Gesamtrisiko unter das Risiko der einzelnen Komponenten gesenkt werden kann." ; level="chapter" ; position=1 ; title="Risikomanagement Grundlagen" ; chapter_number=1 ; context_document="Portfolio Management Strategien"}
```

#### Chapter 2: Praktische Umsetzung
```
{RedisChunk: key=ch:praktische_umsetzung:002 ; parent=doc:portfolio_management_strategien:001 ; children=["para:asset_allocation_strategien:003"] ; text="# Praktische Umsetzung\n\nDie theoretischen Konzepte der Portfoliotheorie müssen in der Praxis anwendbar sein. Hierbei spielen sowohl quantitative Modelle als auch qualitative Einschätzungen eine wichtige Rolle." ; level="chapter" ; position=10 ; title="Praktische Umsetzung" ; chapter_number=2 ; context_document="Portfolio Management Strategien"}
```

### Paragraph-Level-Tags (## Headers)

#### Risiko-Bewertungsmethoden
```
{RedisChunk: key=para:risiko_bewertungsmethoden:001 ; parent=ch:risikomanagement_grundlagen:001 ; children=["subpara:volatilitaets_messung:001", "subpara:korrelations_analyse:002"] ; text="## Risiko-Bewertungsmethoden\n\nRisiko kann durch verschiedene Metriken gemessen werden. Die wichtigsten Kennzahlen umfassen Volatilität, Value at Risk (VaR) und Korrelationsanalysen zwischen verschiedenen Assets.\n\nJede Methode hat ihre spezifischen Stärken und Anwendungsbereiche." ; level="paragraph" ; position=2 ; title="Risiko-Bewertungsmethoden" ; section_number="1.1" ; sequence_in_parent=1 ; context_chapter="Risikomanagement Grundlagen" ; context_document="Portfolio Management Strategien"}
```

#### Portfoliotheorie Fundamentals
```
{RedisChunk: key=para:portfoliotheorie_fundamentals:002 ; parent=ch:risikomanagement_grundlagen:001 ; children=[] ; text="## Portfoliotheorie Fundamentals\n\nDie moderne Portfoliotheorie bildet das mathematische Fundament für systematisches Risikomanagement. Sie basiert auf der Annahme rationaler Marktteilnehmer und effizienter Märkte." ; level="paragraph" ; position=6 ; title="Portfoliotheorie Fundamentals" ; section_number="1.2" ; sequence_in_parent=2 ; context_chapter="Risikomanagement Grundlagen" ; context_document="Portfolio Management Strategien"}
```

#### Asset Allocation Strategien
```
{RedisChunk: key=para:asset_allocation_strategien:003 ; parent=ch:praktische_umsetzung:002 ; text="## Asset Allocation Strategien\n\nDie strategische Vermögensaufteilung bestimmt maßgeblich die langfristige Portfolio-Performance. Studien zeigen, dass über 90% der Rendite-Variation durch die Asset Allocation erklärt werden kann." ; level="paragraph" ; position=11 ; title="Asset Allocation Strategien" ; section_number="2.1" ; sequence_in_parent=1 ; context_chapter="Praktische Umsetzung" ; context_document="Portfolio Management Strategien"}
```

### SubParagraph-Level-Tags (### Headers)

#### Volatilitäts-Messung
```
{RedisChunk: key=subpara:volatilitaets_messung:001 ; parent=para:risiko_bewertungsmethoden:001 ; children=["chunk:standard_deviation_berechnung:001"] ; text="### Volatilitäts-Messung\n\nVolatilität zeigt die Schwankungsbreite von Asset-Renditen über einen bestimmten Zeitraum. Standard Deviation ist die häufigste Volatilitätsmessung und zeigt die durchschnittliche Abweichung der Renditen vom Mittelwert." ; level="subparagraph" ; position=3 ; title="Volatilitäts-Messung" ; subsection_number="1.1.1" ; sequence_in_parent=1 ; context_title="Risiko-Bewertungsmethoden" ; context_chapter="Risikomanagement Grundlagen" ; context_document="Portfolio Management Strategien"}
```

#### Korrelations-Analyse
```
{RedisChunk: key=subpara:korrelations_analyse:002 ; parent=para:risiko_bewertungsmethoden:001 ; children=[] ; text="### Korrelations-Analyse\n\nDie Korrelation zwischen verschiedenen Assets bestimmt die Effektivität der Diversifikation. Niedrige oder negative Korrelationen ermöglichen eine bessere Risikoreduktion bei gleicher erwarteter Rendite." ; level="subparagraph" ; position=5 ; title="Korrelations-Analyse" ; subsection_number="1.1.2" ; sequence_in_parent=2 ; context_title="Risiko-Bewertungsmethoden" ; context_chapter="Risikomanagement Grundlagen" ; context_document="Portfolio Management Strategien"}
```

### Content-Chunk-Level-Tags (Text ohne Headers)

#### Standard Deviation Details
```
{RedisChunk: key=chunk:standard_deviation_berechnung:001 ; parent=subpara:volatilitaets_messung:001 ; children=[] ; text="Die Berechnung der Standard Deviation erfolgt durch die Quadratwurzel der Varianz, wobei die Varianz der Durchschnitt der quadrierten Abweichungen vom Mittelwert ist." ; level="chunk" ; position=4 ; sequence_in_parent=1 ; context_title="Volatilitäts-Messung" ; context_chapter="Risikomanagement Grundlagen" ; context_document="Portfolio Management Strategien"}
```

## Redis-Sets für Beziehungen

### Children-Sets (Hierarchie) - KONSISTENT MIT `:children`

#### Document-Children
```
{RedisSet: key=doc:portfolio_management_strategien:001:children ; members=[ch:risikomanagement_grundlagen:001, ch:praktische_umsetzung:002] ; relationship_type="children" ; parent_key="doc:portfolio_management_strategien:001"}
```

#### Chapter-Children
```
{RedisSet: key=ch:risikomanagement_grundlagen:001:children ; members=[para:risiko_bewertungsmethoden:001, para:portfoliotheorie_fundamentals:002] ; relationship_type="children" ; parent_key="ch:risikomanagement_grundlagen:001"}

{RedisSet: key=ch:praktische_umsetzung:002:children ; members=[para:asset_allocation_strategien:003, chunk:behavioral_finance_aspekte:008] ; relationship_type="children" ; parent_key="ch:praktische_umsetzung:002"}
```

#### Paragraph-Children
```
{RedisSet: key=para:risiko_bewertungsmethoden:001:children ; members=[subpara:volatilitaets_messung:001, subpara:korrelations_analyse:002] ; relationship_type="children" ; parent_key="para:risiko_bewertungsmethoden:001"}

{RedisSet: key=para:portfoliotheorie_fundamentals:002:children ; members=[subpara:effiziente_grenze:003] ; relationship_type="children" ; parent_key="para:portfoliotheorie_fundamentals:002"}

{RedisSet: key=para:asset_allocation_strategien:003:children ; members=[subpara:strategische_vs_taktische:004, chunk:komplexe_produktstrukturen:007] ; relationship_type="children" ; parent_key="para:asset_allocation_strategien:003"}
```

#### SubParagraph-Children
```
{RedisSet: key=subpara:volatilitaets_messung:001:children ; members=[chunk:standard_deviation_berechnung:001] ; relationship_type="children" ; parent_key="subpara:volatilitaets_messung:001"}

{RedisSet: key=subpara:korrelations_analyse:002:children ; members=[chunk:value_at_risk_erklaerung:002] ; relationship_type="children" ; parent_key="subpara:korrelations_analyse:002"}
```

### Sequence-Sets (Lese-Reihenfolge)

#### Document-weite Sequenz (alle Elemente)
```
{RedisSet: key=doc:portfolio_management_strategien:001:sequence ; members=[doc:portfolio_management_strategien:001, ch:risikomanagement_grundlagen:001, para:risiko_bewertungsmethoden:001, subpara:volatilitaets_messung:001, chunk:standard_deviation_berechnung:001, subpara:korrelations_analyse:002, chunk:value_at_risk_erklaerung:002, para:portfoliotheorie_fundamentals:002, subpara:effiziente_grenze:003, ch:praktische_umsetzung:002, para:asset_allocation_strategien:003, subpara:strategische_vs_taktische:004, chunk:komplexe_produktstrukturen:007, chunk:behavioral_finance_aspekte:008] ; relationship_type="sequence"}
```

## Qualitäts-Indikatoren

### ✅ Strukturelle Korrektheit
- **Total-Chunks:** 14 (1 Doc + 13 Content-Elemente)
- **Hierarchie-Konsistenz:** Alle Parent-Child-Beziehungen valide
- **Position-Sequenz:** Lückenlos 1-14
- **Key-Format:** Alle Keys entsprechen Naming-Conventions
- **Set-Naming:** ALLE Sets verwenden konsistent `:children` (nicht `:chapters`)

### ✅ Volltext-Preservation  
- **Document-Text:** Komplett mit YAML-Metadaten
- **Chapter-Text:** Vollständig MIT Header und nachfolgendem Content  
- **Paragraph-Text:** Header + kompletter Absatz-Inhalt
- **SubParagraph-Text:** Header + vollständiger Sub-Content
- **Chunk-Text:** Ungekürzte Original-Sätze/Absätze (OHNE Header)

### ✅ sequence_in_parent Verwendung
- **Immer bei:** Elementen die direkte Kinder eines Parents sind
- **Zweck:** Lokale Reihenfolge innerhalb eines Parents
- **Regel:** Beginnt bei 1 für jedes neue Parent-Element