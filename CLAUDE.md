# CLAUDE.md — Project guidelines for JegVet

## Norwegian characters in JavaScript strings

Always write Norwegian special characters directly in JS string literals. Never substitute them with `?` or any placeholder:

| Character | Examples |
|-----------|---------|
| `å` | på, målt, små, årsak, overvåk, vannskål, oppblåst |
| `æ` | væske, fravær, ernæring, veterinær, størrelse |
| `ø` | første, døgn, utføre, nøyaktig, følg, avføring, grønnsaker, høy |
| `ô` | fôr, tvangsfôring, fôrendring |

This applies to journal text builders, status messages, error strings, and any other JS string containing Norwegian prose. The HTML files are UTF-8 (`<meta charset="UTF-8">`) so the characters render correctly as long as they are written correctly in the source.

If you see `?` in a Norwegian JS string, it is a corrupted special character that must be corrected before committing.
