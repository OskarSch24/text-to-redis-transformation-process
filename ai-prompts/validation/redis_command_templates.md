# Redis Command Templates für Upload

## Übersicht

Standardisierte Redis-Command-Templates für verschiedene Upload-Szenarien. Diese Templates stellen sicher, dass alle Redis-Uploads konsistent und effizient durchgeführt werden.

## Basis-Commands

### JSON.SET Template für Documents
```redis
JSON.SET {doc_key} $ '{
  "title": "{title}",
  "author": "{author}", 
  "created": "{created_date}",
  "total_chunks": {chunk_count},
  "category": "{category}",
  "language": "{language}",
  "tags": {tags_array},
  "children": {children_key_array}
}'
```

**Beispiel:**
```redis
JSON.SET doc:portfolio_strategies:001 $ '{
  "title": "Portfolio Management Strategies",
  "author": "Oskar Sch.",
  "created": "2024-12-27",
  "total_chunks": 47,
  "category": "investment", 
  "language": "de",
  "tags": ["finance", "risk", "portfolio"],
  "children": ["ch:risk_management:001", "ch:implementation:002"]
}'
```

### JSON.SET Template für Content-Chunks
```redis
JSON.SET {chunk_key} $ '{
  "parent": "{parent_key}",
  "text": "{escaped_full_text}",
  "level": "{hierarchy_level}",
  "position": {document_position},
  "children": {children_key_array},
**Beispiel Chunk:**
```redis
JSON.SET chunk:diversifikation_grundstein:001 $ '{
  "parent": "subpara:portfolio_balance:001",
  "text": "Diversifikation ist der Grundstein erfolgreicher Investments und reduziert systematisch das Portfoliorisiko.",
  "level": "chunk", 
  "position": 15,
  "sequence_in_parent": 3,
  "children": [],
  "context_title": "Portfolio Balance",
  "context_chapter": "Risk Management",
  "context_document": "Portfolio Management Strategies"
}'
```

### SADD Templates für Sets

#### Children-Sets
```redis
SADD {parent_key}:children {child_key1} {child_key2} {child_key3}
```

**Beispiele:**
```redis
SADD doc:portfolio_strategies:001:children ch:risk_management:001 ch:implementation:002 ch:advanced_topics:003

SADD ch:risk_management:001:children para:portfolio_theory:001 para:diversification:002 para:risk_metrics:003

SADD para:portfolio_theory:001:children subpara:modern_theory:001 chunk:theory_summary:001

SADD subpara:modern_theory:001:children chunk:markowitz_theory:001 chunk:efficient_frontier:002 chunk:capital_allocation:003
```

#### Sequence-Sets (Lese-Reihenfolge)
```redis
SADD {scope_key}:sequence {element1} {element2} {element3} ...
```

**Beispiele:**
```redis
# Document-weite Sequenz (alle Elemente)
SADD doc:portfolio_strategies:001:sequence doc:portfolio_strategies:001 ch:risk_management:001 para:portfolio_theory:001 subpara:modern_theory:001 chunk:markowitz_theory:001 chunk:efficient_frontier:002

# Chapter-interne Sequenz  
SADD ch:risk_management:001:sequence para:portfolio_theory:001 subpara:modern_theory:001 chunk:markowitz_theory:001 chunk:efficient_frontier:002 para:diversification:002

# Paragraph-interne Sequenz
SADD para:portfolio_theory:001:sequence subpara:modern_theory:001 chunk:markowitz_theory:001 chunk:efficient_frontier:002 chunk:theory_summary:001
```

#### Navigation-Sets (Previous/Next)
```redis
SADD {element_key}:previous {previous_element}
SADD {element_key}:next {next_element}
```

**Beispiele:**
```redis
# Previous-Navigation
SADD ch:risk_management:001:previous doc:portfolio_strategies:001
SADD para:portfolio_theory:001:previous ch:risk_management:001
SADD chunk:markowitz_theory:001:previous subpara:modern_theory:001

