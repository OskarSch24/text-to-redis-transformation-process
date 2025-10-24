# Redis Transformation Output Template

## Übersicht

Dieses Template definiert das EXAKTE Output-Format für alle Text-zu-Redis Transformationen. Jede Transformation MUSS diesem Format folgen, um Konsistenz und Kompatibilität zu gewährleisten.

## Standard Output Format

Jede Transformation besteht aus 5 Pflicht-Sektionen in dieser Reihenfolge:

1. **Input-Analyse** - Validierung und Statistiken
2. **Redis-Tags** - Alle generierten Tags (sortiert nach position)
3. **Redis-Sets** - Alle Beziehungs-Sets (alphabetisch sortiert)
4. **Redis-Upload-Commands** - Ausführbare Redis-Befehle
5. **Qualitätskontrolle** - Validierung und Upload-Anleitung

---

## SECTION 1: Input-Analyse

```
# Text-zu-Redis Transformation Ergebnis

## Input-Analyse
✅ YAML Front Matter: vollständig
✅ Markdown-Hierarchie: [X] Chapters, [Y] Paragraphs, [Z] SubParagraphs, [W] Chunks
✅ Text-Content: [N] Zeichen
✅ Struktur-Integrität: valide
```

### Variablen-Erklärung:
- `[X]` = Anzahl der # Headers (Chapters)
- `[Y]` = Anzahl der ## Headers (Paragraphs)
- `[Z]` = Anzahl der ### Headers (SubParagraphs)
- `[W]` = Anzahl der Text-Chunks
- `[N]` = Gesamtanzahl Zeichen im Dokument

---

## SECTION 2: Redis-Tags (nach Position sortiert)

```
## Redis-Tags (nach Position sortiert)

{RedisDoc: key=doc:[clean_title]:001 ; title="[Original Title]" ; author="[Author Name]" ; created="[YYYY-MM-DD]" ; total_chunks=[total_count] ; category="[category]" ; language="[lang]"}

{RedisChunk: key=ch:[clean_name]:001 ; parent=doc:[clean_title]:001 ; text="[VOLLSTÄNDIGER_ORIGINALTEXT]" ; level="chapter" ; position=1 ; title="[Chapter Title]"}

{RedisChunk: key=para:[clean_name]:001 ; parent=ch:[clean_name]:001 ; text="[VOLLSTÄNDIGER_ORIGINALTEXT]" ; level="paragraph" ; position=2 ; sequence_in_parent=1 ; title="[Paragraph Title]"}

{RedisChunk: key=subpara:[clean_name]:001 ; parent=para:[clean_name]:001 ; text="[VOLLSTÄNDIGER_ORIGINALTEXT]" ; level="subparagraph" ; position=3 ; sequence_in_parent=1 ; title="[SubParagraph Title]"}

{RedisChunk: key=chunk:[keyword]:001 ; parent=[parent_key] ; text="[VOLLSTÄNDIGER_ORIGINALTEXT]" ; level="chunk" ; position=4 ; sequence_in_parent=1}
```

### Tag-Format-Regeln:
- Ein Tag pro Zeile
- Attribute durch ` ; ` (Semikolon mit Leerzeichen) getrennt
- String-Werte in Anführungszeichen
- Numerische Werte ohne Anführungszeichen
- Arrays in eckigen Klammern `[item1, item2]`

### Pflichtfelder pro Tag-Typ:

#### RedisDoc:
- `key` - Format: `doc:[clean_title]:001`
- `title` - Originaltitel aus YAML
- `author` - Autor aus YAML
- `created` - Datum im Format YYYY-MM-DD
- `total_chunks` - Gesamtanzahl aller Chunks

#### RedisChunk:
- `key` - Format nach Level: `ch:`, `para:`, `subpara:`, `chunk:`
- `parent` - Key des Eltern-Elements (außer bei doc)
- `text` - **VOLLSTÄNDIGER** Originaltext ohne Kürzung
- `level` - Hierarchie-Ebene
- `position` - Globale Position im Dokument

---

## SECTION 3: Redis-Sets (nach Key sortiert)

