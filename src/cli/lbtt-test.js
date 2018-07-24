#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<module> [type]', 'command')
	.option('-l, --local', 'Use the locale schema directory')
	.action( async (module, type) => {

		const CLI = new LBTTCLI();

		switch(module) {

			case 'mock':
				await CLI.test({type: 'mock', schema: type, local: program.local})
				break;

			default:
				console.error('unknown test command `'+command+'` use: lbtt test for help.')

		}

	});

program.parse(process.argv);

if(!process.argv.slice(2).length){

	const examples = [
		'Examples:',
		'',
		'% lbtt test mock this/asset | test the this/asset mock',
		'% lbtt test mock this/asset --local | test the this/asset mock using your local schema library',
		'',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}