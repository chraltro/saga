# Saga - Book Summarizer

A chapter-by-chapter book analysis tool supporting TXT and EPUB formats with cross-device library synchronization via GitHub Gists.

## Features

- TXT and EPUB file support with automatic chapter detection
- Chapter summaries generated via Gemini 2.5 Flash
- Optional chapter images via Imagen 4.0
- Library persistence through private GitHub Gists
- Cross-device access with cloud synchronization
- Reading progress tracking
- Mobile-responsive interface

## Prerequisites

- [GitHub Personal Access Token](https://github.com/settings/tokens/new?scopes=gist) with `gist` scope
- [Google Gemini API key](https://aistudio.google.com/app/apikey)

## Usage

1. Enter your credentials (stored locally in browser)
2. Upload a book file (TXT or EPUB)
3. Browse chapters and generate summaries as needed
4. Your library syncs automatically to a private Gist

## How It Works

The application parses uploaded books into chapters, then generates summaries on demand. Each book's metadata and summaries are stored in a private GitHub Gist, allowing access from any device with the same credentials.

### File Format Support

- **TXT files:** Chapter detection via heading patterns and blank lines
- **EPUB files:** Automatic parsing using epub.js with chapter extraction from the book's table of contents

### Data Storage

- **Credentials:** Browser `localStorage` (local only)
- **Library:** Private GitHub Gist (user-owned cloud storage)
- **Books:** Processed and cached client-side during session

## Local Development

```bash
git clone https://github.com/chraltro/saga.git
cd saga
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Tech Stack

- React 19 with TypeScript
- Vite build tool
- Tailwind CSS
- Gemini 2.5 Flash (summaries)
- Imagen 4.0 (images)
- epub.js (EPUB parsing)
- GitHub Gists API

## Deployment

```bash
npm run build
```

Deploy the `dist/` directory to any static hosting service.

## License

MIT
