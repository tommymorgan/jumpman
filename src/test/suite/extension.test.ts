import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";

suite("Jumpman", () => {
	let document: vscode.TextDocument;
	let editor: vscode.TextEditor;

	suiteSetup(async () => {
		// Activate the extension by importing it directly
		const extensionPath = path.resolve(
			__dirname,
			"../../../../dist/extension.js",
		);
		const extension = require(extensionPath);
		if (extension.activate) {
			// Create a mock context for activation
			const context = {
				subscriptions: [],
			};
			await extension.activate(context);
		}
	});

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
				`first block line 1
first block line 2

second block line 1
second block line 2

third block line 1`,
			);

			// Start at first line
			setCursorPosition(0);

			// Execute moveDown command
			await vscode.commands.executeCommand("jumpman.moveDown");

			// Should be at line 3 (first line of second block), not line 2 (empty line)
			assert.strictEqual(
				getCursorLine(),
				3,
				"Cursor should jump to first line of second block",
			);

			// Execute moveDown again
			await vscode.commands.executeCommand("jumpman.moveDown");

			// Should be at line 6 (first line of third block), not line 5 (empty line)
			assert.strictEqual(
				getCursorLine(),
				6,
				"Cursor should jump to first line of third block",
			);
		});

		test("should jump to first line of next block when starting from middle of current block", async () => {
			await createDocument(
				`first block line 1
first block line 2
first block line 3

second block line 1
second block line 2`,
			);

			// Start in middle of first block
			setCursorPosition(1);

			await vscode.commands.executeCommand("jumpman.moveDown");

			// Should jump to line 4 (first line of second block)
			assert.strictEqual(
				getCursorLine(),
				4,
				"Cursor should jump to first line of next block",
			);
		});

		test("should stay at last line when at end of document", async () => {
			await createDocument(`first block

last block`);

			setCursorPosition(2); // Last line

			await vscode.commands.executeCommand("jumpman.moveDown");

			assert.strictEqual(getCursorLine(), 2, "Cursor should stay at last line");
		});
	});

	suite("moveUp", () => {
		test("should jump to the first line of the previous text block when moving up", async () => {
			await createDocument(
				`first block line 1
first block line 2

second block line 1
second block line 2

third block line 1`,
			);

			// Start at last line
			setCursorPosition(6);

			// Execute moveUp command
			await vscode.commands.executeCommand("jumpman.moveUp");

			// Should be at line 3 (first line of second block), not line 5 (empty line)
			assert.strictEqual(
				getCursorLine(),
				3,
				"Cursor should jump to first line of second block",
			);

			// Execute moveUp again
			await vscode.commands.executeCommand("jumpman.moveUp");

			// Should be at line 0 (first line of first block), not line 2 (empty line)
			assert.strictEqual(
				getCursorLine(),
				0,
				"Cursor should jump to first line of first block",
			);
		});

		test("should jump to first line of previous block when starting from middle of current block", async () => {
			await createDocument(
				`first block line 1
first block line 2

second block line 1
second block line 2
second block line 3`,
			);

			// Start in middle of second block
			setCursorPosition(4);

			await vscode.commands.executeCommand("jumpman.moveUp");

			// Should jump to line 0 (first line of first block)
			assert.strictEqual(
				getCursorLine(),
				0,
				"Cursor should jump to first line of previous block",
			);
		});

		test("should stay at first line when at beginning of document", async () => {
			await createDocument(`first block

second block`);

			setCursorPosition(0); // First line

			await vscode.commands.executeCommand("jumpman.moveUp");

			assert.strictEqual(
				getCursorLine(),
				0,
				"Cursor should stay at first line",
			);
		});
	});

	suite("edge cases", () => {
		test("should handle multiple consecutive empty lines", async () => {
			await createDocument(
				`first block



second block


third block`,
			);

			setCursorPosition(0);

			await vscode.commands.executeCommand("jumpman.moveDown");
			assert.strictEqual(
				getCursorLine(),
				4,
				"Should jump to first line of second block",
			);

			await vscode.commands.executeCommand("jumpman.moveDown");
			assert.strictEqual(
				getCursorLine(),
				7,
				"Should jump to first line of third block",
			);
		});

		test("should handle document starting with empty lines", async () => {
			await createDocument(
				`

first block

second block`,
			);

			setCursorPosition(2); // First block

			await vscode.commands.executeCommand("jumpman.moveDown");
			assert.strictEqual(
				getCursorLine(),
				4,
				"Should jump to first line of second block",
			);

			await vscode.commands.executeCommand("jumpman.moveUp");
			assert.strictEqual(
				getCursorLine(),
				2,
				"Should jump back to first line of first block",
			);
		});

		test("should handle single line blocks", async () => {
			await createDocument(`a

b

c`);

			setCursorPosition(0);

			await vscode.commands.executeCommand("jumpman.moveDown");
			assert.strictEqual(getCursorLine(), 2, "Should jump to line with 'b'");

			await vscode.commands.executeCommand("jumpman.moveDown");
			assert.strictEqual(getCursorLine(), 4, "Should jump to line with 'c'");
		});

		test("should treat collapsed regions containing multiple blocks as single units", async () => {
			// NOTE: VSCode's test environment doesn't properly support code folding.
			// The `editor.fold` command executes but `visibleRanges` doesn't update to reflect
			// the collapsed state. This is a known limitation - VSCode's own folding tests
			// don't use visibleRanges either, they test the folding model directly.
			//
			// See VSCode's approach:
			// https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/folding/test/browser/foldingModel.test.ts
			// They test folding by directly manipulating the FoldingModel, not through visibleRanges.
			//
			// Related issues documenting visibleRanges problems in tests:
			// - https://github.com/microsoft/vscode/issues/93127 (visibleRanges not correct when changing editors)
			// - https://github.com/microsoft/vscode/issues/157194 (visibleRanges not up to date)
			//
			// We mock visibleRanges here to test our collapsed region navigation logic.
			// This mock can be removed if/when:
			// 1. VSCode provides a folding model API for extensions to query collapse state
			// 2. VSCode fixes visibleRanges to work correctly in test environments
			// 3. We refactor to use a different approach (e.g., direct folding model access if it becomes available)

			// Create a document where a function contains multiple blocks separated by empty lines
			await createDocument(
				`before function

function complexFunction() {
  // First block inside function
  const a = 1;
  const b = 2;

  // Second block inside function
  const c = 3;
  const d = 4;

  // Third block inside function
  return a + b + c + d;
}

after function`,
			);

			// Mock visibleRanges to simulate a collapsed function (lines 2-13)
			// In real VSCode:
			// - Line 2 remains visible showing "function complexFunction() { ... }"
			// - Lines 3-13 become hidden (inside the collapsed region)
			// - Lines 14-15 remain visible
			
			// Create a mock editor object with our simulated visibleRanges
			const mockVisibleRanges = [
				new vscode.Range(0, 0, 2, Number.MAX_SAFE_INTEGER),  // Lines 0-2 visible (before and including function start)
				new vscode.Range(14, 0, 15, Number.MAX_SAFE_INTEGER)  // Lines 14-15 visible (after function)
			];
			
			// Temporarily replace vscode.window.activeTextEditor to return our mock
			// The mock needs to be created dynamically to reflect current selection state
			const originalActiveTextEditor = vscode.window.activeTextEditor;
			Object.defineProperty(vscode.window, 'activeTextEditor', {
				get: () => {
					// Create a proxy that intercepts visibleRanges but passes everything else through
					return new Proxy(editor, {
						get(target, prop) {
							if (prop === 'visibleRanges') {
								return mockVisibleRanges;
							}
							// @ts-expect-error - TypeScript can't verify the type of dynamically accessed properties on Proxy target
							return target[prop];
						},
						set(target, prop, value) {
							// @ts-expect-error - TypeScript can't verify the type when setting dynamic properties on Proxy target
							target[prop] = value;
							return true;
						}
					}) as vscode.TextEditor;
				},
				configurable: true
			});

			try {
				// Start at line 0 (before the collapsed function)
				setCursorPosition(0);

				// Moving down should jump to the collapsed function start, not to blocks inside it
				await vscode.commands.executeCommand("jumpman.moveDown");
				assert.strictEqual(
					getCursorLine(),
					2,
					"Should jump to start of collapsed function",
				);

				// Moving down again should skip the entire collapsed region and jump to "after function"
				await vscode.commands.executeCommand("jumpman.moveDown");
				assert.strictEqual(
					getCursorLine(),
					15,
					"Should jump from collapsed region to next block outside, skipping internal blocks",
				);

				// Moving up should jump back to the collapsed function
				await vscode.commands.executeCommand("jumpman.moveUp");
				assert.strictEqual(
					getCursorLine(),
					2,
					"Should jump back to start of collapsed region",
				);

				// Moving up again should jump to "before function"
				await vscode.commands.executeCommand("jumpman.moveUp");
				assert.strictEqual(
					getCursorLine(),
					0,
					"Should jump to block before collapsed region",
				);
			} finally {
				// Restore original activeTextEditor
				Object.defineProperty(vscode.window, 'activeTextEditor', {
					get: () => originalActiveTextEditor,
					configurable: true
				});
			}
		});

		test("should jump across collapsed regions when using moveUp", async () => {
			// This test reproduces the bug found when testing in src/test/runTest.ts
			// When a function is collapsed and we're below it, moveUp should jump to
			// the function declaration line, not the closing brace
			
			// Create a document similar to runTest.ts structure
			await createDocument(
				`import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		const extensionDevelopmentPath = path.resolve(__dirname, "../../../");

		// The path to the test runner script (compiled)
		const extensionTestsPath = path.resolve(__dirname, "./suite/index");

		// Download VS Code, unzip it and run the integration test
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [], // Don't disable extensions, we need our extension to load
		});
	} catch (err) {
		console.error("Failed to run tests:", err);
		process.exit(1);
	}
}

main();`,
			);

			// Start at line 23 (main(); call) - do this before setting up the mock
			setCursorPosition(23);
			
			// Mock visibleRanges to simulate the function body is collapsed (lines 4-21 hidden)
			// Only the function declaration line (3) and closing brace (21) are visible
			const mockVisibleRanges = [
				new vscode.Range(0, 0, 3, Number.MAX_SAFE_INTEGER),   // Lines 0-3 visible (imports and function declaration)
				new vscode.Range(21, 0, 23, Number.MAX_SAFE_INTEGER)  // Lines 21-23 visible (closing brace, empty line, main() call)
			];
			
			// Set up mock using proxy approach
			const originalActiveTextEditor = vscode.window.activeTextEditor;
			Object.defineProperty(vscode.window, 'activeTextEditor', {
				get: () => {
					return new Proxy(editor, {
						get(target, prop) {
							if (prop === 'visibleRanges') {
								return mockVisibleRanges;
							}
							// @ts-expect-error - TypeScript can't verify the type of dynamically accessed properties on Proxy target
							return target[prop];
						},
						set(target, prop, value) {
							// @ts-expect-error - TypeScript can't verify the type when setting dynamic properties on Proxy target
							target[prop] = value;
							return true;
						}
					}) as vscode.TextEditor;
				},
				configurable: true
			});

			try {
				
				// Debug: Check if our mock is working
				const mockedEditor = vscode.window.activeTextEditor;
				console.log("Mocked editor visibleRanges:", mockedEditor?.visibleRanges?.map(r => `${r.start.line}-${r.end.line}`));
				console.log("Editor document matches:", mockedEditor?.document === editor.document);
				
				// Test isLineVisible directly
				const testVisibility = (line: number) => {
					const ranges = mockedEditor?.visibleRanges || [];
					return ranges.some(r => line >= r.start.line && line <= r.end.line);
				};
				console.log("Line 20 visible?", testVisibility(20)); // Should be false
				console.log("Line 21 visible?", testVisibility(21)); // Should be true
				console.log("Line 3 visible?", testVisibility(3));   // Should be true
				console.log("Line 3 content:", editor.document.lineAt(3).text);
				console.log("Line 3 is empty?", editor.document.lineAt(3).isEmptyOrWhitespace);
				console.log("Has editor?", !!mockedEditor);
				console.log("Has visibleRanges?", !!mockedEditor?.visibleRanges);
				
				// BUG: Currently moveUp jumps to line 21 (closing brace) instead of line 3
				// This happens because the algorithm finds line 21 as visible, then tries to 
				// find the start of that block but can't go further back due to collapsed lines
				await vscode.commands.executeCommand("jumpman.moveUp");
				
				const resultLine = getCursorLine();
				console.log(`Result: cursor at line ${resultLine}, expected line 3`);
				
				assert.strictEqual(
					resultLine,
					3,  // Expected: should jump to line 3 (function declaration)
					"Should jump to function declaration at line 3, not closing brace at line 21"
				);
				
				// Moving up again should jump to line 0 (first import)
				await vscode.commands.executeCommand("jumpman.moveUp");
				assert.strictEqual(
					getCursorLine(),
					0,
					"Should jump to first import at line 0"
				);
			} finally {
				// Restore original activeTextEditor
				Object.defineProperty(vscode.window, 'activeTextEditor', {
					get: () => originalActiveTextEditor,
					configurable: true
				});
			}
		});

		test("should select across collapsed regions when using selectUp", async () => {
			// This test verifies that selectUp properly extends selection across collapsed regions
			// Similar to the moveUp test, but maintains selection anchor point
			
			// Create a document with a collapsible function
			await createDocument(
				`before function

function complexFunction() {
  // First block inside function
  const a = 1;
  const b = 2;

  // Second block inside function
  const c = 3;
  const d = 4;

  // Third block inside function
  return a + b + c + d;
}

after function`,
			);

			// Mock visibleRanges to simulate a collapsed function (lines 2-13)
			const mockVisibleRanges = [
				new vscode.Range(0, 0, 2, Number.MAX_SAFE_INTEGER),  // Lines 0-2 visible
				new vscode.Range(14, 0, 15, Number.MAX_SAFE_INTEGER)  // Lines 14-15 visible
			];
			
			// Set up mock using the same proxy approach
			const originalActiveTextEditor = vscode.window.activeTextEditor;
			Object.defineProperty(vscode.window, 'activeTextEditor', {
				get: () => {
					return new Proxy(editor, {
						get(target, prop) {
							if (prop === 'visibleRanges') {
								return mockVisibleRanges;
							}
							// @ts-expect-error - TypeScript can't verify the type of dynamically accessed properties on Proxy target
							return target[prop];
						},
						set(target, prop, value) {
							// @ts-expect-error - TypeScript can't verify the type when setting dynamic properties on Proxy target
							target[prop] = value;
							return true;
						}
					}) as vscode.TextEditor;
				},
				configurable: true
			});

			try {
				// Start at line 15 (after function)
				setCursorPosition(15);
				
				// SelectUp should select from line 15 to the start of the collapsed function (line 2)
				// It should treat the collapsed region as a single unit
				await vscode.commands.executeCommand("jumpman.selectUp");
				
				const selection = editor.selection;
				assert.strictEqual(
					selection.anchor.line,
					15,
					"Selection anchor should remain at line 15"
				);
				assert.strictEqual(
					selection.active.line,
					2,
					"Selection should extend to start of collapsed function at line 2"
				);
				assert.strictEqual(
					selection.isEmpty,
					false,
					"Selection should not be empty"
				);
				
				// SelectUp again should extend selection to line 0 (before function)
				await vscode.commands.executeCommand("jumpman.selectUp");
				
				const selection2 = editor.selection;
				assert.strictEqual(
					selection2.anchor.line,
					15,
					"Selection anchor should still be at line 15"
				);
				assert.strictEqual(
					selection2.active.line,
					0,
					"Selection should extend to line 0"
				);
			} finally {
				// Restore original activeTextEditor
				Object.defineProperty(vscode.window, 'activeTextEditor', {
					get: () => originalActiveTextEditor,
					configurable: true
				});
			}
		});

		test("should select across collapsed regions when using selectDown", async () => {
			// This test verifies that selectDown properly extends selection across collapsed regions
			// Similar to the moveDown test, but maintains selection anchor point
			
			// Create a document with a collapsible function
			await createDocument(
				`before function

function complexFunction() {
  // First block inside function
  const a = 1;
  const b = 2;

  // Second block inside function
  const c = 3;
  const d = 4;

  // Third block inside function
  return a + b + c + d;
}

after function`,
			);

			// Mock visibleRanges to simulate a collapsed function (lines 2-13)
			const mockVisibleRanges = [
				new vscode.Range(0, 0, 2, Number.MAX_SAFE_INTEGER),  // Lines 0-2 visible
				new vscode.Range(14, 0, 15, Number.MAX_SAFE_INTEGER)  // Lines 14-15 visible
			];
			
			// Set up mock using the same proxy approach
			const originalActiveTextEditor = vscode.window.activeTextEditor;
			Object.defineProperty(vscode.window, 'activeTextEditor', {
				get: () => {
					return new Proxy(editor, {
						get(target, prop) {
							if (prop === 'visibleRanges') {
								return mockVisibleRanges;
							}
							// @ts-expect-error - TypeScript can't verify the type of dynamically accessed properties on Proxy target
							return target[prop];
						},
						set(target, prop, value) {
							// @ts-expect-error - TypeScript can't verify the type when setting dynamic properties on Proxy target
							target[prop] = value;
							return true;
						}
					}) as vscode.TextEditor;
				},
				configurable: true
			});

			try {
				// Start at line 0 (before function)
				setCursorPosition(0);
				
				// SelectDown should select from line 0 to the start of the collapsed function (line 2)
				await vscode.commands.executeCommand("jumpman.selectDown");
				
				const selection = editor.selection;
				assert.strictEqual(
					selection.anchor.line,
					0,
					"Selection anchor should remain at line 0"
				);
				assert.strictEqual(
					selection.active.line,
					2,
					"Selection should extend to start of collapsed function at line 2"
				);
				assert.strictEqual(
					selection.isEmpty,
					false,
					"Selection should not be empty"
				);
				
				// SelectDown again should extend selection past the collapsed region to line 15
				await vscode.commands.executeCommand("jumpman.selectDown");
				
				const selection2 = editor.selection;
				assert.strictEqual(
					selection2.anchor.line,
					0,
					"Selection anchor should still be at line 0"
				);
				assert.strictEqual(
					selection2.active.line,
					15,
					"Selection should extend past collapsed region to line 15"
				);
			} finally {
				// Restore original activeTextEditor
				Object.defineProperty(vscode.window, 'activeTextEditor', {
					get: () => originalActiveTextEditor,
					configurable: true
				});
			}
		});
	});
});