# Next-Navigation  
SADD doc:portfolio_strategies:001:next ch:risk_management:001
SADD ch:risk_management:001:next para:portfolio_theory:001
SADD subpara:modern_theory:001:next chunk:markowitz_theory:001
```

## Batch-Upload-Templates

### Kleine Dokumente (< 100 Chunks)
```redis
# Einfache Transaction für komplettes Dokument
MULTI

# Alle JSON.SET Commands
JSON.SET doc:example:001 $ '{...}'
JSON.SET ch:chapter1:001 $ '{...}'
JSON.SET para:paragraph1:001 $ '{...}'
JSON.SET chunk:content1:001 $ '{...}'

# Alle SADD Commands
SADD doc:example:001:children ch:chapter1:001
SADD ch:chapter1:001:children para:paragraph1:001
SADD para:paragraph1:001:children chunk:content1:001
SADD doc:example:001:sequence doc:example:001 ch:chapter1:001 para:paragraph1:001 chunk:content1:001

EXEC
```

### Mittlere Dokumente (100-500 Chunks)
```redis
# Batch 1: Document + Struktur
MULTI
JSON.SET doc:large_doc:001 $ '{...}'
JSON.SET ch:chapter1:001 $ '{...}'
JSON.SET ch:chapter2:001 $ '{...}'
JSON.SET para:para1:001 $ '{...}'
JSON.SET para:para2:001 $ '{...}'
EXEC

# Batch 2: Content-Chunks (50 pro Batch)
MULTI  
JSON.SET chunk:content1:001 $ '{...}'
JSON.SET chunk:content2:002 $ '{...}'
# ... weitere 48 Chunks
EXEC

# Batch 3: Children-Sets
MULTI
SADD doc:large_doc:001:children ch:chapter1:001 ch:chapter2:001
SADD ch:chapter1:001:children para:para1:001
SADD ch:chapter2:001:children para:para2:001
SADD para:para1:001:children chunk:content1:001 chunk:content2:002
EXEC

# Batch 4: Sequence + Navigation-Sets
MULTI
SADD doc:large_doc:001:sequence doc:large_doc:001 ch:chapter1:001 para:para1:001
SADD ch:chapter1:001:previous doc:large_doc:001
SADD para:para1:001:previous ch:chapter1:001
EXEC
```

### Große Dokumente (500+ Chunks)
```redis
# Streaming-Upload-Pattern für sehr große Dokumente

# Phase 1: Document-Metadaten
JSON.SET doc:huge_doc:001 $ '{
  "title": "Very Large Document",
  "total_chunks": 1247,
  "upload_status": "in_progress"
}'

# Phase 2: Strukturelle Elemente (Chapters/Paragraphs) in Batches
MULTI
JSON.SET ch:chapter1:001 $ '{...}'
JSON.SET ch:chapter2:001 $ '{...}'
# ... max 25 pro Batch
EXEC

# Phase 3: Content-Chunks in kleinen Batches (25 pro Batch)
MULTI
JSON.SET chunk:content1:001 $ '{...}'
JSON.SET chunk:content2:002 $ '{...}'
# ... max 25 Chunks
EXEC

# Phase 4: Sets nach Abschluss aller JSON.SET Commands
MULTI
SADD doc:huge_doc:001:children ch:chapter1:001 ch:chapter2:001
# ... weitere Children-Sets
EXEC

# Phase 5: Upload-Status finalisieren
JSON.SET doc:huge_doc:001 $.upload_status '"completed"'
```

## JSON-Escaping-Regeln

### Text-Content Escaping
```python
def escape_json_text(text):
    """Escaped Text für JSON.SET Commands"""
    
    # Basis-Escaping für JSON-Kompatibilität
    escaped = text.replace('\\', '\\\\')  # Backslashes
    escaped = escaped.replace('"', '\\"')  # Doppelte Anführungszeichen
    escaped = escaped.replace('\n', '\\n')  # Zeilenwechsel
    escaped = escaped.replace('\r', '\\r')  # Carriage Return
    escaped = escaped.replace('\t', '\\t')  # Tabs
    
    return escaped

