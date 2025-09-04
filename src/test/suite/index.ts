import * as fs from "node:fs";
import * as path from "node:path";
import Mocha from "mocha";

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: "tdd",
		color: true,
		timeout: 2000,
	});

	const testsRoot = path.resolve(__dirname, "..");
	const suiteDir = path.resolve(testsRoot, "suite");

	// Find all compiled test files
	const testFiles = fs
		.readdirSync(suiteDir)
		.filter((file) => file.endsWith(".test.js"))
		.map((file) => path.resolve(suiteDir, file));

	// Add each test file to mocha
	for (const testFile of testFiles) {
		mocha.addFile(testFile);
	}

	return new Promise<void>((resolve, reject) => {
		// Run the mocha test
		mocha.run((failures: number) => {
			if (failures > 0) {
				reject(new Error(`${failures} tests failed.`));
			} else {
				resolve();
			}
		});
	});
}
