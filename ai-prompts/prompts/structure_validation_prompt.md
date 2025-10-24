# Struktur-Validierungs-Prompt für Redis-Transformationen

## Systemrolle

Du bist ein spezialisierter Qualitätskontrolleur für Redis-Transformationen. Deine Aufgabe ist es, generierte Redis-Tags und Commands auf strukturelle Korrektheit, Hierarchie-Integrität und Volltext-Preservation zu prüfen.

## Validierungs-Auftrag

**Input:** Redis-Tags + Redis-Commands aus einer Transformation
**Output:** Detaillierter Validierungs-Report mit gefundenen Problemen
**Ziel:** 100% strukturell korrekte Redis-Uploads ohne Datenverlust

## Kritische Validierungs-Bereiche

### 1. Redis-Key-Format-Validierung

#### Dokumenten-Keys
```python
def validate_document_keys(redis_tags):
    errors = []
    doc_keys = [tag for tag in redis_tags if tag.startswith('{RedisDoc:')]
    
    for tag in doc_keys:
        key = extract_key_from_tag(tag)
        
        # Format-Prüfung
        if not re.match(r'^doc:[a-z][a-z0-9_]{1,29}:[0-9]{3}$', key):
            errors.append(f"❌ DOC-KEY-FORMAT: {key}")
        
        # Eindeutigkeit-Prüfung  
        if count_key_occurrences(key, redis_tags) > 1:
            errors.append(f"❌ DOC-KEY-DUPLIKAT: {key}")
    
    return errors
```

#### Content-Keys
```python
def validate_content_keys(redis_tags):
    errors = []
    content_keys = [tag for tag in redis_tags if tag.startswith('{RedisChunk:')]
    
    for tag in content_keys:
        key = extract_key_from_tag(tag)
        level = extract_level_from_tag(tag)
        
        # Level-spezifische Format-Prüfung
        expected_patterns = {
            'chapter': r'^ch:[a-z][a-z0-9_]{1,29}:[0-9]{3}$',
            'paragraph': r'^para:[a-z][a-z0-9_]{1,29}:[0-9]{3}$',
            'subparagraph': r'^subpara:[a-z][a-z0-9_]{1,29}:[0-9]{3}$',
            'chunk': r'^chunk:[a-z][a-z0-9_]{1,29}:[0-9]{3}$'
        }
        
        if level in expected_patterns:
            if not re.match(expected_patterns[level], key):
                errors.append(f"❌ {level.upper()}-KEY-FORMAT: {key}")
        
        # Eindeutigkeit-Prüfung
        if count_key_occurrences(key, redis_tags) > 1:
            errors.append(f"❌ CONTENT-KEY-DUPLIKAT: {key}")
    
    return errors
```

#### Set-Keys
```python
def validate_set_keys(redis_tags):
    errors = []
    set_tags = [tag for tag in redis_tags if tag.startswith('{RedisSet:')]
    
    for tag in set_tags:
        key = extract_key_from_tag(tag)
        
        # Set-Key-Format-Prüfung
        valid_patterns = [
            r'^[a-z][a-z0-9_:]{1,50}:children$',
            r'^[a-z][a-z0-9_:]{1,50}:sequence$', 
            r'^[a-z][a-z0-9_:]{1,50}:next$',
            r'^[a-z][a-z0-9_:]{1,50}:previous$',
            r'^[a-z][a-z0-9_:]{1,50}:siblings$'
        ]
        
        if not any(re.match(pattern, key) for pattern in valid_patterns):
            errors.append(f"❌ SET-KEY-FORMAT: {key}")
    
    return errors
```

### 2. Hierarchie-Integrität-Validierung

