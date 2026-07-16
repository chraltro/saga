# Saga

Reads a book (.txt or .epub), splits it into chapters, and generates a short
summary for each one with the Gemini API. There is also a chat window for asking
questions about the book, with an option to hold the model to what you have read
so far. Your library is stored in a private GitHub Gist so it follows you
between devices.

Live at https://chraltro.github.io/saga

## What you need

- A [Gemini API key](https://aistudio.google.com/app/apikey)
- A [GitHub personal access token](https://github.com/settings/tokens/new?scopes=gist)
  with the `gist` scope, for the library

## Usage

1. Sign in with Google (keys sync to Firestore) or enter the keys manually
   (this device only).
2. Upload a .txt or .epub file.
3. Pick chapters to summarize, or use "Summarize Next 5".

Summaries are three bullets plus one quote. The chat window defaults to the
current chapter only; you can widen the context or allow spoilers in its
settings.

## Chapter detection

TXT files are split on lines that look like headings: "Chapter 12",
"CHAPTER XIV", "Part 3", a bare numeral, or a short all-caps line, each on its
own line after a blank one. Table-of-contents rows and common front matter are
skipped. It is heuristic and will not get every book right.

EPUB files are read through the spine, with chapter titles taken from the table
of contents when the hrefs line up.

## Storage

- API keys: `localStorage`, plus Firestore if you sign in with Google.
- Library (chapters, summaries): a private GitHub Gist owned by your account.
  Large books are split across several files to stay under the per-file limit.

## Local development

```bash
npm install
npm run dev
```

The dev server runs on http://localhost:3000

Summaries and chat use the key entered in the app, so no env var is needed for
normal use. `vite.config.ts` also reads `GEMINI_API_KEY` and inlines it as
`process.env.API_KEY` at build time; nothing in the app currently depends on it.

```bash
npm run typecheck
npm run build
```

## Built with

- React 19, TypeScript, Vite
- `@google/genai` against `gemini-3.5-flash`
- marked and DOMPurify for chat rendering
- Tailwind, JSZip, and epub.js are loaded from CDNs in `index.html`, not bundled.
  The Tailwind CDN build is not what Tailwind recommends for production; it is
  used here because it keeps the setup small.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which typechecks,
builds, and publishes `dist/` to GitHub Pages. Build output is not committed.

## License

MIT, see [LICENSE](LICENSE).
