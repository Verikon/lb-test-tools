#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<module> [type]', 'command')
	.option('-l, --local', 'Use the locale schema directory')
	.option('-v, --verbose', 'Verbose output during bake')
	.option('-f, --fixture <name>', 'Load a fixture before baking')
	.option('-d, --drop', 'empty the database before baking')
	.action( async recipe => {

		const CLI = new LBTTCLI();

		let result = await CLI.bake({
			file: recipe,
			fixture: program.fixture,
			drop: program.drop,
			local: !!program.local,
			verbose: !!program.verbose
		})

	});

program.parse(process.argv);

if(!process.argv.slice(2).length){

	const examples = [
		'Examples:',
		'',
		'% lbtt bake ./myrecipe.yml |bake a recipe',
		'% lbtt bake ./myrecipe.yml -fixture ~/myfixture |bake a recipe',
		'',
		''
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}