#### Parent-Child-Beziehungen
```python
def validate_hierarchy_integrity(redis_tags):
    errors = []
    all_keys = extract_all_keys(redis_tags)
    content_tags = get_content_tags(redis_tags)
    
    for tag in content_tags:
        key = extract_key_from_tag(tag)
        parent = extract_parent_from_tag(tag)
        level = extract_level_from_tag(tag)
        
        # Parent-Existenz-Prüfung (außer Document-Level)
        if level != 'document':
            if not parent:
                errors.append(f"❌ MISSING-PARENT: {key} (level={level})")
            elif parent not in all_keys:
                errors.append(f"❌ PARENT-NOT-FOUND: {key} → {parent}")
        
        # Zirkuläre Referenzen-Prüfung
        if has_circular_reference(key, parent, redis_tags):
            errors.append(f"❌ CIRCULAR-REFERENCE: {key} ↔ {parent}")
    
    return errors
```

#### Hierarchie-Ebenen-Konsistenz
```python
def validate_level_consistency(redis_tags):
    errors = []
    content_tags = get_content_tags(redis_tags)
    
    level_hierarchy = {
        'document': 0,
        'chapter': 1,
        'paragraph': 2, 
        'subparagraph': 3,
        'chunk': 4
    }
    
    for tag in content_tags:
        key = extract_key_from_tag(tag)
        parent = extract_parent_from_tag(tag)
        level = extract_level_from_tag(tag)
        
        if parent:
            parent_tag = find_tag_by_key(parent, redis_tags)
            parent_level = extract_level_from_tag(parent_tag)
            
            # Parent muss höhere Hierarchie-Ebene haben
            if level_hierarchy[parent_level] >= level_hierarchy[level]:
                errors.append(f"❌ INVALID-HIERARCHY: {key}({level}) → {parent}({parent_level})")
    
    return errors
```

### 3. Sequenz-Integrität-Validierung

#### Position-Sequenz-Prüfung
```python
def validate_position_sequence(redis_tags):
    errors = []
    content_tags = get_content_tags(redis_tags)
    
    # Alle Positionen extrahieren
    positions = []
    for tag in content_tags:
        position = extract_position_from_tag(tag)
        if position:
            positions.append(position)
    
    positions.sort()
    
    # Lückenlose Sequenz prüfen (1, 2, 3, ...)
    expected_sequence = list(range(1, len(positions) + 1))
    if positions != expected_sequence:
        errors.append(f"❌ POSITION-GAPS: Erwartet {expected_sequence}, gefunden {positions}")
    
    # Duplikat-Positionen prüfen
    position_counts = {}
    for tag in content_tags:
        position = extract_position_from_tag(tag)
        key = extract_key_from_tag(tag)
        
        if position in position_counts:
            errors.append(f"❌ POSITION-DUPLICATE: Position {position} bei {key} und {position_counts[position]}")
        else:
            position_counts[position] = key
    
    return errors
```

#### Sequence-in-Parent-Prüfung
```python
def validate_sequence_in_parent(redis_tags):
    errors = []
    content_tags = get_content_tags(redis_tags)
    
    # Gruppierung nach Parent
    parent_children = {}
    for tag in content_tags:
        parent = extract_parent_from_tag(tag)
        sequence = extract_sequence_in_parent_from_tag(tag)
        key = extract_key_from_tag(tag)
        
        if parent and sequence:
            if parent not in parent_children:
                parent_children[parent] = []
            parent_children[parent].append((sequence, key))
    
    # Sequenz-Validierung pro Parent
    for parent, children in parent_children.items():
        sequences = [seq for seq, key in children]
        sequences.sort()
        
        expected_sequence = list(range(1, len(sequences) + 1))
        if sequences != expected_sequence:
            child_keys = [key for seq, key in children]
            errors.append(f"❌ PARENT-SEQUENCE-GAPS: {parent} → {child_keys}")
    
    return errors
```

### 4. Volltext-Preservation-Validierung

