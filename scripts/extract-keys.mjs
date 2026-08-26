import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'default-texts.ts'), 'utf8');
const keys = [];

for (const match of source.matchAll(/:\s*'((?:\\'|[^'])*)'/g)) {
    keys.push(match[1].replace(/\\'/g, "'"));
}
for (const match of source.matchAll(/:\s*"((?:\\"|[^"])*)"/g)) {
    keys.push(match[1].replace(/\\"/g, '"'));
}
for (const match of source.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*):\s*'((?:\\'|[^'])*)'/gm)) {
    keys.push(match[2].replace(/\\'/g, "'"));
}

const uniqueKeys = [...new Set(keys)];
fs.writeFileSync(path.join(__dirname, 'keys.json'), `${JSON.stringify(uniqueKeys, null, 2)}\n`, 'utf8');
console.log(`Wrote ${uniqueKeys.length} keys to scripts/keys.json`);
