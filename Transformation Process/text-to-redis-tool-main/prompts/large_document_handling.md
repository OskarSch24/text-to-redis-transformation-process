# Large Document Handling für 200+ Seiten Dokumente

## Übersicht

Spezielle Regeln und Optimierungen für die Transformation von sehr großen Markdown-Dokumenten (200+ Seiten, 10.000+ Chunks) in Redis-Strukturen ohne Performance-Verlust oder Memory-Probleme.

## Definition "Large Document"

### Größenkategorien
```
MEDIUM:  50-99 Seiten   (~1.000-2.500 Chunks)   → Standard-Verarbeitung
LARGE:   100-199 Seiten (~2.500-5.000 Chunks)   → Optimierte Verarbeitung  
XLARGE:  200-499 Seiten (~5.000-12.500 Chunks)  → Large Document Handling
XXLARGE: 500+ Seiten    (~12.500+ Chunks)       → Extreme Optimierung
```

### Erkennungsmerkmale
```python
def classify_document_size(markdown_content):
    """Klassifiziert Dokument basierend auf Inhalten"""
    
    # Zeichen-basierte Schätzung
    char_count = len(markdown_content)
    estimated_pages = char_count / 2500  # ~2500 Zeichen pro Seite
    
    # Header-basierte Schätzung  
    h1_count = markdown_content.count('\n# ')
    h2_count = markdown_content.count('\n## ')
    h3_count = markdown_content.count('\n### ')
    
    estimated_chunks = h1_count + h2_count + h3_count
    estimated_chunks += len([p for p in markdown_content.split('\n\n') if p.strip() and not p.startswith('#')])
    
    # Klassifikation
    if estimated_pages >= 500 or estimated_chunks >= 12500:
        return "XXLARGE"
    elif estimated_pages >= 200 or estimated_chunks >= 5000:
        return "XLARGE"
    elif estimated_pages >= 100 or estimated_chunks >= 2500:
        return "LARGE"
    else:
        return "MEDIUM"
```

## Memory-Management-Strategien

### Streaming-basierte Verarbeitung
```python
def process_large_document_streaming(markdown_content):
    """Verarbeitet große Dokumente in Chunks ohne vollständiges Memory-Loading"""
    
    # 1. Document-Level-Info zuerst extrahieren
    yaml_frontmatter = extract_yaml_frontmatter(markdown_content)
    document_element = create_document_element(yaml_frontmatter)
    
    # 2. Content in Streaming-Chunks verarbeiten
    chunk_size = 50000  # 50KB Chunks für Memory-Effizienz
    redis_elements = [document_element]
    position_counter = 1
    
    for content_chunk in stream_content_chunks(markdown_content, chunk_size):
        chunk_elements = process_content_chunk(content_chunk, position_counter)
        redis_elements.extend(chunk_elements)
        position_counter += len(chunk_elements)
        
        # Memory-Freigabe zwischen Chunks
        del content_chunk
        gc.collect()
    
    return redis_elements

def stream_content_chunks(content, chunk_size):
    """Generator für Memory-effiziente Content-Verarbeitung"""
    current_position = 0
    
    while current_position < len(content):
        # Chunk-Grenzen an Paragraph-Grenzen ausrichten
        chunk_end = current_position + chunk_size
        
        # Suche nächste Paragraph-Grenze nach Chunk-Ende
        while chunk_end < len(content) and content[chunk_end] != '\n':
            chunk_end += 1
        
        chunk = content[current_position:chunk_end]
        yield chunk
        
        current_position = chunk_end
```

### Batch-Processing für Redis-Upload
```python
def generate_batch_upload_commands(redis_elements, batch_size=100):
    """Generiert Commands in Batches für Memory-Effizienz"""
    
    batches = []
    current_batch = []
    
    for element in redis_elements:
        current_batch.append(element)
        
        if len(current_batch) >= batch_size:
            batch_commands = generate_redis_commands_for_batch(current_batch)
            batches.append(batch_commands)
            current_batch = []
    
    # Letzter Batch
    if current_batch:
        batch_commands = generate_redis_commands_for_batch(current_batch)
        batches.append(batch_commands)
    
    return batches

def generate_redis_commands_for_batch(elements):
    """Generiert Redis-Commands für einen Batch"""
    commands = ["MULTI"]  # Redis-Transaction starten
    
    for element in elements:
        if element.type == "document" or element.type == "chunk":
            json_command = f"JSON.SET {element.key} $ '{element.to_json()}'"
            commands.append(json_command)
    
    commands.append("EXEC")  # Transaction abschließen
    return commands
```

