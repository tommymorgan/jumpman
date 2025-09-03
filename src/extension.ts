import * as vscode from "vscode";

// Check if a line is visible (not in a collapsed region)
function isLineVisible(
	lineNumber: number,
	editor?: vscode.TextEditor,
): boolean {
	if (!editor?.visibleRanges?.length) {
		// If we can't check visibility, assume visible
		return true;
	}
	const visible = editor.visibleRanges.some(
		(range) => lineNumber >= range.start.line && lineNumber <= range.end.line,
	);
	return visible;
}

// Skip over collapsed (invisible) regions
function skipCollapsedRegion(
	index: number,
	step: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	while (index !== boundary && !isLineVisible(index, editor)) {
		index += step;
	}
	return index;
}

// Check if a line contains only a closing brace
function isStandaloneClosingBrace(lineText: string): boolean {
	const trimmed = lineText.trim();
	return (
		trimmed === "}" ||
		trimmed === "]" ||
		trimmed === ")" ||
		trimmed === "};" ||
		trimmed === "];" ||
		trimmed === ");" ||
		trimmed === "});" ||
		trimmed === "})" ||
		trimmed === "]);" ||
		trimmed === "])"
	);
}

// Check if we should continue to next line in block
function shouldContinueInBlock(
	document: vscode.TextDocument,
	nextLine: number,
	boundary: number,
	editor?: vscode.TextEditor,
): boolean {
	if (nextLine > boundary) return false;
	if (!isLineVisible(nextLine, editor)) return false;
	if (document.lineAt(nextLine).isEmptyOrWhitespace) return false;
	return true;
}

// Skip to the end of the current block
function skipToEndOfCurrentBlock(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	let index = startIndex;
	// If we're on an empty line, don't skip anything
	if (document.lineAt(index).isEmptyOrWhitespace) {
		return index;
	}

	// Skip to the end of the current block
	while (
		index < boundary &&
		shouldContinueInBlock(document, index + 1, boundary, editor)
	) {
		index++;
	}
	return index < boundary ? index : boundary;
}

// Check if line is valid (non-empty and not a closing brace)
function isValidBlockLine(
	document: vscode.TextDocument,
	index: number,
	editor?: vscode.TextEditor,
): boolean {
	if (!isLineVisible(index, editor)) {
		return false;
	}
	if (document.lineAt(index).isEmptyOrWhitespace) {
		return false;
	}
	return !isStandaloneClosingBrace(document.lineAt(index).text);
}

// Move to next line handling collapsed regions
function moveToNextLine(
	index: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	index++;
	if (!isLineVisible(index, editor)) {
		return skipCollapsedRegion(index, 1, boundary, editor);
	}
	return index;
}

// Find the next non-empty, non-brace line
function findNextNonEmptyLine(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	let index = startIndex;
	while (index < boundary) {
		index = moveToNextLine(index, boundary, editor);
		if (index > boundary) return boundary;
		if (isValidBlockLine(document, index, editor)) return index;
	}
	return boundary;
}

// Find the next visible block when moving down
function findNextVisibleBlock(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	// First, skip to the end of the current block if we're in one
	const blockEnd = skipToEndOfCurrentBlock(
		document,
		startIndex,
		boundary,
		editor,
	);
	// Now find the next non-empty, non-brace line
	return findNextNonEmptyLine(document, blockEnd, boundary, editor);
}

// Skip empty lines when moving backward
function skipEmptyLinesBackward(
	document: vscode.TextDocument,
	index: number,
	boundary: number,
): number {
	while (index >= boundary && document.lineAt(index).isEmptyOrWhitespace) {
		index--;
	}
	return index;
}

// Check if we can continue to previous line in block
function canMoveToPreviousInBlock(
	document: vscode.TextDocument,
	prevLine: number,
	editor?: vscode.TextEditor,
): boolean {
	if (!isLineVisible(prevLine, editor)) return false;
	if (document.lineAt(prevLine).isEmptyOrWhitespace) return false;
	return !isStandaloneClosingBrace(document.lineAt(prevLine).text);
}

