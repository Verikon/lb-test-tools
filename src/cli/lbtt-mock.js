#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<command> <arg1>', 'command')
	.option('-t, --type <type>', 'the schema/asset type to use')
	.option('-n, --num <num>', 'Mongo database to save as a fixture')
	.option('-f, --file <file>', 'Save output to file')
	.option('-l, --local', 'Use the locale schema directory')
	.action( async (cmd, arg1) => {

		const CLI = new LBTTCLI();
		if(program.num) program.num = parseFloat(program.num);

		switch(cmd) {

			case 'register':
				await CLI.registerMocker({file:program.file});
				break;

			case 'createdata':
				await CLI.mockData({type:program.type, num:program.num, file:program.file});
				break;

			case 'bake':
				await CLI.bake({file:arg1});
				break;

			case 'mockers':
				await CLI.listMockers();
				break;
			
			case 'test':

				await CLI.test({type: 'mock', schema: arg1, local: program.local})
				break;
			default:
				console.error('unknown mock command `'+command+'` use: lbtt mock for help.')

		}

	});

program.parse(process.argv);

if(!process.argv.slice(2).length){

	const examples = [
		'Examples:',
		'',
		'% lbtt mock bake ./bake.yml',
		'',
		'Creating mock data',
		'% lbtt mock createdata --type=myschema --num=10 --file ./here.json',
		'% lbtt mock createdata --type=myschema --num=1000 --db --collection my/collection',
		'',
		'Getting a list of current mockers',
		'% lbtt mock mockers',
		'Registering a mocker function:',
		'% lbtt mock register --file=/some/dir/mocker.js -- register a mocker function',
		'',
		'Test a schema',
		'% lbtt mock test my/test',
		'',
		
	]

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}