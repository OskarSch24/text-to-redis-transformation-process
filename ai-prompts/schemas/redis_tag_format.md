# Redis-Tag-Format für strukturierte Text-Transformation

## Grundprinzipien

Das Redis-Tag-System transformiert hierarchische Markdown-Dokumente in Redis-kompatible Key-Value-Strukturen mit vollständiger Erhaltung der ursprünglichen Text-Hierarchie und -Sequenz.

### Design-Philosophie
- **Key-basierte Identifikation** statt UUID-System
- **Flache Redis-Strukturen** für optimale Performance
- **Explizite Sequenz-Erhaltung** durch position-Felder
- **Hierarchie-Bewahrung** durch parent-Referenzen
- **Volltext-Preservation** - niemals Text kürzen oder zusammenfassen
- **Konsistente Set-Naming** - IMMER `:children` für Hierarchie-Sets

## Tag-Typen Übersicht

### Document-Level Tags
```
{RedisDoc: key={doc_key} ; title="{title}" ; author="{author}" ; created="{date}" ; total_chunks={count} ; category="{category}" ; language="{lang}"}
```

### Content-Level Tags  
```
{RedisChunk: key={chunk_key} ; parent={parent_key} ; text="{complete_text}" ; level="{hierarchy_level}" ; position={sequence_number} ; sequence_in_parent={parent_sequence} ; title="{heading_title}"}
```

### Relationship-Level Tags
```
{RedisSet: key={parent_key}:children ; members=[{child_key1}, {child_key2}, ...]}
```

## Document-Tags

### Format-Spezifikation
```
{RedisDoc: key=doc:{clean_title}:{number} ; title="{original_title}" ; author="{author_name}" ; created="{yyyy-mm-dd}" ; total_chunks={chunk_count} ; category="{category}" ; language="{lang_code}"}
```

### Beispiele
```
{RedisDoc: key=doc:portfolio_management_strategies:001 ; title="Portfolio Management Strategies" ; author="Oskar Sch." ; created="2024-12-27" ; total_chunks=47 ; category="investment" ; language="de"}

{RedisDoc: key=doc:risk_assessment_framework:001 ; title="Risk Assessment Framework" ; author="Team Lead" ; created="2024-12-27" ; total_chunks=89 ; category="risk_management" ; language="en"}
```

### Pflichtfelder
- **key**: Redis-Key im Format `doc:{clean_title}:{number}`
- **title**: Originaler Dokumententitel aus YAML Front Matter
- **author**: Autor aus YAML Front Matter
- **created**: Erstellungsdatum im Format YYYY-MM-DD
- **total_chunks**: Anzahl aller generierten Chunks (wird automatisch gezählt)

### Optionale Felder
- **category**: Thematische Kategorie aus YAML
- **language**: Sprach-Code (Standard: "de")
- **tags**: Array von Such-Tags

## Content-Chunk-Tags

