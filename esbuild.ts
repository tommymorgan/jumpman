import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const esbuildOptions: esbuild.BuildOptions = {
	entryPoints: ["src/extension.ts"],
	bundle: true,
	outfile: "dist/extension.js",
	external: ["vscode"],
	format: "cjs",
	platform: "node",
	target: "node20",
	sourcemap: production ? false : true,
	minify: production,
	logLevel: "info",
};

async function build() {
	try {
		if (watch) {
			const context = await esbuild.context(esbuildOptions);
			await context.watch();
			console.log("Watching for changes...");
		} else {
			const result = await esbuild.build(esbuildOptions);
			console.log("Build complete");
		}
	} catch (error) {
		console.error("Build failed:", error);
		process.exit(1);
	}
}

build();