## Performance-Optimierungen

### Adaptive Chunk-Granularität
```python
def determine_optimal_chunking(document_size_class, content_complexity):
    """Bestimmt optimale Chunk-Größe basierend auf Dokument-Eigenschaften"""
    
    chunking_strategies = {
        "MEDIUM": {
            "max_chunk_chars": 2000,
            "prefer_sentence_boundaries": True,
            "merge_short_paragraphs": False
        },
        "LARGE": {
            "max_chunk_chars": 1500, 
            "prefer_sentence_boundaries": True,
            "merge_short_paragraphs": True
        },
        "XLARGE": {
            "max_chunk_chars": 1000,
            "prefer_sentence_boundaries": False, 
            "merge_short_paragraphs": True,
            "split_long_paragraphs": True
        },
        "XXLARGE": {
            "max_chunk_chars": 800,
            "prefer_sentence_boundaries": False,
            "merge_short_paragraphs": True, 
            "split_long_paragraphs": True,
            "aggressive_splitting": True
        }
    }
    
    return chunking_strategies[document_size_class]

def apply_adaptive_chunking(content, strategy):
    """Wendet adaptive Chunking-Strategie an"""
    
    if strategy["merge_short_paragraphs"]:
        content = merge_short_paragraphs(content, min_length=100)
    
    if strategy["split_long_paragraphs"]:
        content = split_long_paragraphs(content, max_length=strategy["max_chunk_chars"])
    
    if strategy["aggressive_splitting"]:
        content = apply_aggressive_sentence_splitting(content)
    
    return content
```

### Redis-Key-Optimierung für große Dokumente
```python
def optimize_keys_for_large_docs(elements):
    """Optimiert Redis-Keys für bessere Performance bei großen Dokumenten"""
    
    # 1. Hierarchie-Prefix-Komprimierung
    compressed_keys = {}
    for element in elements:
        original_key = element.key
        compressed_key = compress_key_for_performance(original_key)
        compressed_keys[original_key] = compressed_key
        element.key = compressed_key
    
    # 2. Parent-Referenzen aktualisieren
    for element in elements:
        if element.parent and element.parent in compressed_keys:
            element.parent = compressed_keys[element.parent]
    
    return elements

def compress_key_for_performance(key):
    """Komprimiert Keys für bessere Redis-Performance"""
    prefix, identifier, number = key.split(':')
    
    # Aggressive Identifier-Kürzung für große Dokumente
    if len(identifier) > 20:
        # Vokale entfernen (außer am Anfang)
        compressed = identifier[0] + ''.join(c for c in identifier[1:] if c not in 'aeiou_')
        
        # Falls immer noch zu lang, weitere Kürzung
        if len(compressed) > 20:
            compressed = compressed[:20]
        
        identifier = compressed
    
    return f"{prefix}:{identifier}:{number}"
```

## Parallelisierung und Async-Processing

### Multi-Threading für Hierarchie-Verarbeitung
```python
import concurrent.futures
import threading

def process_large_document_parallel(markdown_content):
    """Parallele Verarbeitung großer Dokumente"""
    
    # 1. Content in logische Sections aufteilen
    sections = split_into_logical_sections(markdown_content)
    
    # 2. Parallel verarbeiten
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        
        for section in sections:
            future = executor.submit(process_section, section)
            futures.append(future)
        
        # Ergebnisse sammeln
        section_results = []
        for future in concurrent.futures.as_completed(futures):
            section_result = future.result()
            section_results.append(section_result)
    
    # 3. Sections zusammenführen und Position neu zuweisen
    combined_elements = merge_section_results(section_results)
    reassign_global_positions(combined_elements)
    
    return combined_elements

def split_into_logical_sections(content):
    """Teilt Content in logische Sections für Parallelverarbeitung"""
    sections = []
    current_section = ""
    
    for line in content.split('\n'):
        # Neue Section bei H1-Headers
        if line.startswith('# ') and current_section:
            sections.append(current_section)
            current_section = line + '\n'
        else:
            current_section += line + '\n'
    
    # Letzte Section
    if current_section:
        sections.append(current_section)
    
    return sections
```