// Find the start of the block containing the given index
function findBlockStart(
	document: vscode.TextDocument,
	index: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	while (
		index > boundary &&
		canMoveToPreviousInBlock(document, index - 1, editor)
	) {
		index--;
	}
	return index;
}

// Skip to the start of current block when moving up
function skipToStartOfCurrentBlock(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	if (document.lineAt(startIndex).isEmptyOrWhitespace) {
		return startIndex;
	}
	return findBlockStart(document, startIndex, boundary, editor);
}

// Move to previous line handling collapsed regions and empty lines
function moveToPreviousLine(
	document: vscode.TextDocument,
	index: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	index--;
	if (!isLineVisible(index, editor)) {
		index = skipCollapsedRegion(index, -1, boundary, editor);
	}
	if (index >= boundary) {
		index = skipEmptyLinesBackward(document, index, boundary);
	}
	return index;
}

// Find the previous non-empty, non-brace line
function findPreviousNonEmptyLine(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	let index = startIndex;
	while (index > boundary) {
		index = moveToPreviousLine(document, index, boundary, editor);
		if (index < boundary) return boundary;
		if (isValidBlockLine(document, index, editor)) return index;
	}
	return boundary;
}

// Find the previous visible block when moving up
function findPreviousVisibleBlock(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	// First, skip to the start of current block
	const blockStart = skipToStartOfCurrentBlock(
		document,
		startIndex,
		boundary,
		editor,
	);
	// Find the previous non-empty line
	const prevLine = findPreviousNonEmptyLine(
		document,
		blockStart,
		boundary,
		editor,
	);
	// If we found a valid line, find the start of its block
	if (prevLine !== boundary) {
		return findBlockStart(document, prevLine, boundary, editor);
	}
	return boundary;
}

function nextPosition(
	document: vscode.TextDocument,
	position: vscode.Position,
	up: boolean = false,
	editor?: vscode.TextEditor,
): number {
	const boundary = up ? 0 : document.lineCount - 1;

	if (position.line === boundary) {
		return position.line;
	}

	// Use the new dedicated functions for finding visible blocks
	if (up) {
		return findPreviousVisibleBlock(document, position.line, boundary, editor);
	} else {
		return findNextVisibleBlock(document, position.line, boundary, editor);
	}
}

function anchorPosition(selection: vscode.Selection) {
	return selection.active.line === selection.end.line
		? selection.start
		: selection.end;
}

function markSelection(
	editor: vscode.TextEditor,
	next: number,
	anchor?: vscode.Position,
) {
	const active = editor.selection.active.with(next, 0);
	editor.selection = new vscode.Selection(anchor || active, active);
	editor.revealRange(new vscode.Range(active, active));
}

// Export for testing
export const _internal = {
	isLineVisible,
	skipCollapsedRegion,
	isStandaloneClosingBrace,
	shouldContinueInBlock,
	isValidBlockLine,
	canMoveToPreviousInBlock,
	moveToNextLine,
	moveToPreviousLine,
	skipToEndOfCurrentBlock,
	skipToStartOfCurrentBlock,
	skipEmptyLinesBackward,
	findBlockStart,
	findNextNonEmptyLine,
	findPreviousNonEmptyLine,
	findNextVisibleBlock,
	findPreviousVisibleBlock,
	nextPosition,
	anchorPosition,
	markSelection,
};

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("jumpman.moveUp", () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			markSelection(
				editor,
				nextPosition(editor.document, editor.selection.active, true, editor),
			);
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jumpman.moveDown", () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			markSelection(
				editor,
				nextPosition(editor.document, editor.selection.active, false, editor),
			);
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jumpman.selectUp", () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			markSelection(
				editor,
				nextPosition(editor.document, editor.selection.active, true, editor),
				anchorPosition(editor.selection),
			);
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jumpman.selectDown", () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			markSelection(
				editor,
				nextPosition(editor.document, editor.selection.active, false, editor),
				anchorPosition(editor.selection),
			);
		}),
	);
}

export function deactivate() {}
