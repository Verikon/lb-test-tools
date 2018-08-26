import CLIBase from './CLIBase';

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import inquirer from 'inquirer';
import assert from 'assert';
import q from './questions';
import {MongoFixtures} from '../../MongoFixtures';

const success = chalk.cyan.bold;
const failure = chalk.red.bold;
const info = chalk.yellow.bold;

export default class cliDatabase extends CLIBase {

	constructor( main ) {

		super(main);
	}

	async add() {

		const rc = this.RC();

		let answ,
			uri,
			RCConfig;

		try {
			
			console.log(info('Creating new mongo database'));
			console.log();

			RCConfig = Object.assign({}, rc);

			//console.log(RCConfig);
			answ = await inquirer.prompt(questions.add());

			//make sure we're not overwriting an existing db name.
			if(RCConfig.databases[answ.name])
				throw new Error('Database '+answ.name+' is already used, try a different name');

			//create the uri
			uri = 'mongodb://'+answ.user+':'+answ.pass+'@'+answ.host+':'+answ.port+'/'+answ.db;

			//test the uri
			console.log(info('Attempting to connect to ' + uri));
			try {

				await this.main.assets.connect({endpoint: uri});
			} catch( err ) {

				throw new Error('Could not connect to the database');
			} 
			console.log(info('Success.'));
			console.log();

			await this.main.assets.disconnect();


			//update RCConfig, and write it
			RCConfig.databases[answ.name] = uri;

			//set immediately?
			answ = await inquirer.prompt({ name:'confirmed', type: 'confirm', message: 'Set this database '+answ.name+' as the default database?'});
			if(answ.confirmed)
				RCConfig.current_database = uri;

			//write the config out.
			this.main._writeRC(RCConfig);

			console.log(info('Database successfully added.'));

		} catch( err ) {

			return this.main._cliError('add', err.message)
		}

	}

	async list() {

		const rc = this.RC();
		
		console.log(info('Databases:'));
		console.log();
		Object.keys(rc.databases).forEach(dbname => {

			const db = rc.databases[dbname];
			const defaultdb = db === rc.current_database;

			defaultdb
				? console.log(success('\t* '+dbname+' - '+db))
				: console.log(info('\t'+dbname+' - '+db));
		})
		console.log();
	}

	async remove() {

		try {

			const rc = this.RC();

			const answ = await inquirer.prompt(questions.remove(rc.databases));
			const confirm = await inquirer.prompt({name: 'confirm', type: 'confirm', message: 'Remove this database', default: false});

			if(!confirm.confirm)
				return console.log(success('Aborted.'));

			const RCConfig = Object.assign({}, rc);

			//is default?
			const isDefault = RCConfig.current_database === answ.database.uri;

			let dbkey;
			Object.keys(RCConfig.databases).some(dbname => {
				if(RCConfig.databases[dbname] === answ.database.uri) {
					dbkey = dbname;
					return true;
				}
			});

			delete RCConfig.databases[dbkey];

			if(isDefault) {
				console.log(info('You are removing the default database, please select the new default'));
				const result = await this.default();
				RCConfig.current_database = null;
			}

			console.log('RC', RCConfig);


		} catch( err ) {

			return this.main._cliError('add', err.message)
		}


		console.log('ANSWERZ>>>', answ);
		console.log('Confirm', confirm);
	}

	async default() {

		try {

			const rc = this.RC();
			let RCConfig = Object.assign({}, rc);

			const answ = await inquirer.prompt(questions.default(rc.databases));
			RCConfig.current_database = answ.database.uri;

			await this.writeRC(RCConfig);

			console.log(success('Configuration updated.'));

		} catch( err ) {

			this.main._cliError('default', err.message);
		}


	}

}

const questions = {

	add:() => {
		
		return [
			{
				name: 'name',
				type: 'input',
				message: 'Name for this MongoDB:'
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

	remove: ( databases ) => {

		return [
			{
				name: 'database',
				type: 'list',
				message: info('Select Database to remove'),
				choices: Object.keys(databases).map(name => {
					return {name: name+' ['+databases[name]+']', value: {name:name,uri:databases[name]}};
				})
			}
		]
	},

	default: ( databases ) => {

		return [
			{
				name: 'database',
				type: 'list',
				message: info('Select the default database'),
				choices: Object.keys(databases).map(name => {
					return {name: name+' ['+databases[name]+']', value: {name:name,uri:databases[name]}};
				})
			}
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