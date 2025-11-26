# Mandatory Checks für Redis-Upload

## Übersicht

Diese Pflicht-Validierungen **MÜSSEN** vor jedem Redis-Upload durchgeführt werden. Ein Upload ist nur zulässig, wenn **ALLE** Mandatory Checks erfolgreich bestanden werden.

## Check-Kategorien

### 🔴 BLOCKER (Upload unmöglich)
- Strukturelle Inkonsistenzen die Redis-Fehler verursachen
- Fehlende kritische Daten
- Ungültige Key-Formate

### 🟡 ERROR (Upload möglich, aber problematisch)  
- Hierarchie-Probleme
- Text-Preservation-Verletzungen
- Performance-Risiken

### 🔵 WARNING (Upload OK, Verbesserung empfohlen)
- Optimierungsempfehlungen
- Style-Probleme
- Performance-Hinweise

## BLOCKER-Checks (Kategorie 1)

### B001: Redis-Key-Format-Validierung
```python
def check_B001_redis_key_format(redis_tags):
    """BLOCKER: Ungültige Redis-Key-Formate verhindern Upload"""
    
    errors = []
    key_patterns = {
        'document': r'^doc:[a-z][a-z0-9_]{1,29}:[0-9]{3}$',
        'chapter': r'^ch:[a-z][a-z0-9_]{1,29}:[0-9]{3}$',
        'paragraph': r'^para:[a-z][a-z0-9_]{1,29}:[0-9]{3}$',
        'subparagraph': r'^subpara:[a-z][a-z0-9_]{1,29}:[0-9]{3}$',
        'chunk': r'^chunk:[a-z][a-z0-9_]{1,29}:[0-9]{3}$'
    }
    
    for tag in redis_tags:
        key = extract_key_from_tag(tag)
        level = extract_level_from_tag(tag) if 'level' in tag else None
        
        # Key-Format prüfen
        if level and level in key_patterns:
            if not re.match(key_patterns[level], key):
                errors.append({
                    'code': 'B001',
                    'type': 'BLOCKER',
                    'message': f'Ungültiges {level.upper()}-Key-Format: {key}',
                    'expected': key_patterns[level],
                    'fix': f'Key muss Pattern {key_patterns[level]} entsprechen'
                })
        
        # Set-Key-Format prüfen - NUR :children erlaubt (nicht :chapters etc.)
        if key.endswith((':children', ':sequence', ':next', ':previous', ':siblings')):
            if not re.match(r'^[a-z][a-z0-9_:]{1,50}:(children|sequence|next|previous|siblings)$', key):
                errors.append({
                    'code': 'B001',
                    'type': 'BLOCKER', 
                    'message': f'Ungültiges Set-Key-Format: {key}',
                    'fix': 'Set-Key-Format korrigieren'
                })
        
        # SPEZIALCHECK: Verbiete :chapters oder andere falsche Set-Namen
        if ':chapters' in key or ':paragraphs' in key or ':chunks' in key:
            errors.append({
                'code': 'B001',
                'type': 'BLOCKER',
                'message': f'Falscher Set-Name: {key} - IMMER :children verwenden!',
                'fix': 'Ersetze durch :children'
            })
    
    return errors

# ERGEBNIS: BLOCKER wenn errors > 0
```

### B002: Key-Eindeutigkeit-Prüfung
```python
def check_B002_key_uniqueness(redis_tags):
    """BLOCKER: Doppelte Redis-Keys verhindern Upload"""
    
    errors = []
    seen_keys = {}
    
    for tag in redis_tags:
        key = extract_key_from_tag(tag)
        
        if key in seen_keys:
            errors.append({
                'code': 'B002',
                'type': 'BLOCKER',
                'message': f'Doppelter Redis-Key: {key}',
                'locations': [seen_keys[key], extract_tag_location(tag)],
                'fix': 'Eindeutige Keys für alle Elemente generieren (001, 002, 003...)'
            })
        else:
            seen_keys[key] = extract_tag_location(tag)
    
    return errors

# ERGEBNIS: BLOCKER wenn errors > 0
```