# Beispiel-Anwendung:
original_text = '''# Portfolio Theory

Diversifikation ist "wichtig" für ein ausgewogenes Portfolio.

Moderne Portfoliotheorie zeigt:
- Risikoreduktion durch Korrelation
- Optimale Asset-Allokation'''

escaped_text = escape_json_text(original_text)
# Result: "# Portfolio Theory\\n\\nDiversifikation ist \\"wichtig\\" für ein ausgewogenes Portfolio.\\n\\nModerne Portfoliotheorie zeigt:\\n- Risikoreduktion durch Korrelation\\n- Optimale Asset-Allokation"
```

### Redis-Key Escaping (falls nötig)
```python
def escape_redis_key(key):
    """Escaping für Redis-Keys in Commands (normalerweise nicht nötig)"""
    
    # Redis-Keys sollten bereits valide sein, aber Sicherheitscheck
    if ' ' in key or '"' in key or "'" in key:
        raise ValueError(f"Invalid Redis key: {key}")
    
    return key
```

## Command-Generierung-Templates

### Template-Klasse für automatische Generierung
```python
class RedisCommandGenerator:
    """Generiert Redis-Commands aus Redis-Tags"""
    
    def __init__(self):
        self.commands = []
    
    def add_document(self, doc_tag):
        """Fügt JSON.SET Command für Document hinzu"""
        
        key = doc_tag['key']
        json_data = {
            'title': doc_tag['title'],
            'author': doc_tag['author'],
            'created': doc_tag['created'],
            'total_chunks': doc_tag['total_chunks']
        }
        
        # Optionale Felder
        if 'category' in doc_tag:
            json_data['category'] = doc_tag['category']
        if 'language' in doc_tag:
            json_data['language'] = doc_tag['language']
        if 'tags' in doc_tag:
            json_data['tags'] = doc_tag['tags']
        
        json_str = json.dumps(json_data, ensure_ascii=False)
        command = f"JSON.SET {key} $ '{json_str}'"
        self.commands.append(command)
    
    def add_chunk(self, chunk_tag):
        """Fügt JSON.SET Command für Content-Chunk hinzu"""
        
        key = chunk_tag['key']
        json_data = {
            'text': chunk_tag['text'],
            'level': chunk_tag['level'], 
            'position': chunk_tag['position']
        }
        
        # Pflicht-Parent (außer Document)
        if 'parent' in chunk_tag:
            json_data['parent'] = chunk_tag['parent']
        
        # Optionale Felder
        optional_fields = ['sequence_in_parent', 'title', 'context_title', 
                          'context_chapter', 'context_document']
        
        for field in optional_fields:
            if field in chunk_tag:
                json_data[field] = chunk_tag[field]
        
        json_str = json.dumps(json_data, ensure_ascii=False)
        command = f"JSON.SET {key} $ '{json_str}'"
        self.commands.append(command)
    
    def add_set(self, set_tag):
        """Fügt SADD Command für Redis-Set hinzu"""
        
        key = set_tag['key']
        members = set_tag['members']
        
        if members:
            members_str = ' '.join(members)
            command = f"SADD {key} {members_str}"
            self.commands.append(command)
    
    def generate_batch_commands(self, batch_size=100):
        """Generiert Commands in Batches mit MULTI/EXEC"""
        
        if not self.commands:
            return []
        
        batches = []
        for i in range(0, len(self.commands), batch_size):
            batch = self.commands[i:i + batch_size]
            
            batch_commands = ['MULTI']
            batch_commands.extend(batch)
            batch_commands.append('EXEC')
            
            batches.append(batch_commands)
        
        return batches
    
    def generate_all_commands(self):
        """Gibt alle Commands als einzelne Liste zurück"""
        return self.commands.copy()
```

### Verwendung der Template-Klasse
```python
# Beispiel-Verwendung
generator = RedisCommandGenerator()

