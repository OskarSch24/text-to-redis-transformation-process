# Struktur-Preservation-Regeln

## Ziel

Vollständige Erhaltung der Dokumentenstruktur aus Markdown für optimale RAG-Performance und Content-Creation. Jeder Satz muss in seinem korrekten hierarchischen und sequenziellen Kontext auffindbar bleiben.

## Hierarchie-Preservation

### Markdown-Hierarchie-Mapping

#### Level 1: Document
```markdown
---
title: "Portfolio Strategies"
---
```
→ 
```
{RedisDoc: key=doc:portfolio_strategies:001}
```

#### Level 2: Chapter (# Headers)
```markdown
# Risk Management
```
→
```
{RedisChunk: key=ch:risk_management:001 ; parent=doc:portfolio_strategies:001 ; level="chapter"}
```

#### Level 3: Paragraph (## Headers)
```markdown
## Portfolio Theory
```
→
```
{RedisChunk: key=para:portfolio_theory:001 ; parent=ch:risk_management:001 ; level="paragraph"}
```

#### Level 4: SubParagraph (### Headers)
```markdown
### Diversification Methods
```
→
```
{RedisChunk: key=subpara:diversification_methods:001 ; parent=para:portfolio_theory:001 ; level="subparagraph"}
```

#### Level 5: Text-Chunk (normaler Text)
```markdown
Die Korrelation zwischen Assets bestimmt die Effektivität.
```
→
```
{RedisChunk: key=chunk:asset_correlation:001 ; parent=subpara:diversification_methods:001 ; level="chunk"}
```

### Parent-Child-Beziehungen

#### Explizite Parent-Referenzen
Jeder Chunk **MUSS** seinen direkten Parent referenzieren:

```
chunk:asset_correlation:001 → parent=subpara:diversification_methods:001
subpara:diversification_methods:001 → parent=para:portfolio_theory:001
para:portfolio_theory:001 → parent=ch:risk_management:001
ch:risk_management:001 → parent=doc:portfolio_strategies:001
```

#### Hierarchie-Ketten-Navigation
Für vollständigen Kontext muss jede Hierarchie-Ebene erreichbar sein:

```python
def get_full_context(chunk_key):
    context_chain = [chunk_key]
    current = chunk_key
    
    while current has parent:
        parent = get_parent(current)
        context_chain.insert(0, parent)
        current = parent
    
    return context_chain
    
# Beispiel-Output:
# ["doc:portfolio_strategies:001", 
#  "ch:risk_management:001", 
#  "para:portfolio_theory:001", 
#  "subpara:diversification_methods:001", 
#  "chunk:asset_correlation:001"]
```

#### Children-Sets für Navigation
Jeder Parent **MUSS** seine direkten Children in Redis-Sets verwalten:

```
{RedisSet: key=doc:portfolio_strategies:001:children ; members=[ch:risk_management:001, ch:implementation:002]}
{RedisSet: key=ch:risk_management:001:children ; members=[para:portfolio_theory:001, para:risk_assessment:002]}
{RedisSet: key=para:portfolio_theory:001:children ; members=[subpara:diversification_methods:001, chunk:summary:001]}
```

## Sequenz-Preservation

### Absolute Positionierung
Jeder Chunk erhält eine **aufsteigende Position** im Gesamtdokument:

```
position=1: ch:risk_management:001 ("# Risk Management")
position=2: para:portfolio_theory:001 ("## Portfolio Theory")  
position=3: subpara:diversification_methods:001 ("### Diversification Methods")
position=4: chunk:asset_correlation:001 ("Die Korrelation zwischen Assets...")
position=5: chunk:risk_metrics:002 ("Wichtige Risikometriken sind...")
position=6: para:implementation:002 ("## Implementation")
```

### Relative Positionierung
Zusätzlich erhält jeder Chunk eine **relative Position** innerhalb seines Parents:

```
# Innerhalb von para:portfolio_theory:001:
position_in_parent=1: subpara:diversification_methods:001
position_in_parent=2: chunk:asset_correlation:001  
position_in_parent=3: chunk:risk_metrics:002
position_in_parent=4: subpara:implementation_steps:002
```

### Lese-Reihenfolge-Sets
Für schnelle Navigation werden **Sequenz-Sets** auf allen Ebenen erstellt:

#### Dokument-weite Sequenz:
```
{RedisSet: key=doc:portfolio_strategies:001:sequence ; members=[ch:risk_management:001, para:portfolio_theory:001, subpara:diversification_methods:001, chunk:asset_correlation:001, chunk:risk_metrics:002, para:implementation:002]}
```