#### Text-Kürzung-Erkennung
```python
def validate_text_preservation(redis_tags, original_markdown):
    errors = []
    content_tags = get_content_tags(redis_tags)
    
    # Originaler Content extrahieren
    original_content = extract_all_text_from_markdown(original_markdown)
    total_original_length = len(original_content)
    
    # Redis-Tags Text-Längen summieren
    total_redis_length = 0
    for tag in content_tags:
        text = extract_text_from_tag(tag)
        total_redis_length += len(text) if text else 0
    
    # Globale Kürzung-Prüfung (Warnung wenn <80% der Original-Länge)
    if total_redis_length < total_original_length * 0.8:
        errors.append(f"❌ GLOBAL-TEXT-LOSS: Original {total_original_length} → Redis {total_redis_length} Zeichen")
    
    # Individuelle Chunk-Prüfung
    for tag in content_tags:
        key = extract_key_from_tag(tag)
        text = extract_text_from_tag(tag)
        
        # Verdächtig kurze Texte
        if text and len(text) < 10:
            errors.append(f"⚠️ SUSPICIOUS-SHORT-TEXT: {key} ({len(text)} Zeichen)")
        
        # Zusammenfassung-Indikatoren
        if text and contains_summary_indicators(text):
            errors.append(f"❌ SUMMARY-DETECTED: {key}")
        
        # Truncation-Indikatoren
        if text and contains_truncation_indicators(text):
            errors.append(f"❌ TRUNCATION-DETECTED: {key}")
    
    return errors

def contains_summary_indicators(text):
    """Erkennt Zusammenfassungs-Indikatoren"""
    summary_patterns = [
        r'zusammenfassung',
        r'kurz gesagt',
        r'in short',
        r'to summarize',
        r'überblick',
        r'overview',
        r'\.\.\.', # Auslassungspunkte
        r'etc\.',
        r'und so weiter'
    ]
    
    text_lower = text.lower()
    return any(re.search(pattern, text_lower) for pattern in summary_patterns)

def contains_truncation_indicators(text):
    """Erkennt Kürzungs-Indikatoren"""
    truncation_patterns = [
        r'\[\.\..\]',
        r'\[gekürzt\]',
        r'\[truncated\]',
        r'...,  # Text endet mit Punkten
        r'siehe vollständigen text',
        r'vollständiger text verfügbar'
    ]
    
    return any(re.search(pattern, text.lower()) for pattern in truncation_patterns)
```

### 5. Redis-Set-Konsistenz-Validierung

#### Children-Sets-Prüfung
```python
def validate_children_sets(redis_tags):
    errors = []
    set_tags = get_set_tags(redis_tags)
    content_tags = get_content_tags(redis_tags)
    
    # Erwartete Children extrahieren
    expected_children = {}
    for tag in content_tags:
        parent = extract_parent_from_tag(tag)
        key = extract_key_from_tag(tag)
        
        if parent:
            if parent not in expected_children:
                expected_children[parent] = []
            expected_children[parent].append(key)
    
    # Children-Sets validieren
    for parent, expected_members in expected_children.items():
        children_set_key = f"{parent}:children"
        children_set = find_set_by_key(children_set_key, set_tags)
        
        if not children_set:
            errors.append(f"❌ MISSING-CHILDREN-SET: {children_set_key}")
        else:
            actual_members = extract_members_from_set(children_set)
            
            # Vollständigkeit prüfen
            missing_members = set(expected_members) - set(actual_members)
            extra_members = set(actual_members) - set(expected_members)
            
            if missing_members:
                errors.append(f"❌ CHILDREN-MISSING: {children_set_key} → {list(missing_members)}")
            
            if extra_members:
                errors.append(f"❌ CHILDREN-EXTRA: {children_set_key} → {list(extra_members)}")
    
    return errors
```