# Document hinzufügen
doc_tag = {
    'key': 'doc:portfolio_strategies:001',
    'title': 'Portfolio Management Strategies',
    'author': 'Oskar Sch.',
    'created': '2024-12-27',
    'total_chunks': 47,
    'category': 'investment'
}
generator.add_document(doc_tag)

# Chunks hinzufügen
chunk_tag = {
    'key': 'ch:risk_management:001',
    'parent': 'doc:portfolio_strategies:001',
    'text': '# Risk Management\\n\\nDiversifikation ist wichtig...',
    'level': 'chapter',
    'position': 1,
    'title': 'Risk Management'
}
generator.add_chunk(chunk_tag)

# Set hinzufügen
set_tag = {
    'key': 'doc:portfolio_strategies:001:children',
    'members': ['ch:risk_management:001', 'ch:implementation:002']
}
generator.add_set(set_tag)

# Commands generieren
all_commands = generator.generate_all_commands()
batch_commands = generator.generate_batch_commands(batch_size=50)
```

## Upload-Reihenfolge-Templates

### Optimale Command-Reihenfolge
```redis
# PHASE 1: Alle JSON.SET Commands (erst Struktur, dann Content)
# 1.1 Document
JSON.SET doc:example:001 $ '{...}'

# 1.2 Strukturelle Elemente (nach Hierarchie-Ebene)
JSON.SET ch:chapter1:001 $ '{...}'
JSON.SET ch:chapter2:001 $ '{...}'
JSON.SET para:para1:001 $ '{...}'
JSON.SET para:para2:001 $ '{...}'
JSON.SET subpara:subpara1:001 $ '{...}'

# 1.3 Content-Chunks (nach Position)
JSON.SET chunk:content1:001 $ '{...}'
JSON.SET chunk:content2:002 $ '{...}'
JSON.SET chunk:content3:003 $ '{...}'

# PHASE 2: Alle SADD Commands (nach Set-Typ)
# 2.1 Children-Sets (von oben nach unten)
SADD doc:example:001:children ch:chapter1:001 ch:chapter2:001
SADD ch:chapter1:001:children para:para1:001
SADD para:para1:001:children subpara:subpara1:001 chunk:content1:001

# 2.2 Sequence-Sets
SADD doc:example:001:sequence doc:example:001 ch:chapter1:001 para:para1:001 chunk:content1:001

# 2.3 Navigation-Sets (Previous/Next)
SADD ch:chapter1:001:previous doc:example:001
SADD ch:chapter1:001:next para:para1:001
SADD para:para1:001:previous ch:chapter1:001
```

### Fehlertolerante Upload-Reihenfolge
```redis
# Strategie: Einzelne Commands ohne Transaction für Debugging

# Schritt 1: Document (kritisch - muss funktionieren)
JSON.SET doc:example:001 $ '{...}'

# Schritt 2: Top-Level-Struktur (ein Command pro Element)
JSON.SET ch:chapter1:001 $ '{...}'
JSON.SET ch:chapter2:001 $ '{...}'

# Schritt 3: Unterstruktur (kann teilweise fehlschlagen)
JSON.SET para:para1:001 $ '{...}'
JSON.SET para:para2:001 $ '{...}'

# Schritt 4: Content (einzeln, für granulare Fehlerbehandlung)
JSON.SET chunk:content1:001 $ '{...}'
JSON.SET chunk:content2:002 $ '{...}'

# Schritt 5: Basis-Sets (erst die wichtigsten)
SADD doc:example:001:children ch:chapter1:001 ch:chapter2:001

# Schritt 6: Erweiterte Sets (optional)
SADD doc:example:001:sequence doc:example:001 ch:chapter1:001
SADD ch:chapter1:001:next para:para1:001
```

## Debugging-Commands

### Upload-Validation-Commands
```redis
# Prüfe ob Document existiert
JSON.GET doc:portfolio_strategies:001

