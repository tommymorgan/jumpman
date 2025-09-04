import * as vscode from "vscode";

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

// Set of standalone closing brace patterns for O(1) lookup
const CLOSING_BRACE_PATTERNS = new Set([
	"}",
	"]",
	")",
	"};",
	"];",
	");",
	"});",
	"})",
	"]);",
	"])",
]);

function isStandaloneClosingBrace(lineText: string): boolean {
	const trimmed = lineText.trim();
	return CLOSING_BRACE_PATTERNS.has(trimmed);
}

function shouldContinueInBlock(
	document: vscode.TextDocument,
	nextLine: number,
	boundary: number,
): boolean {
	if (nextLine > boundary) return false;
	// Don't check visibility here - we need to find the true end of the block
	// even if it extends beyond the visible area
	if (document.lineAt(nextLine).isEmptyOrWhitespace) return false;
	return true;
}

function skipToEndOfCurrentBlock(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	_editor?: vscode.TextEditor,
): number {
	let index = startIndex;
	// If we're on an empty line, don't skip anything
	if (document.lineAt(index).isEmptyOrWhitespace) {
		return index;
	}

	while (
		index < boundary &&
		shouldContinueInBlock(document, index + 1, boundary)
	) {
		index++;
	}
	return index < boundary ? index : boundary;
}

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

function findNextNonEmptyLine(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	let index = startIndex;
	while (index < boundary) {
		index = moveToNextLine(index, boundary, editor);
		if (index >= boundary) return boundary;
		if (isValidBlockLine(document, index, editor)) return index;
	}
	return boundary;
}

function findNextVisibleBlock(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	const blockEnd = skipToEndOfCurrentBlock(
		document,
		startIndex,
		boundary,
		editor,
	);
	return findNextNonEmptyLine(document, blockEnd, boundary, editor);
}

function skipEmptyLinesBackward(
	document: vscode.TextDocument,
	index: number,
	boundary: number,
): number {
	while (index > boundary && document.lineAt(index).isEmptyOrWhitespace) {
		index--;
	}
	// If we're at the boundary and it's still empty, that's where we stop
	// If we found a non-empty line, return it
	// If we went below boundary (shouldn't happen with fixed loop), clamp to boundary
	return Math.max(index, boundary);
}

function canMoveToPreviousInBlock(
	document: vscode.TextDocument,
	prevLine: number,
): boolean {
	// Don't check visibility here - we need to find the true start of the block
	// even if it extends beyond the visible area
	if (document.lineAt(prevLine).isEmptyOrWhitespace) return false;
	return !isStandaloneClosingBrace(document.lineAt(prevLine).text);
}

function findBlockStart(
	document: vscode.TextDocument,
	index: number,
	boundary: number,
	_editor?: vscode.TextEditor,
): number {
	while (index > boundary && canMoveToPreviousInBlock(document, index - 1)) {
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

function validateAndClampPosition(
	document: vscode.TextDocument,
	position: vscode.Position,
): number | null {
	// Input validation - be liberal in what we accept but validate
	if (!document || !position) {
		throw new Error("Document and position are required");
	}

	// Validate position is within document bounds
	if (position.line < 0 || position.line >= document.lineCount) {
		// Clamp to valid range instead of throwing
		const clampedLine = Math.max(
			0,
			Math.min(position.line, document.lineCount - 1),
		);
		return clampedLine;
	}

	return null; // Position is valid, no clamping needed
}

function nextPosition(
	document: vscode.TextDocument,
	position: vscode.Position,
	up = false,
	editor?: vscode.TextEditor,
): number {
	// Validate and potentially clamp the position
	const clampedLine = validateAndClampPosition(document, position);
	if (clampedLine !== null) {
		return clampedLine;
	}

	const boundary = up ? 0 : document.lineCount - 1;

	if (position.line === boundary) {
		return position.line;
	}

	// Use the new dedicated functions for finding visible blocks
	if (up) {
		return findPreviousVisibleBlock(document, position.line, boundary, editor);
	}
	return findNextVisibleBlock(document, position.line, boundary, editor);
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
	validateAndClampPosition,
	nextPosition,
	anchorPosition,
	markSelection,
};

// Execute navigation command logic
function executeNavigationCommand(moveUp: boolean, select: boolean) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const newPosition = nextPosition(
		editor.document,
		editor.selection.active,
		moveUp,
		editor,
	);

	const anchor = select ? anchorPosition(editor.selection) : undefined;
	markSelection(editor, newPosition, anchor);
}

export function activate(context: vscode.ExtensionContext) {
	// Register all four navigation commands
	context.subscriptions.push(
		vscode.commands.registerCommand("jumpman.moveUp", () =>
			executeNavigationCommand(true, false),
		),
		vscode.commands.registerCommand("jumpman.moveDown", () =>
			executeNavigationCommand(false, false),
		),
		vscode.commands.registerCommand("jumpman.selectUp", () =>
			executeNavigationCommand(true, true),
		),
		vscode.commands.registerCommand("jumpman.selectDown", () =>
			executeNavigationCommand(false, true),
		),
	);
}

// Required by VSCode extension API - no cleanup needed for this extension
export function deactivate() {}
