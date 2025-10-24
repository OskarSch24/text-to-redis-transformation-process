Du hast Zugriff auf das text-to-redis-tool Repository. Führe eine schrittweise Transformation von Markdown zu Redis durch.

## SCHRITT-FÜR-SCHRITT PROZESS

### SCHRITT 1: Repository-Analyse
Sage: "Ich habe das text-to-redis-tool Repository analysiert. Die wichtigsten Dateien sind:
- `/schemas/redis_tag_format.md` - Tag-Definitionen
- `/schemas/structure_preservation_rules.md` - Hierarchie-Regeln
- `/prompts/main_transformation_prompt.md` - Transformation-Logik
- `/examples/` - Beispiele für korrekte Transformationen

Bereit für Schritt 2. Bitte füge dein Markdown-Dokument mit YAML Front Matter ein."

**WARTE AUF INPUT**

### SCHRITT 2: Input-Validierung
Nach Erhalt des Markdowns:
- Prüfe YAML Front Matter (title, author, created)
- Analysiere Markdown-Hierarchie (# ## ### Headers)
- Zähle alle Elemente

Sage: "Input-Validierung abgeschlossen:
✅ YAML: [Status]
✅ Hierarchie: X Chapters, Y Paragraphs, Z SubParagraphs
✅ Geschätzte Chunks: N

Bereit für Transformation. Soll ich mit Schritt 3 fortfahren?"

**WARTE AUF BESTÄTIGUNG**

### SCHRITT 3: Redis-Tags generieren
Verwende die Regeln aus `/schemas/redis_tag_format.md` und `/prompts/main_transformation_prompt.md`:
- Generiere alle RedisDoc und RedisChunk Tags
- KRITISCH: `text`-Feld muss VOLLSTÄNDIGEN Originaltext enthalten
  - Headers MIT Content: `"# Header\n\nContent"`
  - Reiner Content: `"Content"` (ohne Header)
- KRITISCH: `sequence_in_parent` für alle Elemente mit Parent
- KRITISCH: IMMER `:children` verwenden (nie `:chapters`)
- Verwende korrekte Key-Formate: `prefix:name:001` (bei Duplikaten: 002, 003...)

Zeige die ersten 5 Tags als Vorschau:
"Hier eine Vorschau der generierten Redis-Tags:
[Erste 5 Tags]
...
Insgesamt N Tags generiert. Soll ich alle Tags und Redis-Sets zeigen?"

**WARTE AUF BESTÄTIGUNG**

### SCHRITT 4: Vollständige Ausgabe
Verwende das Standard-Output-Format aus `/prompts/main_transformation_prompt.md`:

```
# Text-zu-Redis Transformation Ergebnis

## Input-Analyse
✅ YAML Front Matter: vollständig
✅ Markdown-Hierarchie: X Chapters, Y Paragraphs, Z SubParagraphs, W Chunks
✅ Text-Content: N Zeichen
✅ Struktur-Integrität: valide

## Redis-Tags (nach Position sortiert)
[Alle Redis-Tags]

## Redis-Sets (nach Key sortiert)
[Alle Redis-Sets mit :children]

## Redis-Upload-Commands

### JSON.SET Commands
[Alle JSON.SET Commands]

### SADD Commands
[Alle SADD Commands]

## Qualitätskontrolle
✅ N Redis-Keys generiert, alle eindeutig
✅ M Hierarchie-Beziehungen erstellt
✅ Position-Sequenz korrekt (1 bis N)
✅ Volltext-Preservation: ALLE text-Felder enthalten kompletten Originaltext
✅ sequence_in_parent: Alle Kinder haben korrekte lokale Sequenz
✅ Set-Naming: ALLE Sets verwenden :children

## Upload-Anleitung
1. Redis-Commands in Redis-CLI oder Redis-Interface kopieren
2. JSON.SET Commands zuerst ausführen
3. SADD Commands danach ausführen
4. Upload validieren mit: `JSON.GET doc:...:001`
```

### SCHRITT 5: Mandatory Checks
Führe automatisch `/validation/mandatory_checks.md` aus:
- B001-B005: BLOCKER-Checks
- E001-E005: ERROR-Checks (inkl. sequence_in_parent)
- W001-W002: WARNING-Checks

Sage: "Mandatory Checks abgeschlossen:
- Blocker: [Anzahl]
- Errors: [Anzahl]  
- Warnings: [Anzahl]

[Wenn Blocker > 0]: ⚠️ Upload blockiert! Folgende BLOCKER müssen behoben werden: [Liste]
[Wenn Blocker = 0]: ✅ Upload erlaubt! Die Redis-Commands können ausgeführt werden.

Möchtest du:
a) Die Commands in einer Datei speichern?
b) Eine detaillierte Validierung sehen?
c) Ein anderes Dokument transformieren?"

## KRITISCHE REGELN (aus Repository)
- NIE Text kürzen - vollständige Preservation
- IMMER `:children` für Sets (nie `:chapters`, `:paragraphs` etc.)
- IMMER `sequence_in_parent` für alle Elemente mit Parent
- Key-Format strikt einhalten: `prefix:clean_name:001` (002, 003 bei Duplikaten)
- Hierarchie über parent-Referenzen erhalten
- Chunk-Größen-Empfehlung: <2000 Zeichen für optimale Performance

## BEI FEHLERN
Wenn etwas unklar ist, referenziere die entsprechende Datei im Repository:
"Ich prüfe die Regel in `/schemas/key_naming_conventions.md`..."

Start mit SCHRITT 1 sobald du bereit bist.
