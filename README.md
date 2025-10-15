# Saga - Tales Retold by AI

A Norse mythology-inspired book chapter summarizer that uses AI to generate summaries and saves your library to GitHub Gists for cross-device access.

## Features

- 📖 Upload books in `.txt` or `.epub` format
- 🤖 AI-powered chapter summaries using Gemini 2.5 Flash
- 🎨 AI-generated chapter images using Imagen
- ☁️ Cross-device sync via GitHub Gists
- 🎨 Beautiful Norse-inspired UI with amber/bronze tones

## Prerequisites

Before using SAGA, you'll need:

1. **Node.js** (for local development)
2. **GitHub Personal Access Token** with `gist` scope
   - Create one here: https://github.com/settings/tokens/new?scopes=gist
3. **Gemini API Key**
   - Get one here: https://aistudio.google.com/app/apikey

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Open your browser and enter your credentials:
   - **GitHub PAT**: Your Personal Access Token (used to save books to Gists)
   - **Gemini API Key**: Your API key (used to generate summaries)

## How It Works

1. **Login**: Enter your GitHub PAT and Gemini API key
2. **Upload**: Upload a book file (.txt or .epub)
3. **Summarize**: Click on chapters to generate AI summaries
4. **Sync**: Your library is automatically saved to a private GitHub Gist
5. **Access Anywhere**: Log in from any device to access your library

## Data Storage

- **Credentials**: Stored locally in your browser's localStorage
- **Book Library**: Stored in a private GitHub Gist (cross-device)
- **Privacy**: Your credentials are never sent to any servers except GitHub and Google APIs

## Technologies

- React + TypeScript
- Tailwind CSS
- Gemini 2.5 Flash (summaries)
- Imagen 4.0 (images)
- GitHub Gists (cloud storage)
