import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translate } from 'google-translate-api-x';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json'), 'utf8'));

const ALL_LOCALES = [
    'vi',
    'ar',
    'bg',
    'cs',
    'da',
    'de',
    'el',
    'es',
    'et',
    'fi',
    'fr',
    'ga',
    'he',
    'hi',
    'hr',
    'hu',
    'it',
    'ja',
    'ka',
    'ko',
    'lb',
    'lt',
    'lv',
    'ms',
    'mt',
    'my',
    'nl',
    'no',
    'pl',
    'pt',
    'ro',
    'sk',
    'sl',
    'sv',
    'th',
    'tr',
    'uk',
    'zh'
];

const LOCALE_OPTIONS = {
    zh: { to: 'zh-CN', forceTo: true }
};

const escapeForTs = (value) =>
    JSON.stringify(value)
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

const isIdentifierKey = (key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
const formatKey = (key) => (isIdentifierKey(key) ? key : escapeForTs(key));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        const value = dictionary[key] ?? key;
        lines.push(`    ${formatKey(key)}: ${escapeForTs(value)},`);
    }

    lines.push('};', '', `export default ${lang};`, '');
    fs.writeFileSync(path.join(outDir, `${lang}.ts`), lines.join('\n'), 'utf8');
};

const translateOne = async (text, lang) => {
    const options = LOCALE_OPTIONS[lang] || { to: lang };
    const result = await translate(text, { from: 'en', forceBatch: false, rejectOnPartialFail: false, ...options });
    return result.text;
};

const translateLocale = async (lang) => {
    console.log(`Translating ${lang} (${keys.length} keys)...`);
    const dictionary = {};
    const batches = chunk(keys, 15);

    for (const [index, batch] of batches.entries()) {
        try {
            const options = LOCALE_OPTIONS[lang] || { to: lang };
            const result = await translate(batch, {
                from: 'en',
                to: options.to || lang,
                forceTo: options.forceTo || false,
                forceBatch: true,
                rejectOnPartialFail: false
            });
            const translated = Array.isArray(result) ? result.map((item) => item.text) : [result.text];
            batch.forEach((key, i) => {
                dictionary[key] = translated[i] || key;
            });
        } catch (error) {
            console.error(`  batch ${index + 1} failed for ${lang}:`, error.message);
            for (const key of batch) {
                try {
                    dictionary[key] = await translateOne(key, lang);
                } catch {
                    dictionary[key] = key;
                }
                await sleep(200);
            }
        }
        await sleep(500);
    }

    writeLocaleFile(lang, dictionary);
    const untranslated = keys.filter((key) => dictionary[key] === key).length;
    console.log(`  wrote ${lang}.ts (${untranslated} keys still English)`);
};

const main = async () => {
    for (const lang of ALL_LOCALES) {
        await translateLocale(lang);
    }
    console.log('Done.');
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