### B003: Parent-Referenz-Integrität
```python
def check_B003_parent_integrity(redis_tags):
    """BLOCKER: Fehlende oder ungültige Parent-Referenzen"""
    
    errors = []
    all_keys = {extract_key_from_tag(tag) for tag in redis_tags}
    
    for tag in redis_tags:
        key = extract_key_from_tag(tag)
        parent = extract_parent_from_tag(tag)
        level = extract_level_from_tag(tag)
        
        # Document-Level darf keinen Parent haben
        if level == 'document' and parent:
            errors.append({
                'code': 'B003',
                'type': 'BLOCKER',
                'message': f'Document-Level darf keinen Parent haben: {key}',
                'fix': 'Parent-Feld für Document entfernen'
            })
        
        # Alle anderen Level müssen Parent haben
        elif level != 'document' and not parent:
            errors.append({
                'code': 'B003',
                'type': 'BLOCKER',
                'message': f'Fehlende Parent-Referenz: {key} (level={level})',
                'fix': 'Parent-Feld hinzufügen'
            })
        
        # Parent muss existieren
        elif parent and parent not in all_keys:
            errors.append({
                'code': 'B003',
                'type': 'BLOCKER',
                'message': f'Parent nicht gefunden: {key} → {parent}',
                'fix': f'Parent {parent} muss als Redis-Tag existieren'
            })
    
    return errors

# ERGEBNIS: BLOCKER wenn errors > 0
```

### B004: JSON-Syntax-Validierung
```python
def check_B004_json_syntax(redis_commands):
    """BLOCKER: Ungültige JSON-Syntax in Commands"""
    
    errors = []
    json_commands = [cmd for cmd in redis_commands if cmd.startswith('JSON.SET')]
    
    for cmd in json_commands:
        try:
            # JSON-Teil extrahieren (zwischen letzten Anführungszeichen)
            json_start = cmd.rfind("'") - 1
            json_part = cmd[cmd.find("'", json_start) + 1:cmd.rfind("'")]
            
            # JSON-Validierung
            json.loads(json_part)
            
        except (json.JSONDecodeError, ValueError) as e:
            key = extract_key_from_json_command(cmd)
            errors.append({
                'code': 'B004',
                'type': 'BLOCKER',
                'message': f'Ungültige JSON-Syntax in Command für {key}: {str(e)}',
                'command': cmd[:100] + '...' if len(cmd) > 100 else cmd,
                'fix': 'JSON-Syntax korrigieren'
            })
    
    return errors

# ERGEBNIS: BLOCKER wenn errors > 0
```

### B005: Zirkuläre Parent-Referenzen
```python
def check_B005_circular_references(redis_tags):
    """BLOCKER: Zirkuläre Parent-Child-Beziehungen"""
    
    errors = []
    
    # Baue Parent-Child-Graph
    parent_map = {}
    for tag in redis_tags:
        key = extract_key_from_tag(tag)
        parent = extract_parent_from_tag(tag)
        if parent:
            parent_map[key] = parent
    
    # Prüfe jeden Key auf zirkuläre Referenzen
    for key in parent_map:
        visited = set()
        current = key
        
        while current in parent_map:
            if current in visited:
                # Zirkuläre Referenz gefunden
                cycle = list(visited) + [current]
                errors.append({
                    'code': 'B005',
                    'type': 'BLOCKER',
                    'message': f'Zirkuläre Parent-Referenz: {" → ".join(cycle)}',
                    'cycle': cycle,
                    'fix': 'Parent-Child-Beziehungen korrigieren'
                })
                break
            
            visited.add(current)
            current = parent_map[current]
    
    return errors

# ERGEBNIS: BLOCKER wenn errors > 0
```

## ERROR-Checks (Kategorie 2)

