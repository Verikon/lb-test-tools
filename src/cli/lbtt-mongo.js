#!/usr/bin/env node

import LBTTCLI from './main';

import program from 'commander';
import chalk from 'chalk';

program
	.version('0.1.0')
	.arguments('<command>', 'command')
	.option('-f, --file <filename>', 'the file to use')
	.option('-d, --db <dbname>', 'the database tag for a db in your config')
	.option('-u, --uri <mgURI>', 'a mongo urito use')
	.option('-a, --azure <aname>', 'store to an azure container')
	.action( async (cmd, argx) => {

		const CLI = new LBTTCLI();
		const {file, dbname, uri, azure} = program;

		switch(cmd) {

			case 'backup':
				await CLI.backupMongo({file: file, db: dbname, uri:uri, azure:azure});
				break;

			case 'restore':
				await CLI.restoreMongo();
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
		'Backup the default mongo database',
		'% lbtt mongo backup',
		'% lbtt mongo backup --file mybackup.tar',
		'% lbtt mongo backup --db client-dev --file mybackup.tar',
		'% lbtt mongo backup --uri mongodb://user:pass@server:27017/database --file backup.tar',
		'% lbtt mongo backup --azure mycontainer/mybackup',
		'',
		'Restore a current mongo database',
		'% lbtt mongo restore --file mybackup.tar',
		'% lbtt mongo restore --uri mongodb://user:pass@server:27017/database --file backup.tar',
		'% lbtt mongo restore --azure mycontainer/mybackup.tar',
		''
	];

	program.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return chalk.yellow.bold(output.join('\n')) });
}