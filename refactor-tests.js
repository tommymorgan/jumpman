const fs = require('fs');

// Read the test file
let content = fs.readFileSync('src/test/suite/private-functions.test.ts', 'utf8');

// Replace patterns for TextEditor mocks
content = content.replace(
  /const mockEditor = \{\s*visibleRanges: \[(.*?)\],?\s*\} as unknown as vscode\.TextEditor;/gs,
  (match, ranges) => `const mockEditor = createMockEditor([${ranges}]);`
);

// Replace patterns for TextDocument mocks - simple lineAt functions
content = content.replace(
  /const mockDoc = \{\s*lineCount: (\d+),\s*lineAt: \((.*?)\) => \((.*?)\),?\s*\} as vscode\.TextDocument;/gs,
  (match, lineCount, param, body) => {
    // Check if it's a simple function
    if (body.includes('createLineAtSimple')) {
      return match.replace('as vscode.TextDocument', 'as unknown as vscode.TextDocument');
    }
    return `const mockDoc = createMockDocument(${lineCount}, (${param}) => (${body}));`;
  }
);

// Replace patterns for TextDocument mocks with unknown
content = content.replace(
  / as unknown as vscode\.TextDocument;/g,
  ' as unknown as vscode.TextDocument;'
);

// Special case for markSelection tests with selection tracking
const markSelectionPattern = /const mockEditor = \{[\s\S]*?_selection: undefined as vscode\.Selection \| undefined,\s*\} as unknown as vscode\.TextEditor & \{ _selection\?: vscode\.Selection \};/g;

let markSelectionCount = 0;
content = content.replace(markSelectionPattern, (match) => {
  markSelectionCount++;
  const selectionMatch = match.match(/new vscode\.Selection\(\s*(.*?)\s*\)/);
  const selection = selectionMatch ? selectionMatch[1] : 'new vscode.Position(5, 0), new vscode.Position(5, 0)';
  
  return `const mockEditor = createMockEditorWithSelection(
				new vscode.Selection(${selection})
			);`;
});

// Remove the Object.defineProperty blocks that follow
content = content.replace(
  /\n\s*\/\/ Use setter to capture the selection[\s\S]*?configurable: true,\s*\}\);/g,
  ''
);

content = content.replace(
  /\n\s*Object\.defineProperty\(mockEditor, "selection", \{[\s\S]*?configurable: true,\s*\}\);/g,
  ''
);

// Update variable references from capturedSelection to mockEditor.capturedSelection
content = content.replace(/capturedSelection/g, 'mockEditor.capturedSelection');
content = content.replace(/capturedRange/g, 'mockEditor.capturedRange');

// Clean up declarations that are no longer needed
content = content.replace(
  /\s*let capturedSelection: vscode\.Selection \| undefined;\s*/g,
  ''
);
content = content.replace(
  /\s*let capturedRange: vscode\.Range \| undefined;\s*/g,
  ''
);

// Write the updated content
fs.writeFileSync('src/test/suite/private-functions.test.ts', content);

console.log('Refactoring complete!');
console.log(`Replaced ${markSelectionCount} markSelection test mocks`);