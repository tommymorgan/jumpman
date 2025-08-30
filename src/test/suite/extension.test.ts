import * as assert from "assert";
import * as vscode from "vscode";

suite("Space Block Jumper", () => {
  let document: vscode.TextDocument;
  let editor: vscode.TextEditor;

  const createDocument = async (content: string) => {
    document = await vscode.workspace.openTextDocument({
      content,
      language: "plaintext",
    });
    editor = await vscode.window.showTextDocument(document);
  };

  const setCursorPosition = (line: number, character: number = 0) => {
    const position = new vscode.Position(line, character);
    editor.selection = new vscode.Selection(position, position);
  };

  const getCursorLine = () => {
    return editor.selection.active.line;
  };

  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  });

  suite("moveDown", () => {
    test("should jump to the first line of the next text block when moving down", async () => {
      await createDocument(
        "first block line 1\n" +
        "first block line 2\n" +
        "\n" +
        "second block line 1\n" +
        "second block line 2\n" +
        "\n" +
        "third block line 1"
      );

      // Start at first line
      setCursorPosition(0);
      
      // Execute moveDown command
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      
      // Should be at line 3 (first line of second block), not line 2 (empty line)
      assert.strictEqual(getCursorLine(), 3, "Cursor should jump to first line of second block");
      
      // Execute moveDown again
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      
      // Should be at line 6 (first line of third block), not line 5 (empty line)
      assert.strictEqual(getCursorLine(), 6, "Cursor should jump to first line of third block");
    });

    test("should jump to first line of next block when starting from middle of current block", async () => {
      await createDocument(
        "first block line 1\n" +
        "first block line 2\n" +
        "first block line 3\n" +
        "\n" +
        "second block line 1\n" +
        "second block line 2"
      );

      // Start in middle of first block
      setCursorPosition(1);
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      
      // Should jump to line 4 (first line of second block)
      assert.strictEqual(getCursorLine(), 4, "Cursor should jump to first line of next block");
    });

    test("should stay at last line when at end of document", async () => {
      await createDocument(
        "first block\n" +
        "\n" +
        "last block"
      );

      setCursorPosition(2); // Last line
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      
      assert.strictEqual(getCursorLine(), 2, "Cursor should stay at last line");
    });
  });

  suite("moveUp", () => {
    test("should jump to the first line of the previous text block when moving up", async () => {
      await createDocument(
        "first block line 1\n" +
        "first block line 2\n" +
        "\n" +
        "second block line 1\n" +
        "second block line 2\n" +
        "\n" +
        "third block line 1"
      );

      // Start at last line
      setCursorPosition(6);
      
      // Execute moveUp command
      await vscode.commands.executeCommand("spaceBlockJumper.moveUp");
      
      // Should be at line 3 (first line of second block), not line 5 (empty line)
      assert.strictEqual(getCursorLine(), 3, "Cursor should jump to first line of second block");
      
      // Execute moveUp again
      await vscode.commands.executeCommand("spaceBlockJumper.moveUp");
      
      // Should be at line 0 (first line of first block), not line 2 (empty line)
      assert.strictEqual(getCursorLine(), 0, "Cursor should jump to first line of first block");
    });

    test("should jump to first line of previous block when starting from middle of current block", async () => {
      await createDocument(
        "first block line 1\n" +
        "first block line 2\n" +
        "\n" +
        "second block line 1\n" +
        "second block line 2\n" +
        "second block line 3"
      );

      // Start in middle of second block
      setCursorPosition(4);
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveUp");
      
      // Should jump to line 0 (first line of first block)
      assert.strictEqual(getCursorLine(), 0, "Cursor should jump to first line of previous block");
    });

    test("should stay at first line when at beginning of document", async () => {
      await createDocument(
        "first block\n" +
        "\n" +
        "second block"
      );

      setCursorPosition(0); // First line
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveUp");
      
      assert.strictEqual(getCursorLine(), 0, "Cursor should stay at first line");
    });
  });

  suite("edge cases", () => {
    test("should handle multiple consecutive empty lines", async () => {
      await createDocument(
        "first block\n" +
        "\n" +
        "\n" +
        "\n" +
        "second block\n" +
        "\n" +
        "\n" +
        "third block"
      );

      setCursorPosition(0);
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      assert.strictEqual(getCursorLine(), 4, "Should jump to first line of second block");
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      assert.strictEqual(getCursorLine(), 7, "Should jump to first line of third block");
    });

    test("should handle document starting with empty lines", async () => {
      await createDocument(
        "\n" +
        "\n" +
        "first block\n" +
        "\n" +
        "second block"
      );

      setCursorPosition(2); // First block
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      assert.strictEqual(getCursorLine(), 4, "Should jump to first line of second block");
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveUp");
      assert.strictEqual(getCursorLine(), 2, "Should jump back to first line of first block");
    });

    test("should handle single line blocks", async () => {
      await createDocument(
        "a\n" +
        "\n" +
        "b\n" +
        "\n" +
        "c"
      );

      setCursorPosition(0);
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      assert.strictEqual(getCursorLine(), 2, "Should jump to line with 'b'");
      
      await vscode.commands.executeCommand("spaceBlockJumper.moveDown");
      assert.strictEqual(getCursorLine(), 4, "Should jump to line with 'c'");
    });
  });
});