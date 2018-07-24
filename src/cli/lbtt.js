#!/usr/bin/env node

import program from 'commander';

program
	.version('0.1.0')
	.command('config <command>', 'configure lb test tools')
	.command('fixtures <sect2> <cmd>', 'tools for using backups and fixtures')
	.command('mock <command>', 'tools for creating mock data')
	.command('mongo <command>', 'mongo tools')
	.command('install', 'CLI setup and installation').alias('setup')
	.command('test <type>', 'testing tools')
	.command('bake <recipe>', 'mock baking')
	.parse(process.argv);
