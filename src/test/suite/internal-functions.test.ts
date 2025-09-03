import * as assert from "assert";
import * as vscode from "vscode";
import { _internal } from "../../extension";

const { findNextVisibleBlock, findPreviousVisibleBlock } = _internal;

// Helper to create mock line data
function createMockLine(isEmpty: boolean, text: string) {
	return {
		isEmptyOrWhitespace: isEmpty,
		text: text,
	};
}

// Helper to create line based on simple empty indices
function createLineAtSimple(emptyIndices: number[]) {
	return (n: number) => {
		const isEmpty = emptyIndices.includes(n);
		return createMockLine(isEmpty, isEmpty ? "" : `line ${n}`);
	};
}

// Helper to create line with special cases
function createLineAtWithSpecial(
	emptyIndices: number[],
	specialCases: Map<number, string>,
) {
	return (n: number) => {
		const isEmpty = emptyIndices.includes(n);
		const specialText = specialCases.get(n);
		if (specialText !== undefined) {
			return createMockLine(false, specialText);
		}
		return createMockLine(isEmpty, isEmpty ? "" : `line ${n}`);
	};
}

suite("Internal Functions", () => {
	suite("findNextVisibleBlock", () => {
		test("should find next block when starting in a block", () => {
			// Mock document with blocks separated by empty lines
			const mockDoc = {
				lineCount: 10,
				lineAt: createLineAtSimple([2, 6]),
			} as vscode.TextDocument;

			// No editor (no collapsed regions)
			const result = findNextVisibleBlock(mockDoc, 0, 9, undefined);
			assert.strictEqual(result, 3, "Should skip to line 3 after empty line 2");
		});

		test("should skip collapsed regions and closing braces", () => {
			const specialCases = new Map([[7, "}"]]);
			const mockDoc = {
				lineCount: 10,
				lineAt: createLineAtWithSpecial([2, 8], specialCases),
			} as vscode.TextDocument;

			// Mock editor with collapsed region (lines 3-6 not visible)
			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 2, Number.MAX_SAFE_INTEGER),
					new vscode.Range(7, 0, 9, Number.MAX_SAFE_INTEGER),
				],
			} as any;

			const result = findNextVisibleBlock(mockDoc, 0, 9, mockEditor);
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
			const mockDoc = {
				lineCount: 5,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			} as vscode.TextDocument;

			const result = findNextVisibleBlock(mockDoc, 0, 4, undefined);
			assert.strictEqual(
				result,
				4,
				"Should skip closing brace at line 2 and find line 4",
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
			const mockDoc = {
				lineCount: 25,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			} as vscode.TextDocument;

			// Mock editor with lines 4-20 collapsed (function body hidden)
			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 3, Number.MAX_SAFE_INTEGER), // Lines 0-3 visible
					new vscode.Range(21, 0, 24, Number.MAX_SAFE_INTEGER), // Lines 21-24 visible (closing brace, empty, main(), empty)
				],
			} as any;

			// Starting from line 3 (function declaration), should jump to line 23 (main();)
			const result = findNextVisibleBlock(mockDoc, 3, 24, mockEditor);
			assert.strictEqual(
				result,
				23,
				"Should jump from function declaration to main() call, skipping collapsed body and closing brace",
			);
		});
	});

	suite("findPreviousVisibleBlock", () => {
		test("should find previous block when starting in empty space", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: createLineAtSimple([5, 2]),
			} as vscode.TextDocument;

			const result = findPreviousVisibleBlock(mockDoc, 5, 0, undefined);
			assert.strictEqual(
				result,
				3,
				"Should find start of previous block at line 3",
			);
		});

		test("should find previous block when starting in middle of current block", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: createLineAtSimple([2, 6]),
			} as vscode.TextDocument;

			const result = findPreviousVisibleBlock(mockDoc, 4, 0, undefined);
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
			const mockDoc = {
				lineCount: 25,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			} as vscode.TextDocument;

			// Mock editor with lines 4-20 collapsed
			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 3, Number.MAX_SAFE_INTEGER),
					new vscode.Range(21, 0, 24, Number.MAX_SAFE_INTEGER),
				],
			} as any;

			// Starting from line 22 (empty line after }), should jump to line 3 (function declaration)
			const result = findPreviousVisibleBlock(mockDoc, 22, 0, mockEditor);
			assert.strictEqual(
				result,
				3,
				"Should jump from after closing brace to function declaration, skipping collapsed body",
			);
		});
	});
});
