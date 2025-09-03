// Set the flag to run module tests
interface ExtendedGlobal {
	runModuleTests?: boolean;
	describe?: typeof describe;
	it?: typeof it;
}

const extendedGlobal = global as typeof global & ExtendedGlobal;
extendedGlobal.runModuleTests = true;
extendedGlobal.describe = describe;
extendedGlobal.it = it;

// Import the module which will run its internal tests
import "../extension";

// The tests run during import due to the runModuleTests flag
