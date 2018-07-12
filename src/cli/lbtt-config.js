#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<command>', 'command')
	.option('-u, --uri', 'Mongo database to save as a fixture')
	.action( async (command) => {

		const CLI = new LBTTCLI();

		switch(command) {

			case 'list':
				await CLI.showConfig();
				break;

			case 'setup':
				await CLI.setup();
				break;

			case 'set':
				console.log('TODO');
				break;

			default:
				console.error('unknown config command `'+command+'` use: lbtt config for help.')
		}

	});

program.parse(process.argv);

if(!process.argv.slice(2).length){

	const examples = [
		'Examples:',
		'',
		'% lbtt config setup -- run the interractive lb test tools setup',
		'% lbtt config list -- lists current lb test-tools config',
		'% lbtt config set mguri mongodb://somewhere:27107/db -- set a specific variable',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}