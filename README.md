# Stream Yap Yap

Stable Twitch Chat-to-TTS application built with Electron, React, and TypeScript.

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# In another terminal, start Electron
npm start
```

## Build

```bash
# Build for production
npm run build

# Package for your platform
npm run package

# Package for specific platforms
npm run package:mac
npm run package:win
npm run package:linux
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main entry point
│   └── preload.ts  # IPC bridge
└── renderer/       # React renderer process
    ├── App.tsx     # Main app component
    ├── index.tsx   # React entry point
    ├── pages/      # Page components
    └── styles/     # CSS styles
```

## Features (Planned)

- ✅ Project setup with Electron + React + TypeScript
- 🔄 TMI.js Twitch chat integration
- 🔄 Multi-provider TTS (WebSpeech, AWS, Azure, Google)
- 🔄 SQLite database with better-sqlite3
- 🔄 Viewer management
- 🔄 Chat commands
- 🔄 Discord bot integration

See [PLAN.md](PLAN.md) for full development plan.