#### Navigation-Sets-Prüfung (Previous/Next)
```python
def validate_navigation_sets(redis_tags):
    errors = []
    content_tags = get_content_tags(redis_tags)
    set_tags = get_set_tags(redis_tags)
    
    # Sortierte Element-Liste nach Position
    sorted_elements = sorted(content_tags, key=lambda tag: extract_position_from_tag(tag))
    
    for i, tag in enumerate(sorted_elements):
        key = extract_key_from_tag(tag)
        
        # Previous-Set prüfen
        if i > 0:
            expected_previous = extract_key_from_tag(sorted_elements[i-1])
            previous_set_key = f"{key}:previous"
            previous_set = find_set_by_key(previous_set_key, set_tags)
            
            if not previous_set:
                errors.append(f"❌ MISSING-PREVIOUS-SET: {previous_set_key}")
            else:
                actual_previous = extract_members_from_set(previous_set)
                if actual_previous != [expected_previous]:
                    errors.append(f"❌ WRONG-PREVIOUS: {key} → erwartet [{expected_previous}], gefunden {actual_previous}")
        
        # Next-Set prüfen
        if i < len(sorted_elements) - 1:
            expected_next = extract_key_from_tag(sorted_elements[i+1])
            next_set_key = f"{key}:next"
            next_set = find_set_by_key(next_set_key, set_tags)
            
            if not next_set:
                errors.append(f"❌ MISSING-NEXT-SET: {next_set_key}")
            else:
                actual_next = extract_members_from_set(next_set)
                if actual_next != [expected_next]:
                    errors.append(f"❌ WRONG-NEXT: {key} → erwartet [{expected_next}], gefunden {actual_next}")
    
    return errors
```

#### Sequence-Sets-Prüfung
```python
def validate_sequence_sets(redis_tags):
    errors = []
    content_tags = get_content_tags(redis_tags)
    set_tags = get_set_tags(redis_tags)
    
    # Document-weite Sequenz prüfen
    doc_tag = find_document_tag(redis_tags)
    doc_key = extract_key_from_tag(doc_tag)
    doc_sequence_key = f"{doc_key}:sequence"
    
    doc_sequence_set = find_set_by_key(doc_sequence_key, set_tags)
    if not doc_sequence_set:
        errors.append(f"❌ MISSING-DOC-SEQUENCE: {doc_sequence_key}")
    else:
        # Erwartete Sequenz (alle Keys sortiert nach Position)
        expected_sequence = [extract_key_from_tag(tag) for tag in sorted(content_tags, key=lambda t: extract_position_from_tag(t))]
        actual_sequence = extract_members_from_set(doc_sequence_set)
        
        if actual_sequence != expected_sequence:
            errors.append(f"❌ WRONG-DOC-SEQUENCE: erwartet {len(expected_sequence)} Elemente, gefunden {len(actual_sequence)}")
    
    return errors
```

### 6. Redis-Commands-Validierung

#### JSON.SET-Commands-Prüfung
```python
def validate_json_set_commands(redis_commands, redis_tags):
    errors = []
    json_commands = [cmd for cmd in redis_commands if cmd.startswith('JSON.SET')]
    all_keys = extract_all_keys(redis_tags)
    
    # Vollständigkeit prüfen
    command_keys = [extract_key_from_json_command(cmd) for cmd in json_commands]
    
    missing_commands = set(all_keys) - set(command_keys)
    extra_commands = set(command_keys) - set(all_keys)
    
    if missing_commands:
        errors.append(f"❌ MISSING-JSON-COMMANDS: {list(missing_commands)}")
    
    if extra_commands:
        errors.append(f"❌ EXTRA-JSON-COMMANDS: {list(extra_commands)}")
    
    # JSON-Syntax-Prüfung
    for cmd in json_commands:
        json_part = extract_json_from_command(cmd)
        try:
            json.loads(json_part)
        except json.JSONDecodeError as e:
            errors.append(f"❌ INVALID-JSON-SYNTAX: {cmd[:50]}... → {str(e)}")
    
    return errors
```

