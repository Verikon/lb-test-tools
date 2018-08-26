#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<type>', 'type')
	.option('-n, --name <name>', 'fixture name')
	.action(async (type) => {
		
		const CLI = new LBTTCLI();

		switch(type) {

			case 'db':
			case 'database':
				await CLI.default({type: type});
				break;

			default:
				console.error('Cannot load '+type+ 'use `lbtt load` for help.');
		}

	});

program.parse(process.argv);

if(!process.argv.slice(2).length){

	const examples = [
		'Examples:',
		'',
		'% lbtt default database -- set the default database through the CLI',
		'% lbtt default database mydb -- set mydb to be the default database',
		'',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}