### E001: Position-Sequenz-Validierung
```python
def check_E001_position_sequence(redis_tags):
    """ERROR: Lückenhafte oder falsche Position-Sequenzen"""
    
    errors = []
    content_tags = [tag for tag in redis_tags if 'position' in tag]
    
    if not content_tags:
        return errors
    
    # Nach Position sortieren
    sorted_tags = sorted(content_tags, key=lambda t: extract_position_from_tag(t))
    positions = [extract_position_from_tag(tag) for tag in sorted_tags]
    
    # Erwartete Sequenz: 1, 2, 3, ..., N
    expected_positions = list(range(1, len(positions) + 1))
    
    if positions != expected_positions:
        errors.append({
            'code': 'E001',
            'type': 'ERROR',
            'message': f'Position-Sequenz-Fehler: erwartet {expected_positions}, gefunden {positions}',
            'missing': list(set(expected_positions) - set(positions)),
            'duplicates': [p for p in positions if positions.count(p) > 1],
            'fix': 'Positionen neu zuweisen: 1, 2, 3, ...'
        })
    
    return errors

# ERGEBNIS: ERROR wenn errors > 0
```

### E002: Hierarchie-Ebenen-Konsistenz
```python
def check_E002_hierarchy_consistency(redis_tags):
    """ERROR: Inkonsistente Hierarchie-Ebenen"""
    
    errors = []
    level_priority = {
        'document': 0, 'chapter': 1, 'paragraph': 2, 'subparagraph': 3, 'chunk': 4
    }
    
    for tag in redis_tags:
        key = extract_key_from_tag(tag)
        parent_key = extract_parent_from_tag(tag)
        level = extract_level_from_tag(tag)
        
        if parent_key:
            parent_tag = find_tag_by_key(parent_key, redis_tags)
            if parent_tag:
                parent_level = extract_level_from_tag(parent_tag)
                
                # Parent muss höhere Hierarchie haben (niedrigere Zahl)
                if level_priority[parent_level] >= level_priority[level]:
                    errors.append({
                        'code': 'E002',
                        'type': 'ERROR',
                        'message': f'Ungültige Hierarchie: {key}({level}) unter {parent_key}({parent_level})',
                        'fix': f'{level} kann nicht direkt unter {parent_level} stehen'
                    })
    
    return errors

# ERGEBNIS: ERROR wenn errors > 0
```

### E003: Text-Preservation-Validierung
```python
def check_E003_text_preservation(redis_tags, original_markdown):
    """ERROR: Text-Kürzung oder -Verlust erkannt"""
    
    errors = []
    
    # Gesamttext-Längen vergleichen
    original_text = extract_all_text_from_markdown(original_markdown)
    redis_text_total = 0
    
    suspicious_chunks = []
    
    for tag in redis_tags:
        text = extract_text_from_tag(tag)
        if text:
            redis_text_total += len(text)
            
            # Verdächtig kurze Texte (außer Headers)
            if len(text) < 20 and not text.startswith(('#', '##', '###')):
                key = extract_key_from_tag(tag)
                suspicious_chunks.append({
                    'key': key,
                    'length': len(text),
                    'text': text[:50] + '...' if len(text) > 50 else text
                })
            
            # Zusammenfassung-Indikatoren
            if contains_summary_keywords(text):
                key = extract_key_from_tag(tag)
                errors.append({
                    'code': 'E003',
                    'type': 'ERROR',
                    'message': f'Zusammenfassung statt Volltext erkannt: {key}',
                    'indicators': find_summary_keywords(text),
                    'fix': 'Vollständigen Originaltext verwenden'
                })
    
    # Globaler Text-Verlust-Check
    text_preservation_ratio = redis_text_total / len(original_text) if original_text else 0
    
    if text_preservation_ratio < 0.8:  # <80% des Originaltexts
        errors.append({
            'code': 'E003',
            'type': 'ERROR',
            'message': f'Signifikanter Text-Verlust: {text_preservation_ratio*100:.1f}% erhalten',
            'original_chars': len(original_text),
            'redis_chars': redis_text_total,
            'fix': 'Volltext-Preservation sicherstellen'
        })
    
    # Verdächtige Chunks als Warnings
    if suspicious_chunks:
        errors.append({
            'code': 'E003',
            'type': 'WARNING',
            'message': f'{len(suspicious_chunks)} verdächtig kurze Text-Chunks',
            'chunks': suspicious_chunks[:5],  # Erste 5 als Beispiel
            'fix': 'Chunk-Größen überprüfen'
        })
    
    return errors

def contains_summary_keywords(text):
    """Erkennt Zusammenfassung-Indikatoren"""
    keywords = ['zusammenfassung', 'kurz gesagt', 'überblick', 'summary', 'in short', '...']
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in keywords)

# ERGEBNIS: ERROR wenn Zusammenfassungen erkannt; WARNING bei verdächtigen Chunks
```

