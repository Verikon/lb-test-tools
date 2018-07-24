
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import inquirer from 'inquirer';
import assert from 'assert';
import q from './questions';

const success = chalk.cyan.bold;
const failure = chalk.red.bold;
const info = chalk.yellow.bold;


export default class cliDatabase {

	constructor( main ) {

		this.main = main;
	}

	async list() {

		let db, current;
		console.log(info('Databases:'));
		console.log();

		Object.keys(this.main.config.databases).forEach( name => {
			
			db = this.main.config.databases[name];
			current = this.main.config.current_database === db;

			current
				? console.log(success('\t* '+name+ ' - ' + db))
				: console.log(info('\t'+name+ ' - ' + db));
		});
		console.log();
	}

	async add() {

		let answ,
			uri,
			RCConfig;

		try {
			
			console.log(info('Creating new mongo database'));
			console.log();

			RCConfig = Object.assign({}, this.main.config);

			//console.log(RCConfig);
			answ = await inquirer.prompt(questions.add());

			//make sure we're not overwriting an existing db name.
			if(RCConfig.databases[answ.name])
				throw new Error('Database '+answ.name+' is already used, try a different name');

			//create the uri
			uri = 'mongodb://'+answ.user+':'+answ.pass+'@'+answ.host+':'+answ.port+'/'+answ.db;

			//uri = 'mongodb://ecmis:Enterra!02@10.2.0.16:27017/ecmis'

			//test the uri
			console.log(info('Attempting to connect to ' + uri));
			try {
				await this.main.assets.connect({endpoint: uri});
			} catch( err ) {
				throw new Error('Could not connect to the database');
			} 
			console.log(info('Success.'));
			console.log();

			//update RCConfig, and write it
			RCConfig.databases[answ.name] = uri;

			//set immediately?
			answ = await inquirer.prompt({ name:'confirmed', type: 'confirm', message: 'Use database '+answ.name+' now?'});
			if(answ.confirmed)
				RCConfig.current_database = uri;

			//write the config out.
			this.main._writeRC(RCConfig);

			console.log(info('Database successfully added.'));

		} catch( err ) {

			return this.main._cliError('add', err.message)
		}

	}

	async switch() {

		let answ,
			RCConfig;

		try {

			RCConfig = Object.assign({}, this.main.config);

			console.log(info('Switching default database'));
			console.log();
			
			answ = await inquirer.prompt(questions.switch(RCConfig.databases));

			RCConfig.current_database = answ.database.uri;

			this.main._writeRC(RCConfig);

			console.log(info('done.'));

		} catch( err ) {

			return this.main._cliError('add', err.message)
		}
	}
}

const questions = {

	add:() => {
		
		return [
			{
				name: 'name',
				type: 'input',
				message: 'Connection name'
			},
			{
				name: 'host',
				type:'input',
				message: 'Mongo Host:',
				default: 'localhost'
			},
			{
				name: 'user',
				type: 'input',
				message: 'Mongo User:'
			},
			{
				name: 'pass',
				type: 'password',
				message: 'Mongo Password:'
			},
			{
				name: 'port',
				type: 'input',
				message: 'Mongo Port',
				default: 27017
			},
			{
				name: 'db',
				type: 'input',
				message: 'Mongo Initial Database:',
				default: 'mongo'
			},
		]
	},

	switch: ( databases ) => {

		return [
			{
				name: 'database',
				type: 'list',
				message: 'Select Database:',
				choices: Object.keys(databases).map(name => { 
					return {name: name+' ['+databases[name]+']', value: {name:name,uri:databases[name]}};
				})
			}
		];
	}

}