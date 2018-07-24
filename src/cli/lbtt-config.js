#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<command> [arg1]', 'command')
	.option('-u, --uri', 'Mongo database to save as a fixture')
	.action( async (command, arg1) => {

		const CLI = new LBTTCLI();

		switch(command) {

			case 'list':
				
				if(!arg1)
					await CLI.showConfig();
				else
					await CLI.list({type: arg1});
				break;
				
			case 'setup':
				await CLI.setup();
				break;

			case 'set':
				console.log('TODO');
				break;

			case 'add':
				await CLI.add({type: arg1});
				break;

			case 'switch':
				await CLI.switch({type: arg1});
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