### Async Redis-Upload
```python
import asyncio
import aioredis

async def upload_large_document_async(redis_elements, redis_url):
    """Asynchroner Upload großer Dokumente"""
    
    # Redis-Connection-Pool für Performance
    redis_pool = aioredis.ConnectionPool.from_url(redis_url, max_connections=10)
    redis_client = aioredis.Redis(connection_pool=redis_pool)
    
    try:
        # Batches für parallelen Upload erstellen
        batches = create_upload_batches(redis_elements, batch_size=50)
        
        # Paralleler Upload aller Batches
        upload_tasks = []
        for batch in batches:
            task = upload_batch_async(redis_client, batch)
            upload_tasks.append(task)
        
        # Warten auf alle Uploads
        results = await asyncio.gather(*upload_tasks, return_exceptions=True)
        
        # Fehlerbehandlung
        successful_uploads = sum(1 for r in results if not isinstance(r, Exception))
        failed_uploads = len(results) - successful_uploads
        
        return {
            "total_batches": len(batches),
            "successful": successful_uploads,
            "failed": failed_uploads,
            "errors": [r for r in results if isinstance(r, Exception)]
        }
        
    finally:
        await redis_client.close()
        await redis_pool.disconnect()

async def upload_batch_async(redis_client, batch):
    """Upload eines einzelnen Batches"""
    
    pipeline = redis_client.pipeline()
    
    # JSON.SET Commands zu Pipeline hinzufügen
    for element in batch:
        if hasattr(element, 'to_json'):
            pipeline.json().set(element.key, '$', element.to_json())
    
    # Set-Commands hinzufügen
    for element in batch:
        if hasattr(element, 'redis_sets'):
            for set_key, members in element.redis_sets.items():
                pipeline.sadd(set_key, *members)
    
    # Pipeline ausführen
    results = await pipeline.execute()
    return results
```

## Memory-effiziente Set-Generierung

### Lazy Set-Generation
```python
class LazyRedisSetGenerator:
    """Generiert Redis-Sets on-demand für Memory-Effizienz"""
    
    def __init__(self, elements):
        self.elements = elements
        self.element_index = self._build_element_index()
    
    def _build_element_index(self):
        """Erstellt Index für schnelle Element-Suche"""
        index = {}
        for element in self.elements:
            index[element.key] = element
        return index
    
    def generate_children_set(self, parent_key):
        """Generiert Children-Set on-demand"""
        children = []
        for element in self.elements:
            if hasattr(element, 'parent') and element.parent == parent_key:
                children.append(element.key)
        
        if children:
            return {
                'key': f"{parent_key}:children",
                'members': children,
                'relationship_type': 'children'
            }
        return None
    
    def generate_sequence_set(self, scope_key):
        """Generiert Sequence-Set on-demand"""
        # Nur Elemente in diesem Scope
        scope_elements = []
        
        if scope_key.startswith('doc:'):
            # Document-weite Sequenz
            scope_elements = self.elements
        else:
            # Scope-spezifische Sequenz (Chapter, Paragraph, etc.)
            scope_elements = [e for e in self.elements if hasattr(e, 'parent') and self._is_in_scope(e, scope_key)]
        
        # Nach Position sortieren
        sorted_elements = sorted(scope_elements, key=lambda e: getattr(e, 'position', 0))
        sequence_keys = [e.key for e in sorted_elements]
        
        if sequence_keys:
            return {
                'key': f"{scope_key}:sequence",
                'members': sequence_keys,
                'relationship_type': 'sequence'
            }
        return None
    
    def _is_in_scope(self, element, scope_key):
        """Prüft ob Element in Scope ist (direkt oder indirekt)"""
        current = element
        while hasattr(current, 'parent') and current.parent:
            if current.parent == scope_key:
                return True
            current = self.element_index.get(current.parent)
            if not current:
                break
        return False
```

