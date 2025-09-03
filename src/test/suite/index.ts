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

	mocha.addFile(path.resolve(testsRoot, "suite/extension.test.js"));
	mocha.addFile(path.resolve(testsRoot, "suite/internal-functions.test.js"));

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