#### Chapter-interne Sequenz:
```
{RedisSet: key=ch:risk_management:001:sequence ; members=[para:portfolio_theory:001, subpara:diversification_methods:001, chunk:asset_correlation:001, chunk:risk_metrics:002, para:implementation:002]}
```

#### Paragraph-interne Sequenz:
```
{RedisSet: key=para:portfolio_theory:001:sequence ; members=[subpara:diversification_methods:001, chunk:asset_correlation:001, chunk:risk_metrics:002]}
```

### Previous/Next-Navigation
Für **direkte Satz-zu-Satz-Navigation** werden bidirektionale Sets erstellt:

```
{RedisSet: key=chunk:asset_correlation:001:previous ; members=[subpara:diversification_methods:001]}
{RedisSet: key=chunk:asset_correlation:001:next ; members=[chunk:risk_metrics:002]}

{RedisSet: key=chunk:risk_metrics:002:previous ; members=[chunk:asset_correlation:001]}
{RedisSet: key=chunk:risk_metrics:002:next ; members=[para:implementation:002]}
```

## Content-Preservation

### Volltext-Erhaltung
**KRITISCHE REGEL:** Der `text`-Wert **MUSS** den kompletten Originaltext enthalten:

#### Bei Headers mit nachfolgendem Content:
```markdown
# Risk Management

Diversifikation ist der Grundstein erfolgreicher Investments.
```
→
```
{RedisChunk: text="# Risk Management\n\nDiversifikation ist der Grundstein erfolgreicher Investments."}
```

#### Bei reinem Content:
```markdown
Die Korrelation zwischen Assets bestimmt die Effektivität der Diversifikation.
```
→
```
{RedisChunk: text="Die Korrelation zwischen Assets bestimmt die Effektivität der Diversifikation."}
```

#### Bei mehrzeiligem Content:
```markdown
Modern portfolio theory provides mathematical foundations.

Die Markowitz-Theorie zeigt optimale Konstruktion.

Wichtige Komponenten:
- Erwartete Rendite
- Volatilität  
- Korrelationen
```
→
```
{RedisChunk: text="Modern portfolio theory provides mathematical foundations.\n\nDie Markowitz-Theorie zeigt optimale Konstruktion.\n\nWichtige Komponenten:\n- Erwartete Rendite\n- Volatilität\n- Korrelationen"}
```

### Kontext-Preservation
Jeder Chunk **MUSS** genügend Kontext-Informationen enthalten für autonome Verständlichkeit:

```
{RedisChunk: 
  key=chunk:asset_correlation:001 ; 
  parent=subpara:diversification_methods:001 ; 
  text="Die Korrelation zwischen Assets bestimmt die Effektivität der Diversifikation." ; 
  level="chunk" ; 
  position=4 ; 
  context_title="Diversification Methods" ; 
  context_chapter="Risk Management" ; 
  context_document="Portfolio Strategies"
}
```

## Spezielle Strukturen

### Gemischte Hierarchien
Wenn ein Parent sowohl Sub-Headers als auch direkten Content hat:

```markdown
## Portfolio Theory

Einführungstext zur Portfolio-Theorie.

### Mathematical Foundations

Mathematische Grundlagen der Theorie.

Weitere direkte Inhalte unter Portfolio Theory.
```

**Struktur-Mapping:**
```
para:portfolio_theory:001 (## Portfolio Theory)
├── chunk:intro_text:001 ("Einführungstext zur Portfolio-Theorie.")
├── subpara:mathematical_foundations:001 (### Mathematical Foundations)  
│   └── chunk:math_basics:001 ("Mathematische Grundlagen der Theorie.")
└── chunk:additional_content:002 ("Weitere direkte Inhalte unter Portfolio Theory.")
```

**Position-Vergabe:**
```
position=5: para:portfolio_theory:001
position=6: chunk:intro_text:001
position=7: subpara:mathematical_foundations:001
position=8: chunk:math_basics:001  
position=9: chunk:additional_content:002
```

### Listen und Aufzählungen
Listen bleiben **als Ganzes** in einem Chunk erhalten:

```markdown
Wichtige Risikometriken:
- Standard Deviation
- Value at Risk (VaR)
- Expected Shortfall
- Beta-Koeffizient
```
→
```
{RedisChunk: text="Wichtige Risikometriken:\n- Standard Deviation\n- Value at Risk (VaR)\n- Expected Shortfall\n- Beta-Koeffizient"}
```