## Progressive Loading-Strategien

### Hierarchische Lade-Strategie
```python
def load_document_progressively(markdown_content, load_strategy="hierarchical"):
    """Lädt große Dokumente progressiv basierend auf Prioritäten"""
    
    strategies = {
        "hierarchical": load_hierarchical_priority,
        "sequential": load_sequential_chunks,
        "content_first": load_content_priority,
        "structure_first": load_structure_priority
    }
    
    return strategies[load_strategy](markdown_content)

def load_hierarchical_priority(content):
    """Lädt zuerst strukturelle Elemente, dann Content"""
    
    # Phase 1: Document + alle Headers
    phase1_elements = []
    doc_element = extract_document_element(content)
    phase1_elements.append(doc_element)
    
    header_elements = extract_all_headers(content)  # #, ##, ###
    phase1_elements.extend(header_elements)
    
    # Phase 2: Content-Chunks in Batches
    content_chunks = extract_content_chunks(content)
    phase2_batches = chunk_list(content_chunks, batch_size=100)
    
    return {
        "phase1_structure": phase1_elements,
        "phase2_content_batches": phase2_batches,
        "total_elements": len(phase1_elements) + len(content_chunks)
    }

def load_content_priority(content):
    """Lädt zuerst wichtige Content-Chunks, dann Struktur"""
    
    # Wichtige Chunks identifizieren (z.B. erste Absätze von Kapiteln)
    important_chunks = identify_important_chunks(content)
    regular_chunks = extract_other_chunks(content)
    structural_elements = extract_structural_elements(content)
    
    return {
        "phase1_important": important_chunks,
        "phase2_structure": structural_elements,
        "phase3_remaining": chunk_list(regular_chunks, batch_size=50)
    }
```

### Selective Loading basierend auf Metadaten
```python
def determine_loading_priority(yaml_frontmatter, content_analysis):
    """Bestimmt optimale Lade-Strategie basierend auf Dokument-Eigenschaften"""
    
    # Dokument-Charakteristika analysieren
    doc_type = yaml_frontmatter.get('category', 'general')
    estimated_size = estimate_document_complexity(content_analysis)
    user_priority = yaml_frontmatter.get('priority', 'normal')
    
    loading_config = {
        "batch_size": 50,
        "parallel_workers": 2,
        "memory_limit": "512MB",
        "lazy_loading": False
    }
    
    # Anpassungen basierend auf Dokument-Typ
    if doc_type in ['reference', 'documentation']:
        # Struktur-orientierte Dokumente: Structure-First
        loading_config.update({
            "strategy": "structure_first",
            "batch_size": 100,
            "parallel_workers": 4
        })
    elif doc_type in ['narrative', 'blog']:
        # Content-orientierte Dokumente: Sequential
        loading_config.update({
            "strategy": "sequential", 
            "batch_size": 25,
            "parallel_workers": 2
        })
    
    # Anpassungen basierend auf Größe
    if estimated_size == "XXLARGE":
        loading_config.update({
            "lazy_loading": True,
            "memory_limit": "256MB",
            "batch_size": 25
        })
    
    return loading_config
```

## Error Recovery und Robustheit