# Prüfe ob alle Children-Sets korrekt sind
SMEMBERS doc:portfolio_strategies:001:children

# Prüfe Sequence-Set
SMEMBERS doc:portfolio_strategies:001:sequence

# Zähle alle Keys mit bestimmtem Prefix
EVAL "return #redis.call('keys', ARGV[1])" 0 "doc:portfolio_strategies:*"

# Prüfe spezifischen Chunk
JSON.GET chunk:diversifikation_grundstein:001

# Liste alle Set-Keys
EVAL "return redis.call('keys', '*:children')" 0
EVAL "return redis.call('keys', '*:sequence')" 0
EVAL "return redis.call('keys', '*:next')" 0
```

### Cleanup-Commands (bei Fehlern)
```redis
# Lösche komplettes Dokument und alle zugehörigen Keys
EVAL "
local keys = redis.call('keys', ARGV[1])
for i=1,#keys do
  redis.call('del', keys[i])
end
return #keys
" 0 "doc:portfolio_strategies:*"

# Lösche nur Sets (behalte JSON-Objekte)
EVAL "
local keys = redis.call('keys', '*:children')
for i=1,#keys do
  redis.call('del', keys[i])
end
return #keys
" 0

# Lösche nur bestimmte Key-Typen
DEL doc:portfolio_strategies:001:children
DEL doc:portfolio_strategies:001:sequence
```

### Performance-Monitoring-Commands
```redis
# Redis-Memory-Analyse
MEMORY USAGE doc:portfolio_strategies:001
MEMORY USAGE doc:portfolio_strategies:001:sequence

# Anzahl Keys zählen
DBSIZE

# Redis-Info
INFO memory
INFO keyspace

# Slowlog prüfen (langsame Commands)
SLOWLOG GET 10
```

## Integration-Anweisungen für Claude/Cursor

### Automatische Command-Generierung
```
1. NACH JEDER TRANSFORMATION:
   - Generiere Redis-Commands mit RedisCommandGenerator
   - Sortiere Commands nach optimaler Reihenfolge
   - Escape alle Text-Inhalte korrekt

2. BATCH-SIZE-BESTIMMUNG:
   - <100 Chunks: Alle Commands in einer Transaction
   - 100-500 Chunks: Batches à 50 Commands  
   - >500 Chunks: Batches à 25 Commands + Streaming

3. COMMAND-OUTPUT-FORMAT:
   ```
   # Redis-Upload-Commands für [Document-Title]
   
   ## JSON.SET Commands (Erst ausführen)
   [Alle JSON.SET Commands hier]
   
   ## SADD Commands (Danach ausführen)  
   [Alle SADD Commands hier]
   
   ## Validation Commands (Upload prüfen)
   [Debugging-Commands hier]
   ```

4. IMMER VALIDATION-COMMANDS BEREITSTELLEN

**Beispiel Chapter:**
```redis
JSON.SET ch:risk_management:001 $ '{
  "parent": "doc:portfolio_strategies:001",
  "text": "# Risk Management\\n\\nDiversifikation ist der Grundstein erfolgreicher Investments. Ein ausgewogenes Portfolio reduziert das Gesamtrisiko durch geschickte Verteilung der Investments auf verschiedene Anlageklassen.",
  "level": "chapter",
  "position": 1,
  "title": "Risk Management",
  "context_document": "Portfolio Management Strategies",
  "children": []
}'
```

**Beispiel Chunk:**
```redis
JSON.SET chunk:diversifikation_grundstein:001 $ '{
  "parent": "subpara:portfolio_balance:001",
  "text": "Diversifikation ist der Grundstein erfolgreicher Investments und reduziert systematisch das Portfoliorisiko.",
  "level": "chunk", 
  "position": 15,
  "sequence_in_parent": 1,
  "title": "Diversifikation Grundstein",
  "context_title": "Portfolio Balance",
  "context_chapter": "Risk Management",
  "context_document": "Portfolio Management Strategies",
  "children": []
}'
```