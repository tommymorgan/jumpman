import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

// Type definition for keybinding
interface Keybinding {
	command: string;
	key: string;
	mac: string;
	when: string;
}

suite("Keyboard Shortcuts Configuration", () => {
	test("should define default keyboard shortcuts for all commands", () => {
		// Read package.json to verify keyboard shortcuts are configured
		const packageJsonPath = path.resolve(__dirname, "../../../../package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

		// Verify keybindings section exists
		assert.ok(
			packageJson.contributes.keybindings,
			"Package.json should have keybindings defined",
		);

		const keybindings: Keybinding[] = packageJson.contributes.keybindings;

		// Expected keybindings for each command
		const expectedBindings = [
			{
				command: "jumpman.moveUp",
				windowsLinuxKey: "ctrl+up",
				macKey: "alt+up",
			},
			{
				command: "jumpman.moveDown",
				windowsLinuxKey: "ctrl+down",
				macKey: "alt+down",
			},
			{
				command: "jumpman.selectUp",
				windowsLinuxKey: "shift+ctrl+up",
				macKey: "shift+alt+up",
			},
			{
				command: "jumpman.selectDown",
				windowsLinuxKey: "shift+ctrl+down",
				macKey: "shift+alt+down",
			},
		];

		// Verify each expected binding exists
		for (const expected of expectedBindings) {
			const binding = keybindings.find((kb) => kb.command === expected.command);
			assert.ok(binding, `Keybinding for ${expected.command} should exist`);

			// Check Windows/Linux key
			assert.strictEqual(
				binding.key,
				expected.windowsLinuxKey,
				`${expected.command} should have key '${expected.windowsLinuxKey}' for Windows/Linux`,
			);

			// Check Mac key
			assert.strictEqual(
				binding.mac,
				expected.macKey,
				`${expected.command} should have mac key '${expected.macKey}'`,
			);

			// Verify it's enabled in text editor context
			assert.strictEqual(
				binding.when,
				"editorTextFocus",
				`${expected.command} should be active when editor has focus`,
			);
		}

		// Verify we have exactly 4 keybindings
		assert.strictEqual(
			keybindings.length,
			4,
			"Should have exactly 4 keybindings configured",
		);
	});
});