### Chunked Processing mit Rollback
```python
def process_with_recovery(markdown_content, recovery_strategy="checkpoint"):
    """Verarbeitung mit Fehler-Recovery-Mechanismen"""
    
    try:
        # Checkpoints für Recovery erstellen
        checkpoints = create_processing_checkpoints(markdown_content)
        processed_elements = []
        
        for i, checkpoint in enumerate(checkpoints):
            try:
                # Checkpoint verarbeiten
                checkpoint_elements = process_checkpoint(checkpoint)
                processed_elements.extend(checkpoint_elements)
                
                # Recovery-Info speichern
                save_checkpoint_state(i, processed_elements)
                
            except Exception as e:
                # Fehler-Recovery
                recovery_result = handle_checkpoint_error(e, checkpoint, i, recovery_strategy)
                
                if recovery_result["continue"]:
                    processed_elements.extend(recovery_result["elements"])
                else:
                    # Kritischer Fehler, komplette Recovery
                    return recover_from_last_checkpoint(processed_elements)
        
        return finalize_processing(processed_elements)
        
    except MemoryError:
        return handle_memory_overflow(markdown_content)
    except Exception as e:
        return handle_critical_error(e, markdown_content)

def handle_checkpoint_error(error, checkpoint, checkpoint_index, strategy):
    """Behandelt Fehler in einzelnen Checkpoints"""
    
    if strategy == "skip":
        # Checkpoint überspringen, Warning loggen
        return {
            "continue": True,
            "elements": [],
            "warnings": [f"Checkpoint {checkpoint_index} übersprungen: {str(error)}"]
        }
    
    elif strategy == "retry":
        # 3 Retry-Versuche mit reduzierter Batch-Größe
        for attempt in range(3):
            try:
                reduced_checkpoint = reduce_checkpoint_complexity(checkpoint, attempt + 1)
                elements = process_checkpoint(reduced_checkpoint)
                return {"continue": True, "elements": elements}
            except:
                continue
        
        # Nach 3 Versuchen: Skip
        return {"continue": True, "elements": [], "warnings": [f"Checkpoint {checkpoint_index} nach 3 Versuchen übersprungen"]}
    
    elif strategy == "abort":
        # Kompletter Abbruch
        return {"continue": False, "error": str(error)}
```

### Memory-Overflow-Handling
```python
def handle_memory_overflow(markdown_content):
    """Spezielle Behandlung bei Memory-Problemen"""
    
    # Drastische Reduzierung der Chunk-Größen
    emergency_config = {
        "max_chunk_chars": 200,
        "batch_size": 10,
        "parallel_workers": 1,
        "aggressive_splitting": True,
        "minimal_sets": True  # Nur essenzielle Sets generieren
    }
    
    # Temporäre Dateien für Zwischenergebnisse
    temp_file_manager = TemporaryFileManager()
    
    try:
        # Ultra-kleiner Batch-Processing
        small_batches = create_emergency_batches(markdown_content, emergency_config)
        
        processed_count = 0
        for batch in small_batches:
            # Batch verarbeiten und sofort in temp file schreiben
            batch_result = process_emergency_batch(batch, emergency_config)
            temp_file_manager.store_batch(batch_result)
            
            processed_count += len(batch_result)
            
            # Memory zwischen Batches freigeben
            del batch_result
            gc.collect()
        
        # Finale Zusammenführung aus temp files
        final_result = temp_file_manager.combine_all_batches()
        return final_result
        
    finally:
        temp_file_manager.cleanup()

class TemporaryFileManager:
    """Verwaltet temporäre Dateien für Memory-kritische Verarbeitung"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="redis_transform_")
        self.batch_files = []
    
    def store_batch(self, batch_data):
        """Speichert Batch-Daten in temporärer Datei"""
        batch_file = os.path.join(self.temp_dir, f"batch_{len(self.batch_files):04d}.json")
        
        with open(batch_file, 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, ensure_ascii=False)
        
        self.batch_files.append(batch_file)
    
    def combine_all_batches(self):
        """Kombiniert alle Batch-Dateien zum finalen Ergebnis"""
        combined_elements = []
        
        for batch_file in self.batch_files:
            with open(batch_file, 'r', encoding='utf-8') as f:
                batch_data = json.load(f)
                combined_elements.extend(batch_data)
        
        # Globale Position neu zuweisen
        for i, element in enumerate(combined_elements):
            element['position'] = i + 1
        
        return combined_elements
    
    def cleanup(self):
        """Entfernt alle temporären Dateien"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
```

## Performance-Monitoring und Diagnostics

