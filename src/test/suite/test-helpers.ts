import * as vscode from "vscode";

// Type definitions for mocks
export interface MockLine {
	isEmptyOrWhitespace: boolean;
	text: string;
}

// Helper to create mock line data
export function createMockLine(isEmpty: boolean, text: string): MockLine {
	return {
		isEmptyOrWhitespace: isEmpty,
		text: text,
	};
}

// Helper to create line based on simple empty indices
export function createLineAtSimple(
	emptyIndices: number[],
): (n: number) => MockLine {
	return (n: number) => {
		const isEmpty = emptyIndices.includes(n);
		return createMockLine(isEmpty, isEmpty ? "" : `line ${n}`);
	};
}

// Helper to create mock line with specific empty indices
export function createMockLineAt(n: number, emptyIndices: number[]): MockLine {
	const isEmpty = emptyIndices.includes(n);
	return {
		isEmptyOrWhitespace: isEmpty,
		text: isEmpty ? "" : `line ${n}`,
	};
}

// Helper to create line with special cases
export function createLineAtWithSpecial(
	emptyIndices: number[],
	specialCases: Map<number, string>,
): (n: number) => MockLine {
	return (n: number) => {
		const isEmpty = emptyIndices.includes(n);
		const specialText = specialCases.get(n);
		if (specialText !== undefined) {
			return createMockLine(false, specialText);
		}
		return createMockLine(isEmpty, isEmpty ? "" : `line ${n}`);
	};
}

// Helper to create a document for testing
export async function createDocument(
	lines: string[],
): Promise<vscode.TextDocument> {
	const content = lines.join("\n");
	const doc = await vscode.workspace.openTextDocument({
		content,
		language: "typescript",
	});
	return doc;
}