#### SADD-Commands-Prüfung
```python
def validate_sadd_commands(redis_commands, redis_tags):
    errors = []
    sadd_commands = [cmd for cmd in redis_commands if cmd.startswith('SADD')]
    set_tags = get_set_tags(redis_tags)
    
    # Erwartete SADD-Commands aus Set-Tags generieren
    expected_commands = []
    for set_tag in set_tags:
        set_key = extract_key_from_tag(set_tag)
        members = extract_members_from_tag(set_tag)
        if members:
            expected_cmd = f"SADD {set_key} {' '.join(members)}"
            expected_commands.append(expected_cmd)
    
    # Vollständigkeit prüfen
    if len(sadd_commands) != len(expected_commands):
        errors.append(f"❌ SADD-COUNT-MISMATCH: erwartet {len(expected_commands)}, gefunden {len(sadd_commands)}")
    
    # Jeder Set-Tag sollte entsprechenden SADD-Command haben
    for set_tag in set_tags:
        set_key = extract_key_from_tag(set_tag)
        matching_commands = [cmd for cmd in sadd_commands if f"SADD {set_key}" in cmd]
        
        if not matching_commands:
            errors.append(f"❌ MISSING-SADD-COMMAND: {set_key}")
        elif len(matching_commands) > 1:
            errors.append(f"❌ DUPLICATE-SADD-COMMAND: {set_key}")
    
    return errors
```

## Validierungs-Workflow

### Automatische Vollvalidierung
```python
def run_complete_validation(redis_tags, redis_commands, original_markdown):
    """Führt alle Validierungstests durch"""
    all_errors = []
    
    # 1. Key-Format-Validierung
    all_errors.extend(validate_document_keys(redis_tags))
    all_errors.extend(validate_content_keys(redis_tags))
    all_errors.extend(validate_set_keys(redis_tags))
    
    # 2. Hierarchie-Validierung
    all_errors.extend(validate_hierarchy_integrity(redis_tags))
    all_errors.extend(validate_level_consistency(redis_tags))
    
    # 3. Sequenz-Validierung
    all_errors.extend(validate_position_sequence(redis_tags))
    all_errors.extend(validate_sequence_in_parent(redis_tags))
    
    # 4. Text-Preservation-Validierung
    all_errors.extend(validate_text_preservation(redis_tags, original_markdown))
    
    # 5. Set-Konsistenz-Validierung
    all_errors.extend(validate_children_sets(redis_tags))
    all_errors.extend(validate_navigation_sets(redis_tags))
    all_errors.extend(validate_sequence_sets(redis_tags))
    
    # 6. Commands-Validierung
    all_errors.extend(validate_json_set_commands(redis_commands, redis_tags))
    all_errors.extend(validate_sadd_commands(redis_commands, redis_tags))
    
    return categorize_errors(all_errors)

def categorize_errors(errors):
    """Kategorisiert Fehler nach Schweregrad"""
    categories = {
        'CRITICAL': [],    # Verhindert Upload
        'ERROR': [],       # Strukturprobleme
        'WARNING': [],     # Potentielle Probleme
        'INFO': []         # Informationen
    }
    
    for error in errors:
        if any(keyword in error for keyword in ['MISSING-PARENT', 'CIRCULAR-REFERENCE', 'KEY-DUPLIKAT']):
            categories['CRITICAL'].append(error)
        elif any(keyword in error for keyword in ['FORMAT', 'HIERARCHY', 'SEQUENCE']):
            categories['ERROR'].append(error)
        elif any(keyword in error for keyword in ['SUSPICIOUS', 'PERFORMANCE']):
            categories['WARNING'].append(error)
        else:
            categories['INFO'].append(error)
    
    return categories
```

## Validierungs-Report-Template