### E004: Set-Konsistenz-Validierung
```python
def check_E004_set_consistency(redis_tags):
    """ERROR: Inkonsistente Redis-Sets"""
    
    errors = []
    content_tags = get_content_tags(redis_tags)
    set_tags = get_set_tags(redis_tags)
    
    # Erwartete Children-Sets basierend auf Parent-Referenzen
    expected_children = {}
    for tag in content_tags:
        parent = extract_parent_from_tag(tag)
        key = extract_key_from_tag(tag)
        
        if parent:
            if parent not in expected_children:
                expected_children[parent] = []
            expected_children[parent].append(key)
    
    # Validiere Children-Sets
    for parent, expected_members in expected_children.items():
        children_set_key = f"{parent}:children"  # IMMER :children, nie :chapters!
        children_set = find_set_by_key(children_set_key, set_tags)
        
        if not children_set:
            errors.append({
                'code': 'E004',
                'type': 'ERROR',
                'message': f'Fehlendes Children-Set: {children_set_key}',
                'expected_members': expected_members,
                'fix': f'Set {children_set_key} mit Members {expected_members} erstellen'
            })
        else:
            actual_members = extract_members_from_set(children_set)
            
            missing = set(expected_members) - set(actual_members)
            extra = set(actual_members) - set(expected_members)
            
            if missing:
                errors.append({
                    'code': 'E004',
                    'type': 'ERROR',
                    'message': f'Children-Set unvollständig: {children_set_key}',
                    'missing_members': list(missing),
                    'fix': f'Members hinzufügen: {list(missing)}'
                })
            
            if extra:
                errors.append({
                    'code': 'E004',
                    'type': 'WARNING',
                    'message': f'Children-Set hat Extra-Members: {children_set_key}',
                    'extra_members': list(extra),
                    'fix': f'Überflüssige Members entfernen: {list(extra)}'
                })
    
    return errors

# ERGEBNIS: ERROR bei fehlenden/unvollständigen Sets; WARNING bei Extra-Members
```

### E005: sequence_in_parent-Validierung (NEU)
```python
def check_E005_sequence_in_parent(redis_tags):
    """ERROR: Fehlende oder falsche sequence_in_parent Werte"""
    
    errors = []
    
    # Gruppiere Kinder nach Parent
    parent_children = {}
    for tag in redis_tags:
        parent = extract_parent_from_tag(tag)
        key = extract_key_from_tag(tag)
        seq = extract_sequence_in_parent_from_tag(tag)
        
        if parent:  # Hat einen Parent
            if not seq:
                errors.append({
                    'code': 'E005',
                    'type': 'ERROR',
                    'message': f'Fehlende sequence_in_parent: {key}',
                    'fix': 'sequence_in_parent Feld hinzufügen'
                })
            else:
                if parent not in parent_children:
                    parent_children[parent] = []
                parent_children[parent].append((seq, key))
    
    # Validiere Sequenzen pro Parent
    for parent, children in parent_children.items():
        sequences = sorted([seq for seq, key in children])
        expected = list(range(1, len(sequences) + 1))
        
        if sequences != expected:
            child_keys = [key for seq, key in sorted(children)]
            errors.append({
                'code': 'E005',
                'type': 'ERROR',
                'message': f'sequence_in_parent Lücken bei {parent}',
                'expected': expected,
                'found': sequences,
                'children': child_keys,
                'fix': 'sequence_in_parent neu zuweisen: 1, 2, 3...'
            })
    
    return errors

# ERGEBNIS: ERROR bei fehlenden oder lückenhaften sequence_in_parent
```

