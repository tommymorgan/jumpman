import * as assert from "node:assert";
import * as vscode from "vscode";
import { _internal } from "../../extension";
import {
	createLineAtSimple,
	createLineAtWithSpecial,
	createMockLine,
	type MockLine,
} from "./test-helpers";

const { findNextVisibleBlock, findPreviousVisibleBlock } = _internal;

// Type definitions for mocks
interface MockDocument {
	lineCount: number;
	lineAt: (index: number) => MockLine;
}

interface MockEditor {
	visibleRanges: vscode.Range[];
}

suite("Internal Functions", () => {
	suite("findNextVisibleBlock", () => {
		test("should find next block when starting in a block", () => {
			// Mock document with blocks separated by empty lines
			const mockDoc: MockDocument = {
				lineCount: 10,
				lineAt: createLineAtSimple([2, 6]),
			};

			// No editor (no collapsed regions)
			const result = findNextVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				0,
				9,
				undefined,
			);
			assert.strictEqual(result, 3, "Should skip to line 3 after empty line 2");
		});

		test("should skip collapsed regions and closing braces", () => {
			const specialCases = new Map([[7, "}"]]);
			const mockDoc: MockDocument = {
				lineCount: 10,
				lineAt: createLineAtWithSpecial([2, 8], specialCases),
			};

			// Mock editor with collapsed region (lines 3-6 not visible)
			const mockEditor: MockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 2, Number.MAX_SAFE_INTEGER),
					new vscode.Range(7, 0, 9, Number.MAX_SAFE_INTEGER),
				],
			};

			const result = findNextVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				0,
				9,
				mockEditor as unknown as vscode.TextEditor,
			);
			// Should skip past collapsed region and closing brace to line 9
			assert.strictEqual(
				result,
				9,
				"Should skip collapsed region and closing brace",
			);
		});

		test("should skip standalone closing braces", () => {
			const lines = [
				"function foo() {", // 0
				"", // 1
				"}", // 2
				"", // 3
				"next();", // 4
			];
			const mockDoc: MockDocument = {
				lineCount: 5,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			};

			const result = findNextVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				0,
				4,
				undefined,
			);
			assert.strictEqual(
				result,
				4,
				"Should skip closing brace at line 2 and find line 4",
			);
		});

		test("should skip past folded test with closing brace to next test", () => {
			// Scenario: First test is folded, cursor at line 1
			// Should skip to line 13 (start of next test), not line 11 (closing brace)
			const lines = [
				`describe("Test Suite", () => {`, // 0
				`  test("first test", () => {`, // 1  <- cursor here, test is folded
				`    const a = 1;`, // 2 (hidden)
				`    const b = 2;`, // 3 (hidden)
				`    expect(a + b).toBe(3);`, // 4 (hidden)
				`  });`, // 5 (hidden)
				``, // 6 (hidden)
				`  beforeEach(() => {`, // 7 (hidden)
				`    // setup`, // 8 (hidden)
				`  });`, // 9 (hidden)
				``, // 10 (hidden)
				`});`, // 11 <- closing brace visible
				``, // 12
				`test("second test", () => {`, // 13 <- should land here
				`  console.log("test");`, // 14
				`});`, // 15
			];

			const mockDoc: MockDocument = {
				lineCount: 16,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			};

			// Mock editor with first test folded (lines 2-10 hidden)
			const mockEditor: MockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 1, Number.MAX_SAFE_INTEGER), // Lines 0-1 visible
					new vscode.Range(11, 0, 15, Number.MAX_SAFE_INTEGER), // Lines 11-15 visible
				],
			};

			// Starting at line 1, should skip to line 13 (start of second test)
			const result = findNextVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				1,
				15,
				mockEditor as unknown as vscode.TextEditor,
			);
			assert.strictEqual(
				result,
				13,
				"Should skip to start of next test at line 13",
			);
		});

		test("should handle the exact runTest.ts scenario", () => {
			// This is the exact structure from runTest.ts that's failing
			const lines = [
				`import * as path from "node:path";`, // 0
				`import { runTests } from "@vscode/test-electron";`, // 1
				``, // 2
				`async function main() {`, // 3
				`	try {`, // 4
				`		// The folder containing the Extension Manifest package.json`, // 5
				`		const extensionDevelopmentPath = path.resolve(__dirname, "../../../");`, // 6
				``, // 7
				`		// The path to the test runner script (compiled)`, // 8
				`		const extensionTestsPath = path.resolve(__dirname, "./suite/index");`, // 9
				``, // 10
				`		// Download VS Code, unzip it and run the integration test`, // 11
				`		await runTests({`, // 12
				`			extensionDevelopmentPath,`, // 13
				`			extensionTestsPath,`, // 14
				`			launchArgs: [], // Don't disable extensions, we need our extension to load`, // 15
				`		});`, // 16
				`	} catch (err) {`, // 17
				`		console.error("Failed to run tests:", err);`, // 18
				`		process.exit(1);`, // 19
				`	}`, // 20
				`}`, // 21
				``, // 22
				`main();`, // 23
				``, // 24
			];
			const mockDoc: MockDocument = {
				lineCount: 25,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			};

			// Mock editor with lines 4-20 collapsed (function body hidden)
			const mockEditor: MockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 3, Number.MAX_SAFE_INTEGER), // Lines 0-3 visible
					new vscode.Range(21, 0, 24, Number.MAX_SAFE_INTEGER), // Lines 21-24 visible (closing brace, empty, main(), empty)
				],
			};

			// Starting from line 3 (function declaration), should jump to line 23 (main();)
			const result = findNextVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				3,
				24,
				mockEditor as unknown as vscode.TextEditor,
			);
			assert.strictEqual(
				result,
				23,
				"Should jump from function declaration to main() call, skipping collapsed body and closing brace",
			);
		});
	});

	suite("findPreviousVisibleBlock", () => {
		test("should find previous block when starting in empty space", () => {
			const mockDoc: MockDocument = {
				lineCount: 10,
				lineAt: createLineAtSimple([5, 2]),
			};

			const result = findPreviousVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				5,
				0,
				undefined,
			);
			assert.strictEqual(
				result,
				3,
				"Should find start of previous block at line 3",
			);
		});

		test("should find previous block when starting in middle of current block", () => {
			const mockDoc: MockDocument = {
				lineCount: 10,
				lineAt: createLineAtSimple([2, 6]),
			};

			const result = findPreviousVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				4,
				0,
				undefined,
			);
			assert.strictEqual(result, 0, "Should find previous block at line 0");
		});

		test("should handle the exact runTest.ts moveUp scenario", () => {
			const lines = [
				`import * as path from "node:path";`, // 0
				`import { runTests } from "@vscode/test-electron";`, // 1
				``, // 2
				`async function main() {`, // 3
				`	try {`, // 4
				`		// The folder containing the Extension Manifest package.json`, // 5
				`		const extensionDevelopmentPath = path.resolve(__dirname, "../../../");`, // 6
				``, // 7
				`		// The path to the test runner script (compiled)`, // 8
				`		const extensionTestsPath = path.resolve(__dirname, "./suite/index");`, // 9
				``, // 10
				`		// Download VS Code, unzip it and run the integration test`, // 11
				`		await runTests({`, // 12
				`			extensionDevelopmentPath,`, // 13
				`			extensionTestsPath,`, // 14
				`			launchArgs: [], // Don't disable extensions, we need our extension to load`, // 15
				`		});`, // 16
				`	} catch (err) {`, // 17
				`		console.error("Failed to run tests:", err);`, // 18
				`		process.exit(1);`, // 19
				`	}`, // 20
				`}`, // 21
				``, // 22
				`main();`, // 23
				``, // 24
			];
			const mockDoc: MockDocument = {
				lineCount: 25,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			};

			// Mock editor with lines 4-20 collapsed
			const mockEditor: MockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 3, Number.MAX_SAFE_INTEGER),
					new vscode.Range(21, 0, 24, Number.MAX_SAFE_INTEGER),
				],
			};

			// Starting from line 22 (empty line after }), should jump to line 3 (function declaration)
			const result = findPreviousVisibleBlock(
				mockDoc as unknown as vscode.TextDocument,
				22,
				0,
				mockEditor as unknown as vscode.TextEditor,
			);
			assert.strictEqual(
				result,
				3,
				"Should jump from after closing brace to function declaration, skipping collapsed body",
			);
		});
	});
});
