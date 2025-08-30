# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VSCode extension called "Jumpman" that enables quick navigation through space-delimited blocks in code. It's a web-enabled extension that works in both VSCode desktop and web environments.

## Common Development Commands

### Build and Development
- `pnpm run compile` - Compile the extension using esbuild
- `pnpm run watch` - Watch mode for development (auto-recompile on changes)
- `pnpm run package` - Build production bundle

### Testing
- `pnpm test` - Run the full test suite (includes compilation and tests)
- `pnpm run pretest` - Compile test files to ./out directory
- `pnpm run test:unit` - Run unit tests with Vitest

### Code Quality
- `pnpm run lint` - Run Biome linter on src/
- `pnpm run lint:check` - Check linting without fixing
- `pnpm run format` - Format code with Biome


## Architecture

### Core Navigation Logic
The extension's core functionality is in `src/extension.ts` and consists of:

1. **Position Calculation**: The `nextPosition()` function implements an iterative algorithm to find the next/previous space-delimited block boundary, correctly jumping to the first line of text blocks.

2. **Selection Management**: The `anchorPosition()` and `markSelection()` functions handle cursor positioning and text selection during navigation.

3. **Command Registration**: Four commands are registered:
   - `jumpman.moveUp` - Move cursor up to previous block
   - `jumpman.moveDown` - Move cursor down to next block  
   - `jumpman.selectUp` - Select text while moving up
   - `jumpman.selectDown` - Select text while moving down

### Build Configuration
- **esbuild**: Ultra-fast bundler configured for both node and web targets
- **Output**: Bundled to `dist/extension.js` (both main and browser entry points)
- **TypeScript**: Latest version with strict mode enabled, targeting ES2020

### Testing Approach
Tests are located in `src/test/suite/` and use the VSCode test runner with Mocha. The test suite includes comprehensive tests for move up/down functionality and edge cases.