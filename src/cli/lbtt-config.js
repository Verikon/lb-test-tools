#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.option('-u, --uri', 'Mongo database to save as a fixture')
	.action((type, cmd) => {

		console.log('HI');
		/**
		const config = require(cmd.dev ? '../../config-dev' : '../../config');
		const CLI = new AuthCLI({config: config});

		CLI.create({type: type});
		**/
	});

program.parse(process.argv);

if(!process.argv.slice(2).length){

	const examples = [
		'Examples:',
		'',
		'% lbtt fixtures save -- save the mongo db state as a fixture',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}