### E006: Children-Array-Validierung (V2)
```python
def check_E006_children_array_presence(redis_tags):
    """ERROR: Fehlendes children-Array in Tags (V2 Architecture)"""
    
    errors = []
    parent_levels = ['document', 'chapter', 'paragraph', 'subparagraph']
    
    for tag in redis_tags:
        level = extract_level_from_tag(tag)
        
        # Alle Parent-Levels (und sogar Chunks in V2) sollten children haben
        if 'children' not in tag:
             errors.append({
                'code': 'E006',
                'type': 'ERROR',
                'message': f'Fehlendes children-Array bei {extract_key_from_tag(tag)}',
                'fix': 'Feld children=[...] hinzufügen (V2 Architecture Requirement)'
            })
            
    return errors

# ERGEBNIS: ERROR wenn children-Feld fehlt
```

## WARNING-Checks (Kategorie 3)

### W001: Performance-Optimierung
```python
def check_W001_performance_optimization(redis_tags):
    """WARNING: Performance-Verbesserungen möglich"""
    
    warnings = []
    
    # Chunk-Größen-Analyse
    chunk_sizes = []
    for tag in redis_tags:
        if extract_level_from_tag(tag) == 'chunk':
            text = extract_text_from_tag(tag)
            if text:
                chunk_sizes.append(len(text))
    
    if chunk_sizes:
        avg_chunk_size = sum(chunk_sizes) / len(chunk_sizes)
        max_chunk_size = max(chunk_sizes)
        
        # Chunks > 2000 Zeichen (angepasst von 5000)
        if max_chunk_size > 2000:
            warnings.append({
                'code': 'W001',
                'type': 'WARNING',
                'message': f'Große Chunks erkannt (max: {max_chunk_size} Zeichen)',
                'recommendation': 'Chunks >2000 Zeichen aufteilen für bessere RAG-Performance',
                'benefit': 'Verbesserte Embedding-Qualität und Suchergebnisse'
            })
        
        # Sehr kleine Chunks
        elif avg_chunk_size < 100:
            warnings.append({
                'code': 'W001',
                'type': 'WARNING',
                'message': f'Sehr kleine Chunks (avg: {avg_chunk_size:.0f} Zeichen)',
                'recommendation': 'Kleine Chunks zusammenführen für besseren Kontext',
                'benefit': 'Reduzierte Fragmentierung, besserer semantischer Kontext'
            })
    
    # Key-Längen-Analyse
    long_keys = []
    for tag in redis_tags:
        key = extract_key_from_tag(tag)
        if len(key) > 50:
            long_keys.append(key)
    
    if long_keys:
        warnings.append({
            'code': 'W001',
            'type': 'WARNING',
            'message': f'{len(long_keys)} sehr lange Redis-Keys',
            'examples': long_keys[:3],
            'recommendation': 'Keys kürzen für bessere Redis-Performance',
            'benefit': 'Reduzierter Memory-Verbrauch, schnellere Key-Operationen'
        })
    
    return warnings

# ERGEBNIS: WARNING mit Optimierungsempfehlungen
```

