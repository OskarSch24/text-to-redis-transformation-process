# REDIS KEYS

## Content Keys (JSON)
```
doc:{name}:{number}
ch:{name}:{number}
para:{name}:{number}
subpara:{name}:{number}
chunk:{name}:{number}
```

## Relationship Keys (SET)
```
{parent_key}:children
{parent_key}:sequence
```

---

# REDIS COMMANDS

## Find & Check
```bash
KEYS pattern
TYPE key
```

## Read Content (JSON)
```bash
JSON.GET key
JSON.GET key $.field
JSON.GET key $.field1 $.field2
```

## Fetch Content for Use
```bash
JSON.GET key $.text
JSON.GET key $.title $.text
JSON.GET key $.text $.context_chapter $.context_document
```

## Navigate (SET)
```bash
SMEMBERS key:children
SMEMBERS key:sequence
SCARD key:children
```

---

# COMMON FIELDS
```
$.title
$.text
$.level
$.parent
$.position
$.context_document
$.context_chapter
```

