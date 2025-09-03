import * as assert from "node:assert";
import * as vscode from "vscode";
import { _internal } from "../../extension";

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

const {
	isLineVisible,
	skipCollapsedRegion,
	isStandaloneClosingBrace,
	skipToEndOfCurrentBlock,
	skipEmptyLinesBackward,
	findBlockStart,
	nextPosition,
	anchorPosition,
	markSelection,
} = _internal;

suite("Private Functions", () => {
	suite("isLineVisible", () => {
		test("should return true when no editor provided", () => {
			const result = isLineVisible(5, undefined);
			assert.strictEqual(result, true, "Should assume visible when no editor");
		});

		test("should return true when editor has no visible ranges", () => {
			const mockEditor = { visibleRanges: [] } as any;
			const result = isLineVisible(5, mockEditor);
			assert.strictEqual(result, true, "Should assume visible when no ranges");
		});

		test("should return true when line is within visible range", () => {
			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 10, 0),
					new vscode.Range(20, 0, 30, 0),
				],
			} as any;

			assert.strictEqual(
				isLineVisible(5, mockEditor),
				true,
				"Line 5 should be visible",
			);
			assert.strictEqual(
				isLineVisible(25, mockEditor),
				true,
				"Line 25 should be visible",
			);
		});

		test("should return false when line is outside visible ranges", () => {
			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 10, 0),
					new vscode.Range(20, 0, 30, 0),
				],
			} as any;

			assert.strictEqual(
				isLineVisible(15, mockEditor),
				false,
				"Line 15 should not be visible",
			);
			assert.strictEqual(
				isLineVisible(35, mockEditor),
				false,
				"Line 35 should not be visible",
			);
		});

		test("should handle edge cases at range boundaries", () => {
			const mockEditor = {
				visibleRanges: [new vscode.Range(5, 0, 10, 0)],
			} as any;

			assert.strictEqual(
				isLineVisible(4, mockEditor),
				false,
				"Line before range",
			);
			assert.strictEqual(isLineVisible(5, mockEditor), true, "Start of range");
			assert.strictEqual(isLineVisible(10, mockEditor), true, "End of range");
			assert.strictEqual(
				isLineVisible(11, mockEditor),
				false,
				"Line after range",
			);
		});
	});

	suite("skipCollapsedRegion", () => {
		test("should skip forward over invisible lines", () => {
			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 5, 0),
					new vscode.Range(10, 0, 15, 0),
				],
			} as any;

			// Starting at line 6 (invisible), should skip to line 10 (first visible)
			const result = skipCollapsedRegion(6, 1, 20, mockEditor);
			assert.strictEqual(result, 10, "Should skip to next visible line");
		});

		test("should skip backward over invisible lines", () => {
			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 5, 0),
					new vscode.Range(10, 0, 15, 0),
				],
			} as any;

			// Starting at line 9 (invisible), should skip to line 5 (last visible before gap)
			const result = skipCollapsedRegion(9, -1, 0, mockEditor);
			assert.strictEqual(result, 5, "Should skip to previous visible line");
		});

		test("should stop at boundary when moving forward", () => {
			const mockEditor = {
				visibleRanges: [new vscode.Range(0, 0, 5, 0)],
			} as any;

			// Starting at line 6, with boundary at 8
			const result = skipCollapsedRegion(6, 1, 8, mockEditor);
			assert.strictEqual(result, 8, "Should stop at boundary");
		});

		test("should stop at boundary when moving backward", () => {
			const mockEditor = {
				visibleRanges: [new vscode.Range(10, 0, 15, 0)],
			} as any;

			// Starting at line 9, with boundary at 7
			const result = skipCollapsedRegion(9, -1, 7, mockEditor);
			assert.strictEqual(result, 7, "Should stop at boundary");
		});

		test("should return immediately if starting on visible line", () => {
			const mockEditor = {
				visibleRanges: [new vscode.Range(0, 0, 10, 0)],
			} as any;

			const result = skipCollapsedRegion(5, 1, 20, mockEditor);
			assert.strictEqual(
				result,
				5,
				"Should return starting position if visible",
			);
		});

		test("should handle no editor case", () => {
			// When no editor, isLineVisible returns true, so should return immediately
			const result = skipCollapsedRegion(5, 1, 20, undefined);
			assert.strictEqual(
				result,
				5,
				"Should return starting position when no editor",
			);
		});
	});

	suite("isStandaloneClosingBrace", () => {
		test("should identify single closing brace", () => {
			assert.strictEqual(isStandaloneClosingBrace("}"), true);
			assert.strictEqual(isStandaloneClosingBrace("]"), true);
			assert.strictEqual(isStandaloneClosingBrace(")"), true);
		});

		test("should identify closing brace with semicolon", () => {
			assert.strictEqual(isStandaloneClosingBrace("};"), true);
			assert.strictEqual(isStandaloneClosingBrace("];"), true);
			assert.strictEqual(isStandaloneClosingBrace(");"), true);
		});

		test("should handle whitespace around braces", () => {
			assert.strictEqual(isStandaloneClosingBrace("  }  "), true);
			assert.strictEqual(isStandaloneClosingBrace("\t}\t"), true);
			assert.strictEqual(isStandaloneClosingBrace("   };  "), true);
		});

		test("should return false for non-brace lines", () => {
			assert.strictEqual(isStandaloneClosingBrace("function foo() {"), false);
			assert.strictEqual(isStandaloneClosingBrace("const x = 5;"), false);
			assert.strictEqual(isStandaloneClosingBrace("// }"), false);
		});

		test("should return false for braces with other content", () => {
			assert.strictEqual(isStandaloneClosingBrace("} else {"), false);
			assert.strictEqual(isStandaloneClosingBrace("return }"), false);
			assert.strictEqual(isStandaloneClosingBrace("} // comment"), false);
		});
	});

	suite("skipToEndOfCurrentBlock", () => {
		test("should return same index if on empty line", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: n === 5,
					text: n === 5 ? "" : `line ${n}`,
				}),
			} as vscode.TextDocument;

			const result = skipToEndOfCurrentBlock(mockDoc, 5, 9, undefined);
			assert.strictEqual(result, 5, "Should return same index for empty line");
		});

		test("should skip to end of block when in middle", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: createLineAtSimple([3, 7]),
			} as vscode.TextDocument;

			// Starting at line 4 (in block 4-6), should skip to line 6
			const result = skipToEndOfCurrentBlock(mockDoc, 4, 9, undefined);
			assert.strictEqual(result, 6, "Should skip to last line of block");
		});

		test("should stop at boundary", () => {
			const mockDoc = {
				lineCount: 5,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: false,
					text: `line ${n}`,
				}),
			} as vscode.TextDocument;

			const result = skipToEndOfCurrentBlock(mockDoc, 2, 3, undefined);
			assert.strictEqual(result, 3, "Should stop at boundary");
		});

		test("should stop before invisible line", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: false,
					text: `line ${n}`,
				}),
			} as vscode.TextDocument;

			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 5, 0),
					new vscode.Range(8, 0, 10, 0),
				],
			} as any;

			// Starting at line 3, should stop at line 5 (before invisible line 6)
			const result = skipToEndOfCurrentBlock(mockDoc, 3, 9, mockEditor);
			assert.strictEqual(result, 5, "Should stop before invisible line");
		});

		test("should handle single-line block", () => {
			const mockDoc = {
				lineCount: 5,
				lineAt: createLineAtSimple([1, 3]),
			} as vscode.TextDocument;

			// Line 2 is a single-line block surrounded by empty lines
			const result = skipToEndOfCurrentBlock(mockDoc, 2, 4, undefined);
			assert.strictEqual(result, 2, "Should stay on single-line block");
		});
	});

	suite("skipEmptyLinesBackward", () => {
		test("should skip multiple empty lines", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => {
					const isEmpty = n >= 5 && n <= 7;
					return createMockLine(isEmpty, isEmpty ? "" : `line ${n}`);
				},
			} as vscode.TextDocument;

			// Starting at line 7 (empty), should skip to line 4 (first non-empty)
			const result = skipEmptyLinesBackward(mockDoc, 7, 0);
			assert.strictEqual(result, 4, "Should skip to first non-empty line");
		});

		test("should return same index if not on empty line", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: n === 2,
					text: n === 2 ? "" : `line ${n}`,
				}),
			} as vscode.TextDocument;

			const result = skipEmptyLinesBackward(mockDoc, 5, 0);
			assert.strictEqual(result, 5, "Should return same index for non-empty");
		});

		test("should stop at boundary", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: true,
					text: "",
				}),
			} as vscode.TextDocument;

			// All lines are empty, should stop at boundary
			const result = skipEmptyLinesBackward(mockDoc, 5, 3);
			assert.strictEqual(result, 2, "Should stop one before boundary");
		});

		test("should handle single empty line", () => {
			const mockDoc = {
				lineCount: 5,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: n === 2,
					text: n === 2 ? "" : `line ${n}`,
				}),
			} as vscode.TextDocument;

			const result = skipEmptyLinesBackward(mockDoc, 2, 0);
			assert.strictEqual(result, 1, "Should skip single empty line");
		});

		test("should handle no empty lines to skip", () => {
			const mockDoc = {
				lineCount: 5,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: false,
					text: `line ${n}`,
				}),
			} as vscode.TextDocument;

			const result = skipEmptyLinesBackward(mockDoc, 3, 0);
			assert.strictEqual(result, 3, "Should stay at current position");
		});
	});

	suite("findBlockStart", () => {
		test("should find start of single-line block", () => {
			const lines = ["", "line 1", "", "line 3", ""];
			const mockDoc = {
				lineCount: 5,
				lineAt: (n: number) => createMockLine(lines[n] === "", lines[n]),
			} as vscode.TextDocument;

			// Line 1 is a single-line block
			const result = findBlockStart(mockDoc, 1, 0, undefined);
			assert.strictEqual(result, 1, "Should stay at single-line block");
		});

		test("should find start of multi-line block", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: createLineAtSimple([2, 7]),
			} as vscode.TextDocument;

			// Starting at line 6 (in block 3-6), should find start at line 3
			const result = findBlockStart(mockDoc, 6, 0, undefined);
			assert.strictEqual(result, 3, "Should find start of block");
		});

		test("should stop at empty line", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: n === 3,
					text: n === 3 ? "" : `line ${n}`,
				}),
			} as vscode.TextDocument;

			// Starting at line 5, should stop at line 4 (empty line 3 is boundary)
			const result = findBlockStart(mockDoc, 5, 0, undefined);
			assert.strictEqual(result, 4, "Should stop at empty line");
		});

		test("should stop at closing brace", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: false,
					text: n === 3 ? "}" : `line ${n}`,
				}),
			} as vscode.TextDocument;

			// Starting at line 5, should stop at line 4 (closing brace at 3)
			const result = findBlockStart(mockDoc, 5, 0, undefined);
			assert.strictEqual(result, 4, "Should stop at closing brace");
		});

		test("should stop at invisible line", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: false,
					text: `line ${n}`,
				}),
			} as vscode.TextDocument;

			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 3, 0),
					new vscode.Range(5, 0, 10, 0),
				],
			} as any;

			// Starting at line 6, should stop at line 5 (line 4 is invisible)
			const result = findBlockStart(mockDoc, 6, 0, mockEditor);
			assert.strictEqual(result, 5, "Should stop at invisible boundary");
		});

		test("should respect boundary parameter", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: false,
					text: `line ${n}`,
				}),
			} as vscode.TextDocument;

			// Starting at line 5 with boundary at 3, should stop at 3
			const result = findBlockStart(mockDoc, 5, 3, undefined);
			assert.strictEqual(result, 3, "Should stop at boundary");
		});
	});

	suite("nextPosition", () => {
		test("should return current position when at boundary moving up", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({ isEmptyOrWhitespace: false }),
			} as any;

			const position = new vscode.Position(0, 0);
			const result = nextPosition(mockDoc, position, true, undefined);
			assert.strictEqual(result, 0, "Should stay at line 0 when moving up");
		});

		test("should return current position when at boundary moving down", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({ isEmptyOrWhitespace: false }),
			} as any;

			const position = new vscode.Position(9, 0);
			const result = nextPosition(mockDoc, position, false, undefined);
			assert.strictEqual(result, 9, "Should stay at line 9 when moving down");
		});

		test("should call findPreviousVisibleBlock when moving up", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: n === 3 || n === 7,
					text: n === 3 || n === 7 ? "" : `line ${n}`,
				}),
			} as any;

			const position = new vscode.Position(5, 0);
			const result = nextPosition(mockDoc, position, true, undefined);
			// Line 5 is in a block (4-6), moving up should go to previous block (0-2)
			assert.strictEqual(result, 0, "Should find previous block");
		});

		test("should call findNextVisibleBlock when moving down", () => {
			const mockDoc = {
				lineCount: 10,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: n === 3 || n === 7,
					text: n === 3 || n === 7 ? "" : `line ${n}`,
				}),
			} as any;

			const position = new vscode.Position(5, 0);
			const result = nextPosition(mockDoc, position, false, undefined);
			assert.strictEqual(result, 8, "Should find next block");
		});

		test("should handle collapsed regions when provided editor", () => {
			const mockDoc = {
				lineCount: 20,
				lineAt: (n: number) => ({
					isEmptyOrWhitespace: n === 3 || n === 15,
					text: n === 3 || n === 15 ? "" : `line ${n}`,
				}),
			} as any;

			const mockEditor = {
				visibleRanges: [
					new vscode.Range(0, 0, 5, 0),
					new vscode.Range(14, 0, 20, 0),
				],
			} as any;

			// Starting at line 2, moving down:
			// - Lines 0-2 form a block
			// - Line 3 is empty
			// - Lines 4-5 are visible but line 4 starts a block
			// Since we're at line 2, we should move to line 4
			const position = new vscode.Position(2, 0);
			const result = nextPosition(mockDoc, position, false, mockEditor);
			assert.strictEqual(
				result,
				4,
				"Should skip to next visible block at line 4",
			);
		});
	});

	suite("anchorPosition", () => {
		test("should return start when active is at end", () => {
			const start = new vscode.Position(5, 0);
			const end = new vscode.Position(10, 0);
			const selection = new vscode.Selection(start, end);

			const result = anchorPosition(selection);
			assert.strictEqual(result.line, 5, "Should return start position");
		});

		test("should return end when active is at start", () => {
			const start = new vscode.Position(10, 0);
			const end = new vscode.Position(5, 0);
			const selection = new vscode.Selection(start, end);

			const result = anchorPosition(selection);
			assert.strictEqual(result.line, 10, "Should return end position");
		});

		test("should handle collapsed selection", () => {
			const pos = new vscode.Position(5, 0);
			const selection = new vscode.Selection(pos, pos);

			const result = anchorPosition(selection);
			assert.strictEqual(
				result.line,
				5,
				"Should return position for collapsed selection",
			);
		});

		test("should handle multi-character selection on same line", () => {
			const start = new vscode.Position(5, 0);
			const end = new vscode.Position(5, 10);
			const selection = new vscode.Selection(start, end);

			const result = anchorPosition(selection);
			assert.strictEqual(
				result.line,
				5,
				"Should return start when on same line",
			);
			assert.strictEqual(result.character, 0, "Should return start character");
		});
	});

	suite("markSelection", () => {
		test("should update selection to new line without anchor", () => {
			let capturedSelection: vscode.Selection | undefined;
			let capturedRange: vscode.Range | undefined;

			const mockEditor = {
				selection: new vscode.Selection(
					new vscode.Position(5, 0),
					new vscode.Position(5, 0),
				),
				revealRange: (range: vscode.Range) => {
					capturedRange = range;
				},
			} as any;

			// Use setter to capture the selection
			Object.defineProperty(mockEditor, "selection", {
				get: () => mockEditor._selection || new vscode.Selection(5, 0, 5, 0),
				set: (value) => {
					capturedSelection = value;
					mockEditor._selection = value;
				},
				configurable: true,
			});

			markSelection(mockEditor, 10, undefined);

			assert.ok(capturedSelection, "Selection should be set");
			assert.strictEqual(
				capturedSelection!.active.line,
				10,
				"Active should be at line 10",
			);
			assert.strictEqual(
				capturedSelection!.active.character,
				0,
				"Active should be at character 0",
			);
			assert.strictEqual(
				capturedSelection!.anchor.line,
				10,
				"Anchor should be at line 10",
			);
			assert.strictEqual(
				capturedSelection!.anchor.character,
				0,
				"Anchor should be at character 0",
			);

			assert.ok(capturedRange, "Range should be revealed");
			assert.strictEqual(
				capturedRange!.start.line,
				10,
				"Range start should be at line 10",
			);
			assert.strictEqual(
				capturedRange!.end.line,
				10,
				"Range end should be at line 10",
			);
		});

		test("should update selection to new line with anchor", () => {
			let capturedSelection: vscode.Selection | undefined;

			const mockEditor = {
				selection: new vscode.Selection(
					new vscode.Position(5, 0),
					new vscode.Position(5, 0),
				),
				revealRange: (range: vscode.Range) => {},
			} as any;

			Object.defineProperty(mockEditor, "selection", {
				get: () => mockEditor._selection || new vscode.Selection(5, 0, 5, 0),
				set: (value) => {
					capturedSelection = value;
					mockEditor._selection = value;
				},
				configurable: true,
			});

			const anchor = new vscode.Position(3, 5);
			markSelection(mockEditor, 10, anchor);

			assert.ok(capturedSelection, "Selection should be set");
			assert.strictEqual(
				capturedSelection!.active.line,
				10,
				"Active should be at line 10",
			);
			assert.strictEqual(
				capturedSelection!.active.character,
				0,
				"Active should be at character 0",
			);
			assert.strictEqual(
				capturedSelection!.anchor.line,
				3,
				"Anchor should be at line 3",
			);
			assert.strictEqual(
				capturedSelection!.anchor.character,
				5,
				"Anchor should be at character 5",
			);
		});

		test("should maintain character position from original active position", () => {
			let capturedSelection: vscode.Selection | undefined;

			const mockEditor = {
				selection: new vscode.Selection(
					new vscode.Position(5, 10),
					new vscode.Position(5, 10),
				),
				revealRange: (range: vscode.Range) => {},
			} as any;

			Object.defineProperty(mockEditor, "selection", {
				get: () => mockEditor._selection || new vscode.Selection(5, 10, 5, 10),
				set: (value) => {
					capturedSelection = value;
					mockEditor._selection = value;
				},
				configurable: true,
			});

			markSelection(mockEditor, 10, undefined);

			assert.ok(capturedSelection, "Selection should be set");
			// The active.with(next, 0) call should set character to 0
			assert.strictEqual(
				capturedSelection!.active.character,
				0,
				"Should reset to character 0",
			);
		});

		test("should create selection spanning multiple lines", () => {
			let capturedSelection: vscode.Selection | undefined;

			const mockEditor = {
				selection: new vscode.Selection(
					new vscode.Position(5, 0),
					new vscode.Position(5, 0),
				),
				revealRange: (range: vscode.Range) => {},
			} as any;

			Object.defineProperty(mockEditor, "selection", {
				get: () => mockEditor._selection || new vscode.Selection(5, 0, 5, 0),
				set: (value) => {
					capturedSelection = value;
					mockEditor._selection = value;
				},
				configurable: true,
			});

			const anchor = new vscode.Position(2, 0);
			markSelection(mockEditor, 8, anchor);

			assert.ok(capturedSelection, "Selection should be set");
			assert.strictEqual(
				capturedSelection!.start.line,
				2,
				"Selection should start at line 2",
			);
			assert.strictEqual(
				capturedSelection!.end.line,
				8,
				"Selection should end at line 8",
			);
			assert.strictEqual(
				capturedSelection!.active.line,
				8,
				"Active should be at line 8",
			);
			assert.strictEqual(
				capturedSelection!.anchor.line,
				2,
				"Anchor should be at line 2",
			);
		});
	});
});