### Real-time Processing Metrics
```python
class LargeDocumentProcessor:
    """Haupt-Klasse für Large Document Processing mit Monitoring"""
    
    def __init__(self):
        self.metrics = {
            "start_time": None,
            "elements_processed": 0,
            "memory_usage": [],
            "processing_rate": [],
            "errors": [],
            "warnings": []
        }
    
    def process_with_monitoring(self, markdown_content):
        """Verarbeitung mit detailliertem Monitoring"""
        
        self.metrics["start_time"] = time.time()
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        try:
            # Dokument-Größe bestimmen
            doc_size_class = classify_document_size(markdown_content)
            optimal_config = determine_optimal_processing_config(doc_size_class)
            
            # Processing mit Config
            result = self._process_with_config(markdown_content, optimal_config)
            
            # Finale Metriken
            end_time = time.time()
            final_memory = psutil.Process().memory_info().rss / 1024 / 1024
            
            self.metrics.update({
                "total_time": end_time - self.metrics["start_time"],
                "memory_delta": final_memory - initial_memory,
                "elements_per_second": self.metrics["elements_processed"] / (end_time - self.metrics["start_time"]),
                "peak_memory": max(self.metrics["memory_usage"]) if self.metrics["memory_usage"] else final_memory
            })
            
            return {
                "result": result,
                "metrics": self.metrics,
                "recommendations": self._generate_performance_recommendations()
            }
            
        except Exception as e:
            self.metrics["errors"].append(str(e))
            raise
    
    def _monitor_processing_step(self, step_name, step_func, *args):
        """Überwacht einzelne Processing-Schritte"""
        
        step_start = time.time()
        memory_before = psutil.Process().memory_info().rss / 1024 / 1024
        
        try:
            result = step_func(*args)
            
            step_end = time.time()
            memory_after = psutil.Process().memory_info().rss / 1024 / 1024
            
            # Metriken aktualisieren
            self.metrics["memory_usage"].append(memory_after)
            
            step_duration = step_end - step_start
            if hasattr(result, '__len__'):
                elements_in_step = len(result)
                self.metrics["elements_processed"] += elements_in_step
                rate = elements_in_step / step_duration if step_duration > 0 else 0
                self.metrics["processing_rate"].append(rate)
            
            return result
            
        except Exception as e:
            self.metrics["errors"].append(f"{step_name}: {str(e)}")
            raise
    
    def _generate_performance_recommendations(self):
        """Generiert Performance-Empfehlungen basierend auf Metriken"""
        
        recommendations = []
        
        # Memory-Analyse
        if self.metrics["memory_delta"] > 500:  # >500MB Memory-Anstieg
            recommendations.append("MEMORY: Verwende kleinere Batch-Größen oder Streaming-Processing")
        
        # Performance-Analyse
        avg_rate = sum(self.metrics["processing_rate"]) / len(self.metrics["processing_rate"]) if self.metrics["processing_rate"] else 0
        if avg_rate < 10:  # <10 Elemente/Sekunde
            recommendations.append("PERFORMANCE: Aktiviere Parallelverarbeitung oder reduziere Chunk-Komplexität")
        
        # Error-Analyse
        if len(self.metrics["errors"]) > 5:
            recommendations.append("RELIABILITY: Implementiere robustere Error-Recovery-Strategien")
        
        # Zeit-Analyse
        if self.metrics.get("total_time", 0) > 300:  # >5 Minuten
            recommendations.append("EFFICIENCY: Erwäge Async-Processing oder Progressive Loading")
        
        return recommendations
```

## Spezielle Optimierungen für XXLARGE Dokumente

