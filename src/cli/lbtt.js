#!/usr/bin/env node

import program from 'commander';

program
	.version('0.1.0')
	.command('config', 'configure lb test tools')
	.command('fixtures <sect> <cmd>', 'save the test database state as a fixture')
	.parse(process.argv);
