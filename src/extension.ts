"use strict";

import * as vscode from "vscode";

function nextPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
  up: boolean = false
): number {
  const step = up ? -1 : 1;
  const boundary = up ? 0 : document.lineCount - 1;
  if (position.line === boundary) return position.line;
  
  // First, skip to the end of the current block
  let index = position.line;
  while (index !== boundary && !document.lineAt(index).isEmptyOrWhitespace) {
    index += step;
  }
  
  // Then skip empty lines
  while (index !== boundary && document.lineAt(index).isEmptyOrWhitespace) {
    index += step;
  }
  
  // If we're moving up, we need to find the start of the block we just entered
  if (up && index !== boundary && !document.lineAt(index).isEmptyOrWhitespace) {
    // We're at the last line of a block, move to its first line
    while (index > 0 && !document.lineAt(index - 1).isEmptyOrWhitespace) {
      index--;
    }
  }
  
  // Return the first line of the next/previous block (or boundary if we reached it)
  return index;
}

function anchorPosition(selection: vscode.Selection) {
  return selection.active.line === selection.end.line
    ? selection.start
    : selection.end;
}

function markSelection(
  editor: vscode.TextEditor,
  next: number,
  anchor?: vscode.Position
) {
  const active = editor.selection.active.with(next, 0);
  editor.selection = new vscode.Selection(anchor || active, active);
  editor.revealRange(new vscode.Range(active, active));
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("spaceBlockJumper.moveUp", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      markSelection(
        editor,
        nextPosition(editor.document, editor.selection.active, true)
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("spaceBlockJumper.moveDown", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      markSelection(
        editor,
        nextPosition(editor.document, editor.selection.active, false)
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("spaceBlockJumper.selectUp", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      markSelection(
        editor,
        nextPosition(editor.document, editor.selection.active, true),
        anchorPosition(editor.selection)
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("spaceBlockJumper.selectDown", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      markSelection(
        editor,
        nextPosition(editor.document, editor.selection.active, false),
        anchorPosition(editor.selection)
      );
    })
  );
}

export function deactivate() {}
