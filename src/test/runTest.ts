import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		const extensionDevelopmentPath = path.resolve(__dirname, "../../../");

		// The path to the test runner script (compiled)
		const extensionTestsPath = path.resolve(__dirname, "./suite/index");

		// Download VS Code, unzip it and run the integration test
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [], // Don't disable extensions, we need our extension to load
		});
	} catch (err) {
		console.error("Failed to run tests:", err);
		process.exit(1);
	}
}

main();