```
## Redis-Sets (nach Key sortiert)

{RedisSet: key=ch:[name]:001:children ; members=[para:[name]:001, para:[name]:002, chunk:[name]:001]}
{RedisSet: key=doc:[name]:001:children ; members=[ch:[name]:001, ch:[name]:002, ch:[name]:003]}
{RedisSet: key=doc:[name]:001:sequence ; members=[doc:[name]:001, ch:[name]:001, para:[name]:001, subpara:[name]:001, chunk:[name]:001, chunk:[name]:002]}
{RedisSet: key=para:[name]:001:children ; members=[subpara:[name]:001, chunk:[name]:001, chunk:[name]:002]}
{RedisSet: key=subpara:[name]:001:children ; members=[chunk:[name]:001, chunk:[name]:002]}
```

### Set-Typen:

#### Children-Sets (Hierarchie)
- Format: `[parent_key]:children`
- Enthält: Direkte Kind-Elemente
- Sortierung: Nach position der Kinder

#### Sequence-Sets (Lesereihenfolge)
- Format: `[scope_key]:sequence`
- Enthält: Alle Elemente in Lesereihenfolge
- Sortierung: Nach position

#### Navigation-Sets (Optional)
- Format: `[element_key]:previous` und `[element_key]:next`
- Enthält: Vorheriges/Nächstes Element
- Nur bei Bedarf generieren

---

## SECTION 4: Redis-Upload-Commands

```
## Redis-Upload-Commands

### JSON.SET Commands
JSON.SET doc:[name]:001 $ '{"title":"[title]","author":"[author]","created":"[date]","total_chunks":[N],"category":"[category]","language":"[lang]"}'
JSON.SET ch:[name]:001 $ '{"parent":"doc:[name]:001","text":"[ESCAPED_VOLLTEXT]","level":"chapter","position":1,"title":"[title]"}'
JSON.SET para:[name]:001 $ '{"parent":"ch:[name]:001","text":"[ESCAPED_VOLLTEXT]","level":"paragraph","position":2,"sequence_in_parent":1,"title":"[title]"}'
JSON.SET subpara:[name]:001 $ '{"parent":"para:[name]:001","text":"[ESCAPED_VOLLTEXT]","level":"subparagraph","position":3,"sequence_in_parent":1,"title":"[title]"}'
JSON.SET chunk:[name]:001 $ '{"parent":"[parent_key]","text":"[ESCAPED_VOLLTEXT]","level":"chunk","position":4,"sequence_in_parent":1}'

### SADD Commands
SADD doc:[name]:001:children ch:[name]:001 ch:[name]:002
SADD ch:[name]:001:children para:[name]:001 para:[name]:002 chunk:[name]:001
SADD para:[name]:001:children subpara:[name]:001 chunk:[name]:002
SADD subpara:[name]:001:children chunk:[name]:003 chunk:[name]:004
SADD doc:[name]:001:sequence doc:[name]:001 ch:[name]:001 para:[name]:001 subpara:[name]:001 chunk:[name]:001
```

### JSON-Escape-Regeln:
- Newline: `\n` → `\\n`
- Anführungszeichen: `"` → `\"`
- Backslash: `\` → `\\`
- Tab: `\t` → `\\t`

### Command-Reihenfolge:
1. **Alle JSON.SET Commands zuerst** (Struktur vor Beziehungen)
2. **Dann alle SADD Commands** (Beziehungen nach Struktur)

---

## SECTION 5: Qualitätskontrolle

```
## Qualitätskontrolle
✅ [N] Redis-Keys generiert, alle eindeutig
✅ [M] Hierarchie-Beziehungen erstellt
✅ Position-Sequenz korrekt (1 bis [N])
✅ Volltext-Preservation: ALLE text-Felder enthalten kompletten Originaltext
✅ Navigation-Sets: bidirektional konsistent

## Upload-Anleitung
1. Redis-Commands in Redis-CLI oder Redis-Interface kopieren
2. JSON.SET Commands zuerst ausführen
3. SADD Commands danach ausführen
4. Upload validieren mit: `JSON.GET doc:[name]:001`
```

---

## Vollständiges Beispiel

### Input:
```markdown
---
title: "Investment Guide 2024"
author: "Dr. Sarah Schmidt"
created: "2024-12-27"
category: "finance"
---

# Grundlagen der Geldanlage
Die richtige Strategie ist entscheidend für langfristigen Erfolg.

## Diversifikation
Niemals alle Eier in einen Korb legen.