### Standard-Report-Format
```
# Redis-Transformation Validierungs-Report

## Input-Statistiken
📊 **Dokument:** {document_title}
📊 **Redis-Tags:** {total_tags} ({doc_tags} Docs, {content_tags} Chunks, {set_tags} Sets)
📊 **Redis-Commands:** {total_commands} ({json_commands} JSON.SET, {sadd_commands} SADD)
📊 **Original-Text:** {original_length} Zeichen
📊 **Redis-Text:** {redis_length} Zeichen

## Validierungs-Ergebnis

### CRITICAL Errors (Upload-blockierend) 🚨
{critical_errors_count} Fehler gefunden:
{critical_errors_list}

### ERROR (Strukturprobleme) ❌  
{error_count} Fehler gefunden:
{error_list}

### WARNING (Potentielle Probleme) ⚠️
{warning_count} Warnungen:
{warning_list}

### INFO (Informationen) ℹ️
{info_count} Informationen:
{info_list}

## Detailanalyse

### Key-Format-Analyse
✅ Document-Keys: {valid_doc_keys}/{total_doc_keys}
✅ Content-Keys: {valid_content_keys}/{total_content_keys}  
✅ Set-Keys: {valid_set_keys}/{total_set_keys}

### Hierarchie-Analyse
✅ Parent-Child-Beziehungen: {valid_relations}/{total_relations}
✅ Hierarchie-Ebenen: korrekt
✅ Zirkuläre Referenzen: {circular_refs} gefunden

### Sequenz-Analyse
✅ Position-Sequenz: {position_gaps} Lücken
✅ Parent-Sequenzen: {parent_sequence_errors} Fehler
✅ Navigation-Sets: {navigation_errors} Fehler

### Text-Preservation-Analyse  
✅ Globale Text-Länge: {preservation_percentage}% erhalten
✅ Verdächtige Kürzungen: {suspicious_chunks} Chunks
✅ Zusammenfassungen erkannt: {summary_chunks} Chunks

### Set-Konsistenz-Analyse
✅ Children-Sets: {children_errors} Fehler
✅ Sequence-Sets: {sequence_errors} Fehler  
✅ Navigation-Sets: {navigation_errors} Fehler

### Command-Analyse
✅ JSON.SET Vollständigkeit: {json_completeness}%
✅ SADD Vollständigkeit: {sadd_completeness}%
✅ JSON-Syntax: {json_syntax_errors} Fehler

## Upload-Empfehlung

{upload_recommendation}

### Nächste Schritte
{next_steps}
```

## Anweisungen für Claude/Cursor

### 1. Input-Verarbeitung
```
Erwarte Redis-Tags + Redis-Commands als Input.
Führe systematische Validierung aller Kategorien durch.
Sammle alle Fehler mit spezifischen Details.
```

### 2. Fehler-Kategorisierung
```
Unterscheide zwischen CRITICAL, ERROR, WARNING, INFO.
CRITICAL = Upload unmöglich
ERROR = Strukturprobleme, die behoben werden müssen
WARNING = Potentielle Probleme zur Überprüfung
INFO = Informative Statistiken
```

### 3. Report-Generierung
```
Verwende Standard-Report-Template.
Füge konkrete Zahlen und Beispiele hinzu.
Gib klare Upload-Empfehlung (GO/NO-GO).
Liste spezifische Reparatur-Schritte auf.
```

### 4. Qualitätssicherung
```
Jeder gefundene Fehler MUSS konkreten Key/Bereich referenzieren.
Jede Empfehlung MUSS umsetzbare Schritte enthalten.
Report MUSS für Non-Technical-User verständlich sein.
```

## Häufige Probleme und Lösungen

### Problem: Fehlende Parent-Referenzen
```
❌ Symptom: MISSING-PARENT: chunk:diversifikation:001 (level=chunk)
✅ Lösung: Chunk-Tag um parent-Feld ergänzen:
{RedisChunk: key=chunk:diversifikation:001 ; parent=subpara:portfolio_balance:001 ; ...}
```

### Problem: Position-Lücken
```
❌ Symptom: POSITION-GAPS: Erwartet [1,2,3,4,5], gefunden [1,2,4,5]
✅ Lösung: Position 3 dem entsprechenden Element zuweisen
```

### Problem: Text-Kürzung
```
❌ Symptom: SUMMARY-DETECTED: chunk:diversifikation:001
✅ Lösung: Vollständigen Originaltext ohne Zusammenfassung verwenden
```

### Problem: Set-Inkonsistenz
```
❌ Symptom: CHILDREN-MISSING: ch:risk_mgmt:001:children → [para:volatility:001]
✅ Lösung: Fehlende Children zu Set hinzufügen:
{RedisSet: key=ch:risk_mgmt:001:children ; members=[para:portfolio:001, para:volatility:001]}
```