### W002: Best-Practice-Violations
```python
def check_W002_best_practices(redis_tags):
    """WARNING: Best-Practice-Verletzungen"""
    
    warnings = []
    
    # Leere oder sehr kurze Titel
    short_titles = []
    for tag in redis_tags:
        title = extract_title_from_tag(tag)
        level = extract_level_from_tag(tag)
        
        if title and level in ['chapter', 'paragraph', 'subparagraph']:
            if len(title) < 10:
                short_titles.append({
                    'key': extract_key_from_tag(tag),
                    'title': title,
                    'level': level
                })
    
    if short_titles:
        warnings.append({
            'code': 'W002',
            'type': 'WARNING',
            'message': f'{len(short_titles)} sehr kurze Titel gefunden',
            'examples': short_titles[:3],
            'recommendation': 'Aussagekräftigere Titel für bessere Navigation',
            'benefit': 'Verbesserte Benutzerfreundlichkeit und Kontext-Verständnis'
        })
    
    # Zu tiefe Hierarchie-Verschachtelung
    max_depth = calculate_max_hierarchy_depth(redis_tags)
    if max_depth > 5:
        warnings.append({
            'code': 'W002',
            'type': 'WARNING',
            'message': f'Sehr tiefe Hierarchie-Verschachtelung: {max_depth} Ebenen',
            'recommendation': 'Hierarchie flacher strukturieren',
            'benefit': 'Einfachere Navigation, bessere Performance'
        })
    
    # Falsche Set-Namen (chapters statt children)
    wrong_set_names = []
    for tag in redis_tags:
        key = extract_key_from_tag(tag)
        if ':chapters' in key or ':paragraphs' in key:
            wrong_set_names.append(key)
    
    if wrong_set_names:
        warnings.append({
            'code': 'W002',
            'type': 'WARNING',
            'message': f'Falsche Set-Namen gefunden (sollte :children sein)',
            'wrong_names': wrong_set_names,
            'recommendation': 'IMMER :children verwenden, nie :chapters etc.',
            'benefit': 'Konsistenz mit Repository-Standards'
        })
    
    return warnings

# ERGEBNIS: WARNING mit Best-Practice-Empfehlungen
```

## Vollständiger Mandatory-Check-Runner