### Code-Blöcke und Formeln
Bleiben **vollständig** im jeweiligen Chunk erhalten:

```markdown
Die Sharpe-Ratio berechnet sich wie folgt:

```
Sharpe Ratio = (Portfolio Return - Risk-free Rate) / Portfolio Standard Deviation
```

Diese Kennzahl misst die risikoadjustierte Rendite.
```
→
```
{RedisChunk: text="Die Sharpe-Ratio berechnet sich wie folgt:\n\n```\nSharpe Ratio = (Portfolio Return - Risk-free Rate) / Portfolio Standard Deviation\n```\n\nDiese Kennzahl misst die risikoadjustierte Rendite."}
```

## Validierungs-Algorithmen

### Hierarchie-Validierung
```python
def validate_hierarchy(all_chunks):
    for chunk in all_chunks:
        if chunk.level != "document":
            assert chunk has parent
            assert parent exists in all_chunks
            assert parent.level is valid_parent_level_for(chunk.level)
            assert chunk in parent.children_set
```

### Sequenz-Validierung  
```python
def validate_sequence(all_chunks):
    positions = [chunk.position for chunk in all_chunks]
    assert positions == sorted(positions)  # Aufsteigend
    assert no_gaps_in(positions)          # Keine Lücken
    assert all_positions_unique(positions) # Eindeutig
```

### Previous/Next-Validierung
```python
def validate_navigation(all_chunks):
    for chunk in all_chunks:
        if chunk has next:
            next_chunk = get_chunk(chunk.next)
            assert next_chunk.previous == chunk.key
            assert next_chunk.position == chunk.position + 1
            
        if chunk has previous:
            prev_chunk = get_chunk(chunk.previous)
            assert prev_chunk.next == chunk.key
            assert prev_chunk.position == chunk.position - 1
```

### Content-Validierung
```python
def validate_content(chunk, original_markdown):
    # Text darf nicht gekürzt sein
    assert len(chunk.text) >= minimum_expected_length
    
    # Originaler Markdown-Content muss enthalten sein
    assert extract_content_from_markdown(chunk) in chunk.text
    
    # Keine summarization oder Kürzung
    assert not_summarized(chunk.text)
```

## RAG-Optimierung durch Struktur

### Kontext-Enrichment für Embeddings
Beim Generieren von Vector-Embeddings wird **hierarchischer Kontext** hinzugefügt:

```python
def create_embedding_text(chunk):
    context_chain = get_full_context(chunk.key)
    context_titles = [get_title(key) for key in context_chain]
    
    embedding_text = f"""
    Document: {context_titles[0]}
    Chapter: {context_titles[1]}  
    Section: {context_titles[2]}
    Content: {chunk.text}
    """
    
    return embedding_text
```

### Multi-Level-Suche
Struktur ermöglicht **granulare und kontextuelle Suche**:

```python
def search_with_context(query):
    # Level 1: Direkte Chunk-Suche
    exact_chunks = vector_search(query, chunk_embeddings)
    
    # Level 2: Hierarchie-erweiterte Suche  
    related_chunks = []
    for chunk in exact_chunks:
        context = get_full_context(chunk)
        siblings = get_siblings(chunk.parent)
        related_chunks.extend(siblings)
    
    # Level 3: Sequenz-basierte Erweiterung
    sequence_chunks = []
    for chunk in exact_chunks:
        previous = get_previous_chunks(chunk, count=2)
        next = get_next_chunks(chunk, count=2)
        sequence_chunks.extend(previous + next)
    
    return {
        "exact": exact_chunks,
        "contextual": related_chunks, 
        "sequential": sequence_chunks
    }
```

## Fehlerbehandlung

### Strukturfehler-Erkennung
- **Orphaned Chunks:** Chunks ohne gültigen Parent
- **Circular References:** A → B → A Hierarchien  
- **Position Gaps:** Fehlende Sequenz-Nummern
- **Broken Navigation:** Previous/Next zeigen auf nicht-existente Chunks

### Reparatur-Strategien
- **Auto-Parent-Assignment:** Basierend auf Position
- **Sequence-Regeneration:** Neuberechnung aller Positionen
- **Navigation-Rebuild:** Previous/Next-Sets neu erstellen

### Qualitätssicherung
- **Pre-Upload-Validation:** Vor Redis-Upload alle Regeln prüfen
- **Post-Upload-Verification:** Nach Upload Struktur-Integrität testen
- **Periodic Health-Checks:** Regelmäßige Konsistenz-Prüfungen
