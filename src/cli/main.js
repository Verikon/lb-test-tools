import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import {MongoClient} from 'mongodb';
import {MongoFixtures} from '../MongoFixtures';
import {MockDataGen} from '../MockDataGen';
import {MongoAssets} from 'mongo-assets';

import Request from 'request-promise-native';
import Moment from 'moment';
import inquirer from 'inquirer';
import assert from 'assert';

import q from './questions';

const success = chalk.cyan.bold;
const failure = chalk.red.bold;
const info = chalk.yellow.bold;

export default class LBTTCLI {

	constructor( props ) {

		this.initialize();
	}

	initialize() {

		this.loadRC();
		this.registerPrompts();	
		this.mdg = new MockDataGen({config: this.config});
		this.fix = new MongoFixtures({config:{directory: this.config.fixtures_directory, mgURI: this.config.current_database}});
	}

	/**
	 * Register all the cool inquirer plugins.
	 */
	registerPrompts() {

		inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));
	}

	loadRC() {

		if(!this._rcExists()) {
			console.warn(chalk.red.bold('lb test tools is not setup, please run `lbtt config setup`'));
			return false;
		}

		let rcloc = path.join(this._homedir(), '.lbttrc');

		try {

			let rc_contents = fs.readFileSync(rcloc, 'utf8');
			this.config = JSON.parse(rc_contents);
			return true;

		} catch( err ) {

			console.error(failure('Corrupt config file ' + rcloc + '. Try reconfiguring with `lbtt config setup`'));
			return false;
		}
	}

	configure( ) {

		console.log('CONFIGURE:');
		console.log(process.cwd());
	}

	/**
	 * interractively set up lb tt
	 */
	async setup() {

		if(this._rcExists()){
			let overwrite = await inquirer.prompt([{type: 'confirm', name:'confirm', message: 'Overwrite existing config?'}]);
			if(!overwrite.confirm)
				return console.log(info('Setup cancelled by user.'));
		}

		const ans = await inquirer.prompt(q.setup());

		const mguri = 'mongodb://'+ans.mongo_user+':'+ans.mongo_pass+'@'+ans.mongo_host+':'+ans.mongo_port+'/'+ans.mongo_db;
		const databases = {default:mguri};

		let conn;

		//check the JSONschema service
		try {
			conn = await Request.get({url: ans.schema_uri});
		} catch( err ) {
			console.error(failure('Invalid schema uri - ' + ans.schema_uri));
		} 

		//check the mongo connection.
		await Promise.all(
			Object.keys(databases).map( async key => {
				conn = await this.canMGConnect(databases[key]);
				return true;
			})
		);

		//write the config out.
		let rconfig = {
			databases: databases,
			current_database: databases.default,
			fixtures_directory: ans.fixtures_dir,
			schema_uri: ans.schema_uri
		};

		let config_location = path.resolve(this._homedir(), '.lbttrc');

		try {
			fs.writeFileSync(config_location, JSON.stringify(rconfig, null, 2));
		} catch( err ) {

			console.log(failure('Could not write the config to '+config_location+'\n\n'+err.message));
		}
		console.log();
		console.log(success('Configuration complete'));

		return true;

	}

	async showConfig() {

		console.log(info(JSON.stringify(this.config, null, 2)));
	}

	async registerMocker() {


	}

	async listMockers() {

		let mockers = this.mdg.getMockerList();

		mockers.forEach(mocker => {
			console.log(info('name: '+mocker.name));

			if(mocker.description)
				console.log(chalk.yellow(mocker.description));

			if(mocker.args) {
				console.log('Arguments:')
				Object.keys(mocker.args).forEach(arg => {
					console.log('\t'+arg+': '+mocker.args[arg]);
				});
			};

			if(mocker.usage)
				console.log('Usage: '+mocker.usage);

			console.log();
		});
	}

	/**
	 * Mock some data.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.type the cannoncical type of asset to mock
	 * @param {Integer} args.num the number of assets to generate/mock
	 * 
	 * @returns {Promise}  
	 */
	async mockData({type, num, file}) {

		//assert valid arguments
		try{

			assert(typeof type === 'string' && type.length, 'Invalid --type. Should be an asset type');
			assert(typeof num === 'number' && num > 0, 'Invalid --num. Should be the number of how many mocks are to be generated');

			let nodeArray = await this.mdg.findArrayNodes({type: type});

			let mockconfig = {};
			await Promise.all( nodeArray.map( async node => {

				console.log(info('Asset type `'+type+'` requires a list '+node.type+'` for its property `'+node.key+'`'));

				return await inquirer.prompt({type:'input', name:node.key, message: 'Number of items to mock:', default: 10,validate:v=>{ return parseInt(v) > 1 ? true: 'Not a number'; }})
								.then(r=> { 
									let shim = {};
									let rkey = Object.keys(r)[0]
									shim[rkey] = {count:parseInt(r[node.key])};
									mockconfig = Object.assign(mockconfig,shim);
								});
				}));

			//create the mock data.
			let result = await this.mdg.mockFromSchema({type: type, num:num, mockconfig: mockconfig});
			assert(result.success === true, 'received an unexpected error building mocks');

			if(!file)
				return console.log(JSON.stringify(result.mocks, null, 2));

			//write the file out.
			let abs = path.resolve(file);			
			fs.writeFileSync(abs, JSON.stringify(result.mocks, null, 2));

		} catch( err ) {

			return this._cliError('createdata', err.message);
		}
	}

	async loadFixture({name}) {

	}

	/**
	 * Save a fixture.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.name the name of the fixture to save
	 * 
	 * @returns {Promise} 
	 */
	async saveFixture({name}) {

		const {fixtures_directory, databases, current_database} = this.config;
		let result, savelocation, fixturename;

		try {

			result = await inquirer.prompt({type: 'confirm', message: 'Create fixture from `'+this.config.current_database+'`', name: "confirm" });
			if(!result.confirm) console.log(info('Exit.'));

			if(!name) {
				result = await inquirer.prompt({type: 'input', message: 'Fixture name:', default: 'myfixture', name: 'name'});
				name = result.name;
			}

			console.log(info('Saving fixture ' + name));
			result = await this.fix.saveFixture({name: name});
			console.log(success('complete..'));

		} catch( err ) {

			this._cliError('saveFixture', err.message);
		}
	}

	async backupMongo({file, db, azure, uri}) {

		const {fixtures_directory, databases, current_database} = this.config;
		let result, savelocation;

		try {

			let dbname = Object.keys(databases).find(key=>{ return databases[key] === current_database});
			let defaultFilename = dbname + '-' + Moment(new Date()).format('YYYYMMDD-HHMM')+'.tar';

			result = await inquirer.prompt({type: 'confirm', message: 'Create backup of `'+this.config.current_database+'`', name: "confirm" });
			if(!result.confirm) console.log(info('Exit.'));

			result = await inquirer.prompt({type: 'input', message:'Save as:', default: path.join(fixtures_directory, defaultFilename), name: 'location'});
			savelocation = result.location;

			if(fs.existsSync(savelocation)) {
				result = await inquirer.prompt({type: 'confirm', message: 'File '+savelocation+' exists. Overwrite?', name:'confirm'});
				if(!result.confirm) console.log(info('Exit.'));
			}

			console.log(info('Backing up...'));
			result = await this.fix.saveFixture({location: savelocation});
			console.log(success('Saved... '));

		} catch(err) {

			this._cliError('backupMongo', err.message);
		}

	}

	async restoreMongo() {

	}

	async canMGConnect( uri ) {

		try {
			console.log(success('Testing database '+uri+' ... '));
			const conn = await MongoClient.connect(uri, {useNewUrlParser: true});
			console.log(success('connection OK.'));
			conn.close();
			return true;
		} catch( err ) {
			console.log(chalk.red.bold('Database ' + uri + ' failed:'))
			console.error(err.message);
			return false;
		}
	}

	_rcExists() {

		return fs.existsSync(path.join(this._homedir(), '.lbttrc'));
	}


	_homedir() {

		return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
	}

	_cliError(climethod, message) {
		
		console.error(chalk(failure(climethod+' : '+message)));
	}

}