### Hierarchie-Ebenen
1. **chapter**: Hauptkapitel (# Headers)
2. **paragraph**: Unterkapitel (## Headers)  
3. **subparagraph**: Unter-Unterkapitel (### Headers)
4. **chunk**: Textblöcke ohne Header

### Chapter-Level-Tags
```
{RedisChunk: key=ch:{topic_keyword}:{number} ; parent=doc:{doc_id} ; text="{complete_chapter_text}" ; level="chapter" ; position={doc_position} ; sequence_in_parent={seq} ; title="{chapter_title}" ; chapter_number={ch_num}}
```

**Beispiel:**
```
{RedisChunk: key=ch:portfolio_theory_fundamentals:001 ; parent=doc:portfolio_management_strategies:001 ; text="# Portfolio Theory Fundamentals\n\nDiversifikation ist der Grundstein erfolgreicher Investments." ; level="chapter" ; position=1 ; sequence_in_parent=1 ; title="Portfolio Theory Fundamentals" ; chapter_number=1}
```

### sequence_in_parent Verwendung (KRITISCH)

**PFLICHT für alle Elemente mit Parent:**
- Startet bei 1 für jedes neue Parent-Element
- Zählt lückenlos hoch für alle direkten Kinder
- Ermöglicht lokale Navigation innerhalb eines Parents

**Beispiel:**
```
ch:risk_management:001 (parent=doc:portfolio:001)
  → sequence_in_parent=1

ch:implementation:002 (parent=doc:portfolio:001)
  → sequence_in_parent=2

para:volatility:001 (parent=ch:risk_management:001)
  → sequence_in_parent=1

para:correlation:002 (parent=ch:risk_management:001)
  → sequence_in_parent=2
```

## Key-Naming-Konventionen

### Dokument-Keys
```
Format: doc:{clean_title}:{3-digit-number}
Beispiele: 
- doc:portfolio_management_strategies:001
- doc:portfolio_management_strategies:002 (bei Duplikat)
```

### Content-Keys nach Hierarchie
```
Chapters:     ch:{main_topic}:{3-digit-number}
Paragraphs:   para:{subtopic}:{3-digit-number} 
SubParagraphs: subpara:{specific_topic}:{3-digit-number}
Chunks:       chunk:{main_concept}:{3-digit-number}
```

### Kollisions-Behandlung (WICHTIG)
Bei Duplikaten automatisch hochzählen:
```
"Risk Management" (1. Vorkommen) → ch:risk_management:001
"Risk Management" (2. Vorkommen) → ch:risk_management:002
"Risk Management" (3. Vorkommen) → ch:risk_management:003
```

## Volltext-Preservation-Regeln

### KRITISCHE REGEL: Text-Erhaltung
Der `text`-Wert **MUSS** den kompletten Originaltext enthalten:

#### Headers MIT nachfolgendem Content
```markdown
# Risk Management

Diversifikation ist wichtig.
```
→
```
{RedisChunk: text="# Risk Management\n\nDiversifikation ist wichtig."}
```

#### Reiner Content OHNE Header
```markdown
Diversifikation ist wichtig.
```
→
```
{RedisChunk: text="Diversifikation ist wichtig."}
```

## Relationship-Tags (Redis-Sets)

### KRITISCH: Set-Naming-Konvention
**IMMER `:children` verwenden für Hierarchie-Sets:**
```
✅ RICHTIG: doc:portfolio:001:children
❌ FALSCH:  doc:portfolio:001:chapters
❌ FALSCH:  doc:portfolio:001:paragraphs
```

### Hierarchie-Sets
```
{RedisSet: key={parent_key}:children ; members=[{child_key1}, {child_key2}, ...]}
```

**Beispiele:**
```
{RedisSet: key=doc:portfolio_management_strategies:001:children ; members=[ch:portfolio_theory_fundamentals:001, ch:practical_implementation:002]}

{RedisSet: key=ch:portfolio_theory_fundamentals:001:children ; members=[para:risk_assessment_methods:001, para:modern_portfolio_theory:002]}
```

### Sequenz-Sets (Lese-Reihenfolge)
```
{RedisSet: key={scope_key}:sequence ; members=[{element1}, {element2}, {element3}, ...]}
```

**Beispiele:**
```
{RedisSet: key=doc:portfolio_management_strategies:001:sequence ; members=[ch:portfolio_theory_fundamentals:001, para:risk_assessment_methods:001, subpara:volatility_measures:001, chunk:standard_deviation_definition:001]}
```

### Navigation-Sets
```
{RedisSet: key={element_key}:next ; members=[{next_element}]}
{RedisSet: key={element_key}:previous ; members=[{previous_element}]}
{RedisSet: key={element_key}:siblings ; members=[{sibling1}, {sibling2}, ...]}
```

## Position-System für Sequenz-Erhaltung

### Dokumenten-weite Position-Nummerierung
Alle Elemente eines Dokuments erhalten aufsteigende position-Nummern:

```
position=1:  ch:portfolio_theory_fundamentals:001
position=2:  para:risk_assessment_methods:001  
position=3:  subpara:volatility_measures:001
position=4:  chunk:standard_deviation_definition:001
position=5:  chunk:value_at_risk_complement:002
```

### Parent-interne Sequenz-Nummerierung
Zusätzlich erhalten Kinder sequentielle Nummern innerhalb ihres Parents:

```
para:risk_assessment_methods:001:
  - subpara:volatility_measures:001 (sequence_in_parent=1)
  - subpara:correlation_analysis:002 (sequence_in_parent=2)
```

Diese doppelte Nummerierung ermöglicht sowohl dokumenten-weite Navigation als auch lokale Parent-Child-Navigation für optimale RAG-Performance.