### Geografische Streuung
Verschiedene Märkte bieten unterschiedliche Chancen.
```

### Output (Vollständig nach Template):

```
# Text-zu-Redis Transformation Ergebnis

## Input-Analyse
✅ YAML Front Matter: vollständig
✅ Markdown-Hierarchie: 1 Chapter, 1 Paragraph, 1 SubParagraph, 3 Chunks
✅ Text-Content: 198 Zeichen
✅ Struktur-Integrität: valide

## Redis-Tags (nach Position sortiert)

{RedisDoc: key=doc:investment_guide_2024:001 ; title="Investment Guide 2024" ; author="Dr. Sarah Schmidt" ; created="2024-12-27" ; total_chunks=6 ; category="finance"}

{RedisChunk: key=ch:grundlagen_geldanlage:001 ; parent=doc:investment_guide_2024:001 ; text="# Grundlagen der Geldanlage\nDie richtige Strategie ist entscheidend für langfristigen Erfolg." ; level="chapter" ; position=1 ; title="Grundlagen der Geldanlage"}

{RedisChunk: key=chunk:richtige_strategie:001 ; parent=ch:grundlagen_geldanlage:001 ; text="Die richtige Strategie ist entscheidend für langfristigen Erfolg." ; level="chunk" ; position=2 ; sequence_in_parent=1}

{RedisChunk: key=para:diversifikation:001 ; parent=ch:grundlagen_geldanlage:001 ; text="## Diversifikation\nNiemals alle Eier in einen Korb legen." ; level="paragraph" ; position=3 ; sequence_in_parent=2 ; title="Diversifikation"}

{RedisChunk: key=chunk:niemals_alle:001 ; parent=para:diversifikation:001 ; text="Niemals alle Eier in einen Korb legen." ; level="chunk" ; position=4 ; sequence_in_parent=1}

{RedisChunk: key=subpara:geografische_streuung:001 ; parent=para:diversifikation:001 ; text="### Geografische Streuung\nVerschiedene Märkte bieten unterschiedliche Chancen." ; level="subparagraph" ; position=5 ; sequence_in_parent=2 ; title="Geografische Streuung"}

{RedisChunk: key=chunk:verschiedene_maerkte:001 ; parent=subpara:geografische_streuung:001 ; text="Verschiedene Märkte bieten unterschiedliche Chancen." ; level="chunk" ; position=6 ; sequence_in_parent=1}

## Redis-Sets (nach Key sortiert)

{RedisSet: key=ch:grundlagen_geldanlage:001:children ; members=[chunk:richtige_strategie:001, para:diversifikation:001]}
{RedisSet: key=doc:investment_guide_2024:001:children ; members=[ch:grundlagen_geldanlage:001]}
{RedisSet: key=doc:investment_guide_2024:001:sequence ; members=[doc:investment_guide_2024:001, ch:grundlagen_geldanlage:001, chunk:richtige_strategie:001, para:diversifikation:001, chunk:niemals_alle:001, subpara:geografische_streuung:001, chunk:verschiedene_maerkte:001]}
{RedisSet: key=para:diversifikation:001:children ; members=[chunk:niemals_alle:001, subpara:geografische_streuung:001]}
{RedisSet: key=subpara:geografische_streuung:001:children ; members=[chunk:verschiedene_maerkte:001]}

## Redis-Upload-Commands

### JSON.SET Commands
JSON.SET doc:investment_guide_2024:001 $ '{"title":"Investment Guide 2024","author":"Dr. Sarah Schmidt","created":"2024-12-27","total_chunks":6,"category":"finance"}'
JSON.SET ch:grundlagen_geldanlage:001 $ '{"parent":"doc:investment_guide_2024:001","text":"# Grundlagen der Geldanlage\\nDie richtige Strategie ist entscheidend für langfristigen Erfolg.","level":"chapter","position":1,"title":"Grundlagen der Geldanlage"}'
JSON.SET chunk:richtige_strategie:001 $ '{"parent":"ch:grundlagen_geldanlage:001","text":"Die richtige Strategie ist entscheidend für langfristigen Erfolg.","level":"chunk","position":2,"sequence_in_parent":1}'
JSON.SET para:diversifikation:001 $ '{"parent":"ch:grundlagen_geldanlage:001","text":"## Diversifikation\\nNiemals alle Eier in einen Korb legen.","level":"paragraph","position":3,"sequence_in_parent":2,"title":"Diversifikation"}'
JSON.SET chunk:niemals_alle:001 $ '{"parent":"para:diversifikation:001","text":"Niemals alle Eier in einen Korb legen.","level":"chunk","position":4,"sequence_in_parent":1}'
JSON.SET subpara:geografische_streuung:001 $ '{"parent":"para:diversifikation:001","text":"### Geografische Streuung\\nVerschiedene Märkte bieten unterschiedliche Chancen.","level":"subparagraph","position":5,"sequence_in_parent":2,"title":"Geografische Streuung"}'
JSON.SET chunk:verschiedene_maerkte:001 $ '{"parent":"subpara:geografische_streuung:001","text":"Verschiedene Märkte bieten unterschiedliche Chancen.","level":"chunk","position":6,"sequence_in_parent":1}'

