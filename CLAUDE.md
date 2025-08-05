# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "WorldClock Pro" that displays UTC time and allows users to track multiple time zones with professional-grade accuracy. The extension is built using Manifest V3 and vanilla JavaScript.

## Development Commands

- **Lint code**: `npx eslint .` or `yarn eslint .`
- **Format code**: `npx prettier --write .` or `yarn prettier --write .`
- **Install dependencies**: `yarn install` (uses Yarn as package manager)

## Architecture

### Core Components

- **manifest.json**: Chrome extension manifest (v3) defining permissions, background scripts, and popup
- **background.js**: Service worker that updates time data every minute using chrome.alarms API
- **popup.html/popup.js**: Main UI for displaying UTC time and managing selected time zones
- **timezoneDatabase.js**: Dynamic timezone database with DST transitions (5.8MB, 294 timezones)

### Key Features

- Displays current UTC time in ISO format
- Allows users to add up to 5 custom time zones with search/filter functionality
- **Dynamic timezone system**: Accurate DST transitions, real-time abbreviations (EST↔EDT)
- **TimezoneDB integration**: Uses TimezoneDB CSV data for precise timezone calculations
- **Binary search optimization**: Fast O(log n) timezone lookups
- Persistent storage of user preferences via chrome.storage.local
- Internationalization support with 50+ locales in \_locales/ directory

### Data Flow

1. Background service worker updates time data every minute
2. Time data stored in chrome.storage.local
3. Popup retrieves and displays stored time data
4. User can add/remove/reorder time zones, changes saved to storage

### Code Style

- Uses Prettier with 2-space indentation, no tabs
- ESLint for code quality
- No build process - vanilla JavaScript files served directly

### File Structure

- Root level: Core extension files (manifest, background, popup, timezone database)
- `_locales/`: Internationalization messages for 50+ languages
- `icons/`: Extension icons
- `node_modules/`: Dependencies (ESLint, Prettier)

### External Dependencies

- No external runtime dependencies (SortableJS removed)
- No build tools or bundlers - direct file serving
