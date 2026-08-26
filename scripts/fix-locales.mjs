import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translate } from 'google-translate-api-x';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json'), 'utf8'));

const RETRY_LOCALES = [
    { lang: 'zh', to: 'zh-CN', forceTo: true },
    { lang: 'fi', to: 'fi', forceTo: false },
    { lang: 'lt', to: 'lt', forceTo: false }
];

const escapeForTs = (value) =>
    JSON.stringify(value)
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

const isIdentifierKey = (key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
const formatKey = (key) => (isIdentifierKey(key) ? key : escapeForTs(key));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const translateOne = async (text, options) => {
    const result = await translate(text, { from: 'en', forceBatch: false, ...options });
    return result.text;
};

const writeLocaleFile = (lang, dictionary) => {
    const outDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
    const lines = ["import type { TranslationDictionary } from './types';", '', `const ${lang}: TranslationDictionary = {`];

    for (const key of keys) {
        const value = dictionary[key] ?? key;
        lines.push(`    ${formatKey(key)}: ${escapeForTs(value)},`);
    }

    lines.push('};', '', `export default ${lang};`, '');
    fs.writeFileSync(path.join(outDir, `${lang}.ts`), lines.join('\n'), 'utf8');
};

const loadLocaleDictionary = (lang) => {
    const localePath = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.ts`);
    const content = fs.readFileSync(localePath, 'utf8');
    const dictionary = {};

    for (const line of content.split('\n')) {
        const quoted = line.match(/^\s+(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),?\s*$/);
        if (quoted) {
            const key = (quoted[1] ?? quoted[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
            const value = (quoted[3] ?? quoted[4]).replace(/\\'/g, "'").replace(/\\"/g, '"');
            dictionary[key] = value;
            continue;
        }
        const identifier = line.match(/^\s+([A-Za-z_][A-Za-z0-9_]*):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),?\s*$/);
        if (identifier) {
            dictionary[identifier[1]] = (identifier[2] ?? identifier[3]).replace(/\\'/g, "'").replace(/\\"/g, '"');
        }
    }

    return dictionary;
};

const main = async () => {
    for (const { lang, to, forceTo } of RETRY_LOCALES) {
        console.log(`Fixing ${lang}...`);
        const dictionary = loadLocaleDictionary(lang);
        const pending = keys.filter((key) => !dictionary[key] || dictionary[key] === key);

        for (const key of pending) {
            try {
                dictionary[key] = await translateOne(key, { to, forceTo });
            } catch (error) {
                console.error(`  failed ${lang} key:`, key.slice(0, 60), error.message);
                dictionary[key] = dictionary[key] || key;
            }
            await sleep(250);
        }

        writeLocaleFile(lang, dictionary);
        console.log(`  rewrote ${lang}.ts (${pending.length} keys updated)`);
    }
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
