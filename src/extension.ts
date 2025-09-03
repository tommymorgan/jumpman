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

// Check if we should continue skipping in a block
function shouldContinueInBlock(
	document: vscode.TextDocument,
	index: number,
	nextIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): boolean {
	if (index === boundary) return false;
	if (document.lineAt(index).isEmptyOrWhitespace) return false;
	if (nextIndex === boundary) return false;
	if (!isLineVisible(nextIndex, editor)) return false;
	return true;
}

// Skip to the end of the current text block
function skipToEndOfBlock(
	document: vscode.TextDocument,
	index: number,
	step: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	while (
		shouldContinueInBlock(document, index, index + step, boundary, editor)
	) {
		index += step;
	}
	// Handle boundary case
	if (
		index !== boundary &&
		!document.lineAt(index).isEmptyOrWhitespace &&
		index + step === boundary
	) {
		return boundary;
	}
	return index;
}

// Skip over empty lines
function skipEmptyLines(
	document: vscode.TextDocument,
	index: number,
	step: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	while (
		index !== boundary &&
		document.lineAt(index).isEmptyOrWhitespace &&
		isLineVisible(index, editor)
	) {
		index += step;
	}
	return index;
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

// Check if at edge of collapsed region
function isAtCollapsedEdge(index: number, editor?: vscode.TextEditor): boolean {
	if (index === 0) return false;
	return !isLineVisible(index - 1, editor);
}

// Find the first visible line above a collapsed region
function findVisibleAboveCollapsed(
	index: number,
	editor?: vscode.TextEditor,
): number {
	let current = index - 1;
	while (current > 0 && !isLineVisible(current, editor)) {
		current--;
	}
	return current;
}

// Find the start of a collapsed block when moving up
function findCollapsedBlockStart(
	document: vscode.TextDocument,
	index: number,
	editor?: vscode.TextEditor,
): number | null {
	// Special check: if editor is not provided, we can't check visibility
	if (!editor) {
		return null;
	}

	if (!isAtCollapsedEdge(index, editor)) {
		return null;
	}

	const collapsedStart = findVisibleAboveCollapsed(index, editor);

	// Check if it's a valid block start
	if (
		collapsedStart >= 0 &&
		isLineVisible(collapsedStart, editor) &&
		!document.lineAt(collapsedStart).isEmptyOrWhitespace
	) {
		return collapsedStart;
	}

	return null;
}

// Find the start of the current block when moving up
function findBlockStart(
	document: vscode.TextDocument,
	index: number,
	editor?: vscode.TextEditor,
): number {
	while (index > 0 && !document.lineAt(index - 1).isEmptyOrWhitespace) {
		if (!isLineVisible(index - 1, editor)) {
			break; // Stop at collapsed region boundary
		}
		index--;
	}
	return index;
}

// Handle moving up to find block start
function handleMoveUp(
	document: vscode.TextDocument,
	index: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	if (index === boundary || document.lineAt(index).isEmptyOrWhitespace) {
		return index;
	}

	// Check if we're at the edge of a collapsed region
	const collapsedStart = findCollapsedBlockStart(document, index, editor);
	if (collapsedStart !== null) {
		return collapsedStart;
	}

	// Find the start of the current block
	if (isLineVisible(index, editor)) {
		return findBlockStart(document, index, editor);
	}

	return index;
}

// Process navigation to the next position
function processNavigation(
	document: vscode.TextDocument,
	index: number,
	step: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	// Skip to the end of the current block
	index = skipToEndOfBlock(document, index, step, boundary, editor);

	// Skip empty lines
	index = skipEmptyLines(document, index, step, boundary, editor);

	// Skip collapsed regions if needed
	if (!isLineVisible(index, editor)) {
		index = skipCollapsedRegion(index, step, boundary, editor);
		index = skipEmptyLines(document, index, step, boundary, editor);
	}

	return index;
}

// Handle moving down when stuck at collapsed region edge
function handleMoveDownAtCollapsedEdge(
	document: vscode.TextDocument,
	index: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	if (!editor || index === boundary) {
		return index;
	}

	const nextLine = index + 1;
	if (nextLine <= boundary && !isLineVisible(nextLine, editor)) {
		// Skip the collapsed region
		const afterCollapsed = skipCollapsedRegion(nextLine, 1, boundary, editor);
		return skipEmptyLines(document, afterCollapsed, 1, boundary, editor);
	}

	return index;
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

	const step = up ? -1 : 1;
	let index = processNavigation(
		document,
		position.line,
		step,
		boundary,
		editor,
	);

	// Handle special cases based on direction
	if (up) {
		return handleMoveUp(document, index, boundary, editor);
	}

	// Handle being stuck at the edge of a collapsed region when moving down
	if (index === position.line) {
		index = handleMoveDownAtCollapsedEdge(document, index, boundary, editor);
	}

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
	anchor?: vscode.Position,
) {
	const active = editor.selection.active.with(next, 0);
	editor.selection = new vscode.Selection(anchor || active, active);
	editor.revealRange(new vscode.Range(active, active));
}

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