### Haupt-Validierungs-Funktion
```python
def run_mandatory_checks(redis_tags, redis_commands, original_markdown):
    """Führt alle Mandatory Checks durch und kategorisiert Ergebnisse"""
    
    results = {
        'blockers': [],
        'errors': [],
        'warnings': [],
        'summary': {
            'total_checks': 12,  # Erhöht von 11 auf 12
            'blocker_count': 0,
            'error_count': 0,
            'warning_count': 0,
            'upload_allowed': False
        }
    }
    
    # BLOCKER-Checks (Upload-kritisch)
    blocker_checks = [
        check_B001_redis_key_format,
        check_B002_key_uniqueness,
        check_B003_parent_integrity,
        check_B004_json_syntax,
        check_B005_circular_references
    ]
    
    for check_func in blocker_checks:
        if check_func.__name__.endswith('_json_syntax'):
            check_results = check_func(redis_commands)
        else:
            check_results = check_func(redis_tags)
        
        blockers = [r for r in check_results if r.get('type') == 'BLOCKER']
        results['blockers'].extend(blockers)
    
    # ERROR-Checks (Strukturprobleme)
    error_checks = [
        check_E001_position_sequence,
        check_E002_hierarchy_consistency,
        lambda tags: check_E003_text_preservation(tags, original_markdown),
        check_E004_set_consistency,
        check_E005_sequence_in_parent,  # NEU
        check_E006_children_array_presence # NEU (V2)
    ]
    
    for check_func in error_checks:
        check_results = check_func(redis_tags)
        errors = [r for r in check_results if r.get('type') == 'ERROR']
        warnings = [r for r in check_results if r.get('type') == 'WARNING']
        
        results['errors'].extend(errors)
        results['warnings'].extend(warnings)
    
    # WARNING-Checks (Optimierungen)
    warning_checks = [
        check_W001_performance_optimization,
        check_W002_best_practices
    ]
    
    for check_func in warning_checks:
        check_results = check_func(redis_tags)
        warnings = [r for r in check_results if r.get('type') == 'WARNING']
        results['warnings'].extend(warnings)
    
    # Summary erstellen
    results['summary'].update({
        'blocker_count': len(results['blockers']),
        'error_count': len(results['errors']),
        'warning_count': len(results['warnings']),
        'upload_allowed': len(results['blockers']) == 0  # Nur bei 0 BLOCKERs
    })
    
    return results

def generate_mandatory_check_report(check_results):
    """Generiert benutzerfreundlichen Mandatory-Check-Report"""
    
    summary = check_results['summary']
    
    report = f"""
# Mandatory Checks Report

## 🎯 Upload-Status: {"✅ ERLAUBT" if summary['upload_allowed'] else "🚫 BLOCKIERT"}

### Zusammenfassung
- **Blocker:** {summary['blocker_count']} (Upload-kritisch)
- **Errors:** {summary['error_count']} (Strukturprobleme)  
- **Warnings:** {summary['warning_count']} (Optimierungen)

"""
    
    # BLOCKER-Sektion
    if check_results['blockers']:
        report += """
## 🚨 BLOCKER (Upload unmöglich)

Diese Probleme **MÜSSEN** behoben werden vor Upload:

"""
        for blocker in check_results['blockers']:
            report += f"""
### {blocker['code']}: {blocker['message']}
**Fix:** {blocker['fix']}

"""
    
    # ERROR-Sektion
    if check_results['errors']:
        report += """
## ❌ ERRORS (Strukturprobleme)

Diese Probleme sollten behoben werden:

"""
        for error in check_results['errors']:
            report += f"""
### {error['code']}: {error['message']}
**Fix:** {error['fix']}

"""
    
    # WARNING-Sektion
    if check_results['warnings']:
        report += """
## ⚠️ WARNINGS (Optimierungsempfehlungen)

"""
        for warning in check_results['warnings']:
            report += f"""
### {warning['code']}: {warning['message']}
**Empfehlung:** {warning.get('recommendation', warning.get('fix', 'Siehe Details'))}

"""
    
    # Upload-Anweisungen
    if summary['upload_allowed']:
        report += """
## ✅ Nächste Schritte

Upload ist erlaubt. Empfohlenes Vorgehen:

1. **Warnings überprüfen** (optional aber empfohlen)
2. **Redis-Commands ausführen** (JSON.SET zuerst, dann SADD)
3. **Upload-Erfolg validieren** mit `JSON.GET doc:...:001`

"""
    else:
        report += """
## 🚫 Upload blockiert

**Alle BLOCKER müssen behoben werden vor Upload.**

### Empfohlenes Vorgehen:
1. BLOCKER-Probleme beheben (siehe oben)
2. Transformation erneut durchführen  
3. Mandatory Checks wiederholen
4. Bei grünem Status: Upload durchführen

"""
    
    return report

# ERGEBNIS: Vollständiger Report mit Upload-Freigabe oder -Blockierung
```

## Integration in Workflow

### Claude/Cursor-Anweisungen
```
## MANDATORY CHECKS - IMMER DURCHFÜHREN

Nach jeder Redis-Transformation:

1. **Automatisch ausführen:**
   ```
   check_result = run_mandatory_checks(redis_tags, redis_commands, original_markdown)
   ```

2. **Report generieren:**
   ```
   report = generate_mandatory_check_report(check_result)
   ```

3. **Upload-Entscheidung:**
   ```
   if check_result['summary']['upload_allowed']:
       # Grünes Licht für Upload
       print("✅ UPLOAD ERLAUBT")
       print("Redis-Commands können ausgeführt werden")
   else:
       # Upload blockiert
       print("🚫 UPLOAD BLOCKIERT") 
       print("BLOCKERs müssen behoben werden")
   ```

4. **Niemals Upload ohne grünes Licht**
```