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

// Find the next visible block when moving down
function findNextVisibleBlock(
	document: vscode.TextDocument,
	startIndex: number,
	boundary: number,
	editor?: vscode.TextEditor,
): number {
	let index = startIndex;
	
	// First, skip to the end of the current block if we're in one
	if (!document.lineAt(index).isEmptyOrWhitespace) {
		while (index < boundary) {
			const nextLine = index + 1;
			if (nextLine > boundary) break;
			if (!isLineVisible(nextLine, editor)) break;
			if (document.lineAt(nextLine).isEmptyOrWhitespace) break;
			index = nextLine;
		}
	}
	
	// Now find the next block
	while (index < boundary) {
		index++;
		
		// Skip collapsed regions
		if (!isLineVisible(index, editor)) {
			index = skipCollapsedRegion(index, 1, boundary, editor);
			if (index > boundary) return boundary;
		}
		
		// We found a visible line - check if it's non-empty and not a closing brace
		if (isLineVisible(index, editor) && !document.lineAt(index).isEmptyOrWhitespace) {
			const lineText = document.lineAt(index).text.trim();
			// Skip standalone closing braces and continue looking
			if (lineText === '}' || lineText === ']' || lineText === ')' || 
				lineText === '};' || lineText === '];' || lineText === ');') {
				continue;
			}
			// Found a valid block start
			return index;
		}
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
	let index = startIndex;
	
	// First, skip to the start of the current block if we're in one
	if (!document.lineAt(index).isEmptyOrWhitespace) {
		while (index > boundary) {
			const prevLine = index - 1;
			if (!isLineVisible(prevLine, editor)) break;
			if (document.lineAt(prevLine).isEmptyOrWhitespace) break;
			index = prevLine;
		}
	}
	
	// Now move backwards to find the previous block
	while (index > boundary) {
		index--;
		
		// Skip collapsed regions
		if (!isLineVisible(index, editor)) {
			index = skipCollapsedRegion(index, -1, boundary, editor);
			if (index < boundary) return boundary;
		}
		
		// Skip empty lines
		while (index >= boundary && document.lineAt(index).isEmptyOrWhitespace) {
			index--;
			if (index < boundary) return boundary;
		}
		
		if (index < boundary) return boundary;
		
		// Check if this line is visible and not just a closing brace
		if (isLineVisible(index, editor)) {
			const lineText = document.lineAt(index).text.trim();
			// Skip standalone closing braces when moving up
			if (lineText === '}' || lineText === ']' || lineText === ')' || 
				lineText === '};' || lineText === '];' || lineText === ');') {
				continue;
			}
			
			// Found a valid block, now find its start
			while (index > boundary) {
				const prevLine = index - 1;
				if (!isLineVisible(prevLine, editor)) break;
				if (document.lineAt(prevLine).isEmptyOrWhitespace) break;
				const prevText = document.lineAt(prevLine).text.trim();
				// Don't go past another closing brace
				if (prevText === '}' || prevText === ']' || prevText === ')' || 
					prevText === '};' || prevText === '];' || prevText === ');') {
					break;
				}
				index = prevLine;
			}
			return index;
		}
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
	findNextVisibleBlock,
	findPreviousVisibleBlock,
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