### Ultra-kompakte Repräsentation
```python
def create_ultra_compact_representation(elements):
    """Erstellt ultra-kompakte Redis-Strukturen für riesige Dokumente"""
    
    # 1. Key-Kompression mit Hash-basierten Identifiern
    key_mapping = {}
    compressed_elements = []
    
    for element in elements:
        # SHA256-Hash der ersten 100 Zeichen als kompakte ID
        content_hash = hashlib.sha256(element.text[:100].encode()).hexdigest()[:8]
        compressed_key = f"{element.level[0]}:{content_hash}"  # z.B. "c:a1b2c3d4"
        
        key_mapping[element.key] = compressed_key
        
        # Ultra-kompaktes Element erstellen
        compressed_element = {
            "k": compressed_key,  # key
            "p": key_mapping.get(element.parent),  # parent  
            "t": compress_text_aggressively(element.text),  # text
            "l": element.level[0],  # level (nur erster Buchstabe)
            "n": element.position  # position
        }
        
        compressed_elements.append(compressed_element)
    
    # 2. Sets als Bit-Arrays für maximale Kompression
    compressed_sets = create_bitarray_sets(compressed_elements)
    
    return {
        "elements": compressed_elements,
        "sets": compressed_sets,
        "key_mapping": key_mapping,  # Für Dekompression
        "compression_ratio": calculate_compression_ratio(elements, compressed_elements)
    }

def compress_text_aggressively(text):
    """Aggressive Text-Kompression für ultra-große Dokumente"""
    
    # 1. Whitespace-Normalisierung
    compressed = re.sub(r'\s+', ' ', text.strip())
    
    # 2. Häufige Wörter durch Tokens ersetzen
    common_words = {
        'und': '&', 'oder': '|', 'das': 'd', 'die': 'D', 'der': 'dr',
        'ist': '=', 'sind': '==', 'wurde': 'w', 'werden': 'W'
    }
    
    for word, token in common_words.items():
        compressed = compressed.replace(f' {word} ', f' {token} ')
    
    # 3. LZ4-Kompression für finale Größenreduktion
    if len(compressed) > 200:  # Nur bei größeren Texten
        try:
            import lz4.block
            compressed_bytes = lz4.block.compress(compressed.encode('utf-8'))
            # Base64 für Redis-Kompatibilität
            compressed = base64.b64encode(compressed_bytes).decode('ascii')
        except ImportError:
            pass  # Fallback auf unkomprimierten Text
    
    return compressed

def create_bitarray_sets(elements):
    """Erstellt Bit-Array-basierte Sets für maximale Memory-Effizienz"""
    
    # Element-Index für Bit-Position-Mapping
    element_to_bit = {elem["k"]: i for i, elem in enumerate(elements)}
    
    sets = {}
    
    # Children-Sets als Bit-Arrays
    for element in elements:
        if "p" in element:  # Hat Parent
            parent_key = element["p"]
            children_key = f"{parent_key}:c"
            
            if children_key not in sets:
                sets[children_key] = bitarray.bitarray(len(elements))
                sets[children_key].setall(0)
            
            child_bit_pos = element_to_bit[element["k"]]
            sets[children_key][child_bit_pos] = 1
    
    return sets
```

## Upload-Strategien für große Dokumente

