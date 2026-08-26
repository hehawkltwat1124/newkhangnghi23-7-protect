# Static i18n locales

This project uses static translation dictionaries. No runtime translation API is called.

## Supported languages

`ar`, `bg`, `cs`, `da`, `de`, `el`, `es`, `et`, `fi`, `fr`, `ga`, `he`, `hi`, `hr`, `hu`, `it`, `ja`, `ka`, `ko`, `lb`, `lt`, `lv`, `ms`, `mt`, `my`, `nl`, `no`, `pl`, `pt`, `ro`, `sk`, `sl`, `sv`, `th`, `tr`, `uk`, `vi`, `zh`

English (`en`) is the source language and is used when no locale dictionary is needed.

Language aliases:
- `iw` -> `he` (Hebrew)
- `yue`, `zh-cn`, `zh-tw` -> `zh` (Chinese)

Country to language mapping lives in `src/utils/country_to_language.ts`.

## How to add a new language

1. Create a file in this folder, for example `fr.ts`.
2. Export `TranslationDictionary` with English source text as key and translated text as value.
3. Register locale in `src/i18n/locales/index.ts`:
   - import your locale file
   - add it to `LOCALES` using language code key (for example `fr`)

## Regenerate locales

```bash
pnpm locales:generate
pnpm locales:fix
```

- `locales:generate` creates/updates all locale files from English keys.
- `locales:fix` re-translates keys that still match English (useful after partial API failures).

## Behavior

- If a locale dictionary exists, matching strings are translated.
- If a key is missing, English source text is kept.
- If locale is missing entirely, English is used.