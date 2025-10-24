# Redis MCP Server für Claude Desktop

Dieser MCP Server verbindet Claude Desktop mit deiner Redis Cloud Datenbank.

## Installation abgeschlossen ✅

Der Server wurde erfolgreich eingerichtet und getestet.

## Deine nächsten Schritte:

### 1. Claude Desktop neu starten
- Beende Claude Desktop komplett (CMD+Q)
- Starte Claude Desktop neu
- Der Redis Server sollte automatisch starten

### 2. Prüfen ob der Server läuft
Nach dem Neustart von Claude kannst du in einem neuen Chat folgendes eingeben:
- "Zeige mir alle Redis Keys" 
- "Speichere test:hello mit dem Wert 'Hallo Welt' in Redis"

### 3. Verfügbare Redis Befehle in Claude:

**Grundlegende Operationen:**
- `redis_get` - Wert abrufen
- `redis_set` - Wert setzen (optional mit TTL)
- `redis_delete` - Key löschen
- `redis_keys` - Keys auflisten (mit Pattern)
- `redis_type` - Typ eines Keys ermitteln

**Hash Operationen:**
- `redis_hget` - Hash-Feld abrufen
- `redis_hset` - Hash-Feld setzen
- `redis_hgetall` - Alle Hash-Felder abrufen

**Listen Operationen:**
- `redis_lpush` - Werte zur Liste hinzufügen
- `redis_lrange` - Listenelemente abrufen

**Set Operationen:**
- `redis_smembers` - Alle Set-Mitglieder abrufen
- `redis_sadd` - Mitglieder zum Set hinzufügen
- `redis_srem` - Mitglieder aus Set entfernen

**Sorted Set Operationen:**
- `redis_zrange` - Elemente aus Sorted Set abrufen (mit optionalen Scores)
- `redis_zadd` - Elemente mit Scores hinzufügen
- `redis_zrem` - Elemente aus Sorted Set entfernen

**Server Info:**
- `redis_info` - Redis Server Informationen

## Fehlerbehebung:

### Falls Claude den Server nicht sieht:
1. Prüfe ob Node.js installiert ist: `node --version`
2. Stelle sicher dass Claude Desktop KOMPLETT neu gestartet wurde
3. Prüfe die Konfiguration: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json`

### Falls Redis Verbindung fehlschlägt:
1. Teste die Verbindung: `cd ~/mcp-redis-server && node test-connection.js`
2. Prüfe die .env Datei: `cat ~/mcp-redis-server/.env`

## Server manuell testen:
```bash
cd ~/mcp-redis-server
node test-connection.js
```

## Dateien:
- `/Users/oskarschiermeister/mcp-redis-server/` - Hauptordner
- `server.js` - MCP Server Code
- `.env` - Redis Zugangsdaten
- `test-connection.js` - Verbindungstest

Deine Redis Cloud Datenbank (104 Keys vorhanden) ist jetzt mit Claude verbunden!