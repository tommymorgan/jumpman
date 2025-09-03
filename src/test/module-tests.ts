// Run the module tests for internal functions
import * as assert from 'assert';

// Set the flag to run module tests
(global as any).runModuleTests = true;
(global as any).describe = describe;
(global as any).it = it;

// Import the module which will run its internal tests
import '../extension';

// The tests run during import due to the runModuleTests flag