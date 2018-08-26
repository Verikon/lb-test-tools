#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<type> [name] [target]', 'type')
	.action(async (type, name, target) => {
		
		const CLI = new LBTTCLI();

		switch(type) {

			case 'fixture':
				await CLI.loadFixture({name: name, target: target});
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
		'% lbtt load fixture myFixture -- load myFixture',
		'% lbtt load fixture -- load a fixture through a prompt UI',
		'',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}