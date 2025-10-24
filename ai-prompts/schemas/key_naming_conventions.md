# Key-Naming-Konventionen für Redis

## Übersicht

Redis-Keys müssen eindeutig, vorhersagbar und hierarchisch navigierbar sein. Diese Konventionen stellen sicher, dass aus jedem Markdown-Text konsistente, kollisionsfreie Redis-Strukturen entstehen.

## Basis-Prinzipien

### 1. Namespace-Trennung
Alle Keys beginnen mit einem **Typ-Präfix** für klare Kategorisierung:

```
doc:       - Dokument-Level
ch:        - Chapter-Level (# Headers)
para:      - Paragraph-Level (## Headers)  
subpara:   - SubParagraph-Level (### Headers)
chunk:     - Content-Chunk-Level (Text ohne Header)
```

### 2. Hierarchische Struktur
```
Format: {prefix}:{clean_identifier}:{number}

Beispiele:
doc:portfolio_management_strategies:001
ch:risk_assessment_fundamentals:001
ch:risk_assessment_fundamentals:002  # Zweites Vorkommen desselben Namens
para:volatility_measurement_methods:001
subpara:standard_deviation_analysis:001
chunk:correlation_coefficient_explanation:001
```

### 3. Eindeutigkeit durch Nummerierung
- **3-stellige Nummerierung**: 001, 002, 003...
- **Pro Typ und Name fortlaufend**: Bei Duplikaten automatisch hochzählen
- **Automatische Kollisions-Vermeidung**: Bei gleichem Namen → unterschiedliche Nummern

## Kollisions-Beispiele mit 001, 002, 003

### Praktische Duplikat-Behandlung
```python
# Beispiel: Mehrere "Risk Management" Kapitel im selben Dokument

"# Risk Management" (1. Vorkommen)
→ ch:risk_management:001

"# Risk Management" (2. Vorkommen, z.B. in anderem Kontext)
→ ch:risk_management:002

"# Risk Management" (3. Vorkommen)
→ ch:risk_management:003

# Beispiel: Wiederholte "Introduction" Paragraphen

"## Introduction" (unter Chapter 1)
→ para:introduction:001

"## Introduction" (unter Chapter 2)
→ para:introduction:002

"## Introduction" (unter Chapter 3)
→ para:introduction:003

# Beispiel: Mehrere "Summary" Chunks

"This is a summary of the findings." (1. Summary-Chunk)
→ chunk:summary_findings:001

"Summary of the methodology used." (2. Summary-Chunk)
→ chunk:summary_methodology:002

"Final summary and conclusions." (3. Summary-Chunk)
→ chunk:final_summary_conclusions:003
```

### Vollständiges Dokument-Beispiel mit Duplikaten
```markdown
# Portfolio Management
Introduction to portfolio management...

## Risk Assessment
Basic risk assessment methods...

# Portfolio Management  # Duplikat!
Advanced portfolio techniques...

## Risk Assessment  # Duplikat!
Advanced risk metrics...

### Volatility Analysis
Standard deviation calculations...

### Volatility Analysis  # Duplikat!
Alternative volatility measures...
```

**Resultierende Keys:**
```
ch:portfolio_management:001 (erstes "Portfolio Management")
para:risk_assessment:001 (erstes "Risk Assessment")
ch:portfolio_management:002 (zweites "Portfolio Management")
para:risk_assessment:002 (zweites "Risk Assessment")
subpara:volatility_analysis:001 (erstes "Volatility Analysis")
subpara:volatility_analysis:002 (zweites "Volatility Analysis")
```

## Text-zu-Key-Transformation

### Schritt 1: Identifier-Extraktion

#### Aus Header-Texten:
```
"# Portfolio Management & Risk Assessment" → "portfolio_management_risk_assessment"
"## Diversifikation: Der Schlüssel zum Erfolg" → "diversifikation_der_schluessel_zum_erfolg"
"### Value at Risk (VaR) Berechnungen" → "value_at_risk_var_berechnungen"
```

### Schritt 2: Text-Bereinigung

#### Reihenfolge der Transformationen:
1. **Lowercase**: Alle Großbuchstaben → klein
2. **Umlaut-Konversion**: ä→ae, ö→oe, ü→ue, ß→ss
3. **Sonderzeichen entfernen**: Alle nicht-alphanumerischen Zeichen
4. **Leerzeichen ersetzen**: Spaces → Unterstriche
5. **Mehrfach-Unterstriche bereinigen**: __ → _
6. **Längen-Begrenzung**: Maximal 30 Zeichen
7. **Trailing-Bereinigung**: Führende/abschließende Unterstriche entfernen

### Schritt 3: Kollisions-Behandlung mit Counter

