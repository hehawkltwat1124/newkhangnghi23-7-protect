import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translate } from 'google-translate-api-x';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json'), 'utf8'));
const LOCALES = (process.argv.slice(2).length ? process.argv.slice(2) : ['tr', 'uk', 'zh']);
const LOCALE_OPTIONS = { zh: { to: 'zh-CN', forceTo: true } };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeForTs = (value) => JSON.stringify(value);
const isIdentifierKey = (key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
const formatKey = (key) => (isIdentifierKey(key) ? key : escapeForTs(key));

const chunk = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const writeLocaleFile = (lang, dictionary) => {
    const outDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
    const lines = ["import type { TranslationDictionary } from './types';", '', `const ${lang}: TranslationDictionary = {`];
    for (const key of keys) {
        lines.push(`    ${formatKey(key)}: ${escapeForTs(dictionary[key] ?? key)},`);
    }
    lines.push('};', '', `export default ${lang};`, '');
    fs.writeFileSync(path.join(outDir, `${lang}.ts`), lines.join('\n'), 'utf8');
};

for (const lang of LOCALES) {
    console.log(`Translating ${lang}...`);
    const dictionary = {};
    const options = LOCALE_OPTIONS[lang] || { to: lang };

    for (const batch of chunk(keys, 15)) {
        try {
            const result = await translate(batch, {
                from: 'en',
                to: options.to || lang,
                forceTo: options.forceTo || false,
                forceBatch: true,
                rejectOnPartialFail: false
            });
            const translated = Array.isArray(result) ? result.map((item) => item?.text || '') : [result.text];
            batch.forEach((key, index) => {
                dictionary[key] = translated[index] || key;
            });
        } catch {
            for (const key of batch) {
                try {
                    const one = await translate(key, {
                        from: 'en',
                        to: options.to || lang,
                        forceTo: options.forceTo || false,
                        forceBatch: false
                    });
                    dictionary[key] = one.text;
                } catch {
                    dictionary[key] = key;
                }
                await sleep(200);
            }
        }
        await sleep(400);
    }

    writeLocaleFile(lang, dictionary);
    console.log(`  wrote ${lang}.ts`);
}

console.log('Done.');