### Progressive Upload mit Health-Checks
```python
async def upload_large_document_progressive(elements, redis_client, progress_callback=None):
    """Progressiver Upload mit Gesundheitschecks"""
    
    upload_metrics = {
        "total_elements": len(elements),
        "uploaded": 0,
        "failed": 0,
        "retries": 0,
        "errors": []
    }
    
    # Redis-Gesundheitscheck vor Upload
    redis_health = await check_redis_health(redis_client)
    if not redis_health["healthy"]:
        raise Exception(f"Redis nicht bereit für Upload: {redis_health['issues']}")
    
    # Upload in progressiven Wellen
    wave_size = calculate_optimal_wave_size(len(elements), redis_health["performance"])
    
    for wave_start in range(0, len(elements), wave_size):
        wave_end = min(wave_start + wave_size, len(elements))
        wave_elements = elements[wave_start:wave_end]
        
        # Wave upload mit Retry-Logic
        wave_result = await upload_wave_with_retry(redis_client, wave_elements, max_retries=3)
        
        # Metriken aktualisieren
        upload_metrics["uploaded"] += wave_result["successful"]
        upload_metrics["failed"] += wave_result["failed"] 
        upload_metrics["retries"] += wave_result["retries"]
        upload_metrics["errors"].extend(wave_result["errors"])
        
        # Progress-Callback
        if progress_callback:
            progress = (wave_end / len(elements)) * 100
            progress_callback(progress, upload_metrics)
        
        # Adaptive Delay basierend auf Redis-Performance
        if wave_result["avg_response_time"] > 100:  # >100ms
            await asyncio.sleep(0.5)  # Langsamere Redis → mehr Pause
        
        # Health-Check nach jeder 10. Wave
        if (wave_start // wave_size) % 10 == 0:
            health = await check_redis_health(redis_client)
            if not health["healthy"]:
                # Redis-Recovery-Pause
                await asyncio.sleep(5)
    
    return upload_metrics

async def check_redis_health(redis_client):
    """Überprüft Redis-Gesundheit und Performance"""
    
    try:
        # Latency-Test
        start_time = time.time()
        await redis_client.ping()
        ping_latency = (time.time() - start_time) * 1000  # ms
        
        # Memory-Check
        info = await redis_client.info("memory")
        memory_usage = info.get("used_memory", 0)
        max_memory = info.get("maxmemory", float('inf'))
        memory_ratio = memory_usage / max_memory if max_memory > 0 else 0
        
        # Connection-Check
        info_clients = await redis_client.info("clients")
        connected_clients = info_clients.get("connected_clients", 0)
        
        # Gesundheitsbewertung
        issues = []
        if ping_latency > 50:
            issues.append(f"Hohe Latency: {ping_latency:.1f}ms")
        if memory_ratio > 0.9:
            issues.append(f"Memory-Limit erreicht: {memory_ratio*100:.1f}%")
        if connected_clients > 100:
            issues.append(f"Viele Verbindungen: {connected_clients}")
        
        return {
            "healthy": len(issues) == 0,
            "issues": issues,
            "performance": {
                "latency": ping_latency,
                "memory_ratio": memory_ratio,
                "connections": connected_clients
            }
        }
        
    except Exception as e:
        return {
            "healthy": False,
            "issues": [f"Redis-Verbindungsfehler: {str(e)}"],
            "performance": None
        }
```

## Anweisungen für Claude/Cursor bei Large Documents

### Automatische Size-Detection
```
1. INPUT-ANALYSE:
   - Zähle Zeichen, Headers, geschätzte Chunks
   - Klassifiziere als MEDIUM/LARGE/XLARGE/XXLARGE
   - Wähle entsprechende Processing-Strategie

2. MEMORY-MANAGEMENT:
   - Bei XLARGE+: Aktiviere Streaming-Processing
   - Bei XXLARGE: Verwende Ultra-Compact-Representation
   - Implementiere Progressive Loading

3. PERFORMANCE-OPTIMIERUNG:
   - Adaptive Chunk-Granularität basierend auf Größe
   - Parallelisierung für LARGE+ Dokumente  
   - Async-Upload für XLARGE+ Dokumente

4. ERROR-RECOVERY:
   - Checkpoint-basierte Recovery bei großen Dokumenten
   - Memory-Overflow-Handling mit temporären Dateien
   - Retry-Logic mit reduzierter Komplexität

5. MONITORING:
   - Real-time Memory-Tracking
   - Processing-Rate-Überwachung
   - Performance-Empfehlungen generieren
```

### Size-spezifische Templates
```
MEDIUM (50-99 Seiten):
- Standard-Processing ohne Spezialbehandlung
- Normale Chunk-Größen (2000 Zeichen)
- Synchroner Upload

LARGE (100-199 Seiten):
- Batch-Processing aktivieren
- Reduzierte Chunk-Größen (1500 Zeichen)
- Optional parallele Verarbeitung

XLARGE (200-499 Seiten):
- Streaming-Processing PFLICHT
- Aggressive Chunk-Optimierung (1000 Zeichen)
- Async-Upload mit Health-Checks
- Memory-Monitoring aktiviert

XXLARGE (500+ Seiten):
- Ultra-Compact-Representation
- Emergency-Memory-Handling bereit
- Progressive Upload mit Waves
- Bit-Array-Sets für maximale Effizienz
```