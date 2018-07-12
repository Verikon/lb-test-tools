#!/usr/bin/env node

import program from 'commander';

program
	.version('0.1.0')
	.command('config <command>', 'configure lb test tools')
	.command('fixtures <sect2> <cmd>', 'tools for using backups and fixtures')
	.command('mock <command>', 'tools for creating mock data')
	.parse(process.argv);
