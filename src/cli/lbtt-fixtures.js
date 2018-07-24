#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<command>', 'command')
	.option('-n, --name <name>', 'fixture name')
	.action(async cmd => {
		
		const CLI = new LBTTCLI();

		if(typeof program.name === 'function') program.name = null;

		switch(cmd) {

			case 'save':
				await CLI.saveFixture({name:program.name});
				break;

			case 'load':
				await CLI.loadFixture({name:program.name});
				break;

			case 'list':
				await CLI.listFixtures();
				break;

			default:
				console.error('unknown mock command `'+cmd+'` use: lbtt fixtures for help.')

		}
	});

program.parse(process.argv);

if(!process.argv.slice(2).length){

	const examples = [
		'Examples:',
		'',
		'% lbtt fixtures save -- save the mongo db state as a fixture',
		'% lbtt fixtures load -- load a fixture',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}