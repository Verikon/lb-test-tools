#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<type> [name] [source]', 'type')
	.option('-n, --name <name>', 'fixture name')
	.action(async (type, name, source) => {
		
		const CLI = new LBTTCLI();

		switch(type) {

			case 'fixture':
				await CLI.saveFixture({name: name, db: source});
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
		'% lbtt save fixture -- save a fixture through the CLI',
		'% lbtt save fixture myFixture -- save myFixture (database selected via CLI)',
		'% lbtt save fixture myFixture mydb -- save myFixture using the myDb database',
		'',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}