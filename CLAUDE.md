# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VSCode extension called "Space Block Jumper" that enables quick navigation through space-delimited blocks in code. It's a web-enabled extension that works in both VSCode desktop and web environments.

## Common Development Commands

### Build and Development
- `npm run compile` - Compile the extension using webpack
- `npm run watch` - Watch mode for development (auto-recompile on changes)
- `npm run package` - Build production bundle

### Testing
- `npm test` - Run the full test suite (includes linting, compilation, and tests)
- `npm run compile-tests` - Compile test files to ./out directory
- `npm run watch-tests` - Watch mode for test files

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files in src/

### Pre-commit
The project uses Husky for pre-commit hooks that automatically run `npm test` before commits.

## Architecture

### Core Navigation Logic
The extension's core functionality is in `src/extension.ts` and consists of:

1. **Position Calculation**: The `nextPosition()` and `afterBlock()` functions implement the recursive algorithm to find the next/previous space-delimited block boundary.

2. **Selection Management**: The `anchorPosition()` and `markSelection()` functions handle cursor positioning and text selection during navigation.

3. **Command Registration**: Four commands are registered:
   - `spaceBlockJumper.moveUp` - Move cursor up to previous block
   - `spaceBlockJumper.moveDown` - Move cursor down to next block  
   - `spaceBlockJumper.selectUp` - Select text while moving up
   - `spaceBlockJumper.selectDown` - Select text while moving down

### Build Configuration
- **Webpack**: Configured for both node and web targets with TypeScript compilation via ts-loader
- **Output**: Bundled to `dist/extension.js` (both main and browser entry points)
- **TypeScript**: Strict mode enabled, targeting ES2020

### Testing Approach
Tests are located in `src/test/suite/` and use the VSCode test runner with Mocha. The current test suite is minimal with placeholder tests only.