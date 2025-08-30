# Jumpman

Jumpman helps you navigate through space-delimited blocks.

Based on the original [Space Block Jumper](https://github.com/jmfirth/vsc-space-block-jumper) extension by jmfirth.

![Demo](./demo.gif?raw=true "Demo")

## Features

- `jumpman.moveUp`: Move up a space block (often `ctrl+up`)
- `jumpman.moveDown`: Move down a space block (often `ctrl+down`)
- `jumpman.selectUp`: Select up a space block (often `shift+ctrl+up`)
- `jumpman.selectDown`: Select down a space block (often `shift+ctrl+down`)

## Known Issues

None at this time.

## Credits

This extension is based on the original [Space Block Jumper](https://github.com/jmfirth/vsc-space-block-jumper) by jmfirth.

## Release Notes

### 1.0.0

- Renamed to Jumpman
- Fixed cursor positioning to jump to the first line of text blocks instead of empty lines
- Modernized build tooling (esbuild, pnpm, Biome)
- Improved test coverage