```python
def generate_unique_key(prefix, identifier, existing_keys):
    """Generiert eindeutigen Key mit automatischer Nummerierung"""
    base_key = f"{prefix}:{identifier}"
    counter = 1
    
    # Erhöhe Counter bis freie Nummer gefunden
    while f"{base_key}:{counter:03d}" in existing_keys:
        counter += 1
    
    final_key = f"{base_key}:{counter:03d}"
    existing_keys.add(final_key)
    return final_key

# Realistisches Beispiel mit mehreren Dokumenten:
existing_keys = set()

# Dokument 1
key1 = generate_unique_key("ch", "risk_management", existing_keys)
# → ch:risk_management:001

key2 = generate_unique_key("ch", "portfolio_theory", existing_keys)  
# → ch:portfolio_theory:001

key3 = generate_unique_key("ch", "risk_management", existing_keys)  # Duplikat!
# → ch:risk_management:002

# Dokument 2 (gleiche Session)
key4 = generate_unique_key("ch", "risk_management", existing_keys)  # Wieder Duplikat!
# → ch:risk_management:003

key5 = generate_unique_key("para", "introduction", existing_keys)
# → para:introduction:001

key6 = generate_unique_key("para", "introduction", existing_keys)  # Duplikat!
# → para:introduction:002
```

## Set-Keys für Beziehungen

### Hierarchie-Sets (IMMER :children)
```
{parent_key}:children → Direkte Kinder

Beispiele:
doc:portfolio_guide:001:children
ch:risk_management:001:children
ch:risk_management:002:children  # Zweites Risk Management Kapitel
para:volatility_analysis:001:children
```

### Sequenz-Sets
```
{scope_key}:sequence → Lese-Reihenfolge

Beispiele:
doc:portfolio_guide:001:sequence (gesamte Dokument-Sequenz)
ch:risk_management:001:sequence (Sequenz des ersten Risk Management Kapitels)
ch:risk_management:002:sequence (Sequenz des zweiten Risk Management Kapitels)
```

## Validierung und Qualitätssicherung

### Key-Format-Validation mit Duplikat-Support
```python
def validate_and_track_keys(generated_keys):
    """Validiert Keys und trackt Duplikate"""
    key_usage = {}
    validation_report = {
        'valid': [],
        'invalid': [],
        'duplicates': {}
    }
    
    for key in generated_keys:
        # Format-Check
        if not validate_key_format(key):
            validation_report['invalid'].append(key)
            continue
        
        # Duplikat-Tracking
        prefix, identifier, number = key.split(':')
        base = f"{prefix}:{identifier}"
        
        if base not in key_usage:
            key_usage[base] = []
        key_usage[base].append(number)
        
        validation_report['valid'].append(key)
    
    # Finde echte Duplikate (gleiche Nummer)
    for base, numbers in key_usage.items():
        if len(numbers) > 1:
            validation_report['duplicates'][base] = sorted(numbers)
    
    return validation_report

# Beispiel-Output:
keys = [
    "ch:risk_management:001",
    "ch:risk_management:002",  # OK - verschiedene Nummer
    "ch:risk_management:002",  # FEHLER - gleiche Nummer!
    "para:introduction:001",
    "para:introduction:002"     # OK - verschiedene Nummer
]

report = validate_and_track_keys(keys)
# report['duplicates'] = {"ch:risk_management": ["002", "002"]}  # Problem!
```

## Best Practices

### Do's ✅
- Konsistente Kleinschreibung verwenden
- Bei Duplikaten automatisch hochzählen (001, 002, 003...)
- Eindeutigkeit durch Nummerierung sicherstellen
- 3-stellige Nummerierung für Sortierfähigkeit
- IMMER `:children` für Hierarchie-Sets

### Don'ts ❌
- Gleiche Nummer für gleichen Namen mehrfach verwenden
- `:chapters`, `:paragraphs` oder andere Set-Namen (nur `:children`)
- Manuelle Nummerierung ohne Kollisions-Check
- Keys ohne Validierung generieren

### Realistisches Komplett-Beispiel
```python
# Transformation eines Dokuments mit vielen Duplikaten

document_structure = [
    ("# Introduction", "chapter"),
    ("Overview text", "chunk"),
    ("## Background", "paragraph"),
    ("Historical context", "chunk"),
    ("# Introduction", "chapter"),      # Duplikat!
    ("Advanced intro", "chunk"),
    ("## Background", "paragraph"),      # Duplikat!
    ("Technical background", "chunk"),
    ("### Details", "subparagraph"),
    ("### Details", "subparagraph"),    # Duplikat!
]

existing_keys = set()
generated_elements = []

for text, level in document_structure:
    if level == "chapter":
        identifier = clean_text_for_key(text.replace("# ", ""))
        key = generate_unique_key("ch", identifier, existing_keys)
    elif level == "paragraph":
        identifier = clean_text_for_key(text.replace("## ", ""))
        key = generate_unique_key("para", identifier, existing_keys)
    # ... etc
    
    generated_elements.append(key)

# Resultat:
# ch:introduction:001
# chunk:overview_text:001
# para:background:001
# chunk:historical_context:001
# ch:introduction:002         ← Automatisch 002
# chunk:advanced_intro:001
# para:background:002         ← Automatisch 002
# chunk:technical_background:001
# subpara:details:001
# subpara:details:002         ← Automatisch 002
```