### SADD Commands
SADD doc:investment_guide_2024:001:children ch:grundlagen_geldanlage:001
SADD ch:grundlagen_geldanlage:001:children chunk:richtige_strategie:001 para:diversifikation:001
SADD para:diversifikation:001:children chunk:niemals_alle:001 subpara:geografische_streuung:001
SADD subpara:geografische_streuung:001:children chunk:verschiedene_maerkte:001
SADD doc:investment_guide_2024:001:sequence doc:investment_guide_2024:001 ch:grundlagen_geldanlage:001 chunk:richtige_strategie:001 para:diversifikation:001 chunk:niemals_alle:001 subpara:geografische_streuung:001 chunk:verschiedene_maerkte:001

## Qualitätskontrolle
✅ 7 Redis-Keys generiert, alle eindeutig
✅ 5 Hierarchie-Beziehungen erstellt
✅ Position-Sequenz korrekt (1 bis 6)
✅ Volltext-Preservation: ALLE text-Felder enthalten kompletten Originaltext
✅ Navigation-Sets: bidirektional konsistent

## Upload-Anleitung
1. Redis-Commands in Redis-CLI oder Redis-Interface kopieren
2. JSON.SET Commands zuerst ausführen
3. SADD Commands danach ausführen
4. Upload validieren mit: `JSON.GET doc:investment_guide_2024:001`
```

---

## Spezialfälle und Edge-Cases

### Leere Sections
Wenn eine Section keine Elemente enthält (z.B. nur ein Chapter ohne Text):
```
{RedisChunk: key=ch:empty_chapter:001 ; parent=doc:example:001 ; text="# Empty Chapter" ; level="chapter" ; position=1}
```
Kein separater Chunk für leeren Content generieren!

### Sehr lange Texte
Bei Texten > 5000 Zeichen: Text trotzdem vollständig erhalten, aber Warnung hinzufügen:
```
⚠️ WARNUNG: Chunk chunk:very_long:001 enthält [X] Zeichen. Eventuell für Performance in kleinere Chunks aufteilen.
```

### Sonderzeichen in Keys
Alle Sonderzeichen aus Keys entfernen:
- `Portfolio & Strategies` → `portfolio_strategies`
- `Risk-Management!` → `risk_management`
- `Über uns` → `ueber_uns`

---

## Validierungs-Checkliste

Vor Ausgabe IMMER prüfen:

- [ ] Alle text-Felder enthalten VOLLSTÄNDIGEN Originaltext
- [ ] Jedes Element (außer doc) hat gültigen parent
- [ ] Position-Werte sind lückenlos aufsteigend (1,2,3...)
- [ ] Alle Keys folgen dem Format `prefix:name:001`
- [ ] Children-Sets enthalten nur direkte Kinder
- [ ] Sequence-Sets sind in korrekter Reihenfolge
- [ ] JSON-Escape-Sequenzen korrekt angewendet
- [ ] SADD Commands referenzieren existierende Keys

---

## Integration mit Repository

Dieses Template ergänzt:
- `/schemas/redis_tag_format.md` - Tag-Definitionen
- `/schemas/structure_preservation_rules.md` - Hierarchie-Regeln  
- `/prompts/main_transformation_prompt.md` - Transformation-Logik
- `/validation/mandatory_checks.md` - Validierungs-Regeln

Bei Konflikten hat dieses Output-Template Vorrang für die finale Ausgabe-Formatierung.