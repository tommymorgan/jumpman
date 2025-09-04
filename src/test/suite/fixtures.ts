import * as vscode from "vscode";
import type { MockLine } from "./test-helpers";

// Builder pattern for creating mock TextDocument
export class MockDocumentBuilder {
	private lineCount: number = 0;
	private lines: Map<number, MockLine> = new Map();

	withLineCount(count: number): this {
		this.lineCount = count;
		return this;
	}

	withLine(index: number, line: MockLine): this {
		this.lines.set(index, line);
		return this;
	}

	withLines(lineGenerator: (n: number) => MockLine): this {
		for (let i = 0; i < this.lineCount; i++) {
			this.lines.set(i, lineGenerator(i));
		}
		return this;
	}

	build(): vscode.TextDocument {
		return {
			lineCount: this.lineCount,
			lineAt: (n: number) => {
				const line = this.lines.get(n);
				if (!line) {
					throw new Error(`Line ${n} not found in mock document`);
				}
				return line;
			},
		} as unknown as vscode.TextDocument;
	}
}

// Builder pattern for creating mock TextEditor
export class MockEditorBuilder {
	private visibleRanges: vscode.Range[] = [];
	private document?: vscode.TextDocument;
	private selection?: vscode.Selection;

	withVisibleRanges(ranges: vscode.Range[]): this {
		this.visibleRanges = ranges;
		return this;
	}

	withDocument(doc: vscode.TextDocument): this {
		this.document = doc;
		return this;
	}

	withSelection(selection: vscode.Selection): this {
		this.selection = selection;
		return this;
	}

	build(): vscode.TextEditor {
		if (!this.document) {
			throw new Error("Document is required for MockEditor");
		}
		if (!this.selection) {
			// Default selection at start of document
			this.selection = new vscode.Selection(0, 0, 0, 0);
		}
		return {
			visibleRanges: this.visibleRanges,
			document: this.document,
			selection: this.selection,
			revealRange: () => {},
		} as unknown as vscode.TextEditor;
	}
}

// Factory functions for common test scenarios
export function createMockDocument(
	lineCount: number,
	lineGenerator: (n: number) => MockLine,
): vscode.TextDocument {
	return new MockDocumentBuilder()
		.withLineCount(lineCount)
		.withLines(lineGenerator)
		.build();
}

export function createMockEditor(
	visibleRanges: vscode.Range[] = [],
	document?: vscode.TextDocument,
): vscode.TextEditor {
	const mockDoc =
		document || new MockDocumentBuilder().withLineCount(10).build();
	return new MockEditorBuilder()
		.withVisibleRanges(visibleRanges)
		.withDocument(mockDoc)
		.build();
}

// Create mock editor with selection tracking
export function createMockEditorWithSelection(
	initialSelection: vscode.Selection,
	visibleRanges: vscode.Range[] = [],
): vscode.TextEditor & {
	capturedSelection?: vscode.Selection;
	capturedRange?: vscode.Range;
} {
	const mockDoc = new MockDocumentBuilder().withLineCount(20).build();
	let _selection = initialSelection;
	let capturedSelection: vscode.Selection | undefined;
	let capturedRange: vscode.Range | undefined;

	const editor = {
		document: mockDoc,
		visibleRanges,
		revealRange: (range: vscode.Range) => {
			capturedRange = range;
		},
		get selection() {
			return _selection;
		},
		set selection(value: vscode.Selection) {
			capturedSelection = value;
			_selection = value;
		},
		capturedSelection: undefined as vscode.Selection | undefined,
		capturedRange: undefined as vscode.Range | undefined,
	};

	// Make captured values accessible
	Object.defineProperty(editor, "capturedSelection", {
		get: () => capturedSelection,
		configurable: true,
	});
	Object.defineProperty(editor, "capturedRange", {
		get: () => capturedRange,
		configurable: true,
	});

	return editor as unknown as vscode.TextEditor & {
		capturedSelection?: vscode.Selection;
		capturedRange?: vscode.Range;
	};
}

// Create a mock document with specific empty lines
export function createMockDocumentWithEmptyLines(
	lineCount: number,
	emptyIndices: number[],
): vscode.TextDocument {
	return new MockDocumentBuilder()
		.withLineCount(lineCount)
		.withLines((n: number) => ({
			isEmptyOrWhitespace: emptyIndices.includes(n),
			text: emptyIndices.includes(n) ? "" : `line ${n}`,
		}))
		.build();
}
