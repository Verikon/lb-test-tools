import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import {MongoClient} from 'mongodb';
import {MongoFixtures} from '../MongoFixtures';
import {MockDataGen} from '../MockDataGen';
import MongoAssets from 'mongo-assets';

import YAML from 'yamljs';
import Request from 'request-promise-native';
import Moment from 'moment';
import inquirer from 'inquirer';
import assert from 'assert';

import CLIDatabase from './cli.database';
import CLIMock from './modules/CLIMock';

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
		this.bindModules();
		this.registerPrompts();	

		this.mdg = new MockDataGen({config: this.config});
		this.fix = new MongoFixtures({config:{directory: this.config.fixtures_directory, mgURI: this.config.current_database}});
		this.assets = new MongoAssets({config:{endpoint:this.config.current_database}});
	}

	bindModules() {

		const db = new CLIDatabase(this);
		const mock = new CLIMock(this);

		this.types = this.modules = {
			database: db,
			databases: db,
			mock: mock,
			mocks: mock
		};
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

		console.log();
		console.log(info('LBTT uses JSONSchema for its data mocking'));
		const json_answers = await inquirer.prompt(q.schema_setup());

		//add a backslash if one wasn't provided
		if(json_answers.schema_uri.substr(-1) !== '/')
			json_answers.schema_uri+='/';

		let schemas = {
			default: {
				uri: json_answers.schema_uri,
				dir: json_answers.schema_dir
			}
		};

		//setup mongo
		console.log();
		console.log(info('LBTT needs a mongo database to export/import produced data to:'));

		let conn;
		const ans = await inquirer.prompt(q.mongo_uri());
		const mguri = ans.mongo_uri;
		const databases = {default:mguri};

		//check the mongo connection.
		await Promise.all(
			Object.keys(databases).map( async key => {
				conn = await this.canMGConnect(databases[key]);
				return true;
			})
		);

		console.log();
		console.log(info('LBTT Fixtures:'));
		const fix_questions = await inquirer.prompt(q.fixtures_setup());

		let rcconfig = {
			databases: databases,
			current_database: databases.default,
			schemas: schemas,
			current_schema: schemas.default,
			fixtures_directory: fix_questions.fixtures_dir
		};

		let config_location = path.resolve(this._homedir(), '.lbttrc');

		console.log()
		console.log(info('Review:'))
		console.log(success('\tSchema server: ' + rcconfig.current_schema.uri))
		console.log(success('\tSchema server: ' + rcconfig.current_schema.dir))
		console.log(success('\tMongo URI: ' + rcconfig.current_database))
		console.log(success('\tFixtures directory: ' + rcconfig.fixtures_directory));
		console.log();

		let confirm = await inquirer.prompt({
			type: 'confirm',
			name: 'confirm',
			message: chalk.yellow('Write configuration')
		})

		if(!confirm.confirm)
			return console.log(info('Exit'));

		try {
			fs.writeFileSync(config_location, JSON.stringify(rcconfig, null, 2));
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

	async list({type}) {

		try {

			assert(this.types[type], 'Unknown type ' +type);
			const inst = this.types[type];

			assert(typeof inst.list === 'function', 'no list function on '+type);

			inst.list();

		} catch( err ) {

			return this._cliError('list', err.message)
		}
	}

	async add({type}) {

		try {

			assert(this.types[type], 'Unknown type ' +type);
			const inst = this.types[type];

			assert(typeof inst.add === 'function', 'no add function on '+type);

			inst.add();


		} catch( err ) {

			return this._cliError('add', err.message)
		}
	}

	async switch({type}) {

		try {

			assert(this.types[type], 'Unknown type'+type);
			const inst = this.types[type];

			assert(typeof inst.switch === 'function', 'no switch function on '+type);

			inst.switch();


		} catch( err ) {

			return this._cliError('switch', err.message)
		} 
	}

	/**
	 * Bake a mock recipe.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.file the filelocation of the YML recipe to be baked.
	 * @param {String} args.fixture a fixture to load prior to baking
	 * @param {Boolean} args.drop drop all collections and bake to a clean/empty database
	 * 
	 * @returns {Promise}
	 */
	async bake({file, fixture, drop, verbose, local}) {

		let result;

		console.log(info('Baking recipe ' + file));
		console.log(info('Schema URL', local ? 'Local' : 'Remote'));
		console.log();

		//loads and parses the yml.
		try {

			let result,
				confirm, //confirm placehold for inquirer
				useMongoAssets, //baking to the mongo-assets conventions.
				user, //the user performing the bake.
				role; //the role recieving the mocks being baked

			//set the verbosity level
			this.mdg.setVerbose(verbose);

			//set the schema mode (local or remote)
			this.mdg.setLocal(local);

			console.log('>>>>>>>>>>>>>>>', verbose, local);

			//assert the YML recipe is good.
			assert(file, 'cannot bake, no file provided');
			let abs = path.resolve(file);
			assert(fs.existsSync(abs), 'File does not exist - '+file+' [absolute]'+ abs);

			//load and parse the YML
			const rec = YAML.load(abs);

			//ensures it has a recipe.
			assert(rec.recipe, 'YML does not have a recipe');

			result = await this.assets.connect();
			result = await this.fix.start();

			//drop the database if optioned
			if(drop) {
				confirm = await inquirer.prompt({type: 'confirm', name:'confirmed', message:info('Really drop all data on '+this.config.current_database)});
				if(!confirm.confirmed)
					return console.log(info('Exited.'));

				result = await this.assets.dropCollections({name: 'all'});
				assert(result.success, 'failed to drop collections in the datbase');
			}

			//load a fixture if optioned or part of the recipe.
			if(fixture || rec.fixture) {
				let afix = fixture||rec.fixture;
				console.log(info('Applying fixture ' + afix))
				result = await this.fix.loadFixture({location: afix});
				console.log(success('done.'));
			}

			//are we using mongo-assets (sharing etc.)
			useMongoAssets = Boolean(rec.assets);
			if(useMongoAssets) {

				result = await this.assets.auth.authenticate({user: rec.user.user, pass: rec.user.pass});
				assert(result.success, 'An error occured during authentication');
				assert(result.authenticated, 'Could not authenticate with recipe user '+ JSON.stringify(rec.user));
				user = result.user;

				role = rec.user.role
					? user.role.find(role=>(role.name === rec.user.role))
					: user.role.find(role=>(role.type === 'user' && role.system));

				console.log(info('Baking data as '+user.user+' in the '+role.name+'role'));
			}

0			//replacing this with an async version which will mean we need deps and stages.
			//but for now.
			let item;

			for(let i=0; i<rec.recipe.length; i++) {

				item = rec.recipe[i];

				//create the mock for this item.
				console.log();
				console.log(info('Mocking '+item.type));
				let res = await this.mockData(item);

				if(useMongoAssets) {
					result = await this.assets.createAssets({user: user, type: item.type, assets: res, role: role});
				}
				//result = await saveMock({user: user, type: item.type, assets:res, role: rec.user.role || });
				assert(result.success, 'failed creating - ' + item.type);
				console.log(success('Baked '+result.assets.length+' items of '+item.type));
			}


			await this.assets.disconnect();
			await this.fix.close();

			console.log(info('Done.'));

		} catch( err ) {

			console.log(err);
			return this._cliError('bake', err.message)
		}
	}

	async test( args ) {

		const {type} = args;

		try {
			assert(this.modules[type], 'Unknown type' +type);
			const inst = this.modules[type];

			assert(typeof inst.test === 'function', 'no test function on '+type);

			inst.test(args);

		} catch( err ) {

			return this._cliError('test', err.message);
		}
	}

	/**
	 * Mock some data.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.type the cannoncical type of asset to mock
	 * @param {Object} args.count th ecount object which indicates how many items of a required array : eg count : {friends:1000} (make 1000 friends). When not argued, the CLI will ask.
	 * @param {Integer} args.num the number of assets to generate/mock
	 * 
	 * @returns {Promise}  
	 */
	async mockData({type, num, count, file}) {

		try{

			//assert arguments.
			assert(typeof type === 'string' && type.length, 'Invalid --type. Should be an asset type');
			assert(typeof num === 'number' && num > 0, 'Invalid --num. Should be the number of how many mocks are to be generated');

			//find the props which are arrays.
			let nodeArray = await this.mdg.findArrayNodes({type: type});

			//build an empty config, iterate over the array props.
			let mockconfig = {};
			count = count || {};
			await Promise.all( nodeArray.map( async node => {

				let shim = {};

				//if the recipe has a count value.
				if(count[node.key] !== undefined) {

					shim[node.key] = {count: count[node.key]};
					mockconfig = Object.assign(mockconfig, shim);

				//otherwise prompt the user for how many we're baking.
				} else {

					console.log(info('Asset type `'+type+'` requires a list '+node.type+'` for its property `'+node.key+'`'));

					return await inquirer.prompt({type:'input', name:node.key, message: 'Number of items to mock:', default: 10,validate:v=>{ return parseInt(v) > 1 ? true: 'Not a number'; }})
									.then(r=> { 
										let shim = {};
										let rkey = Object.keys(r)[0]
										shim[rkey] = {count:parseInt(r[node.key])};
										mockconfig = Object.assign(mockconfig,shim);
									});
				}

			}));

			//create the mock data.
			let result = await this.mdg.mockFromSchema({type: type, num:num, mockconfig: mockconfig});
			assert(result.success === true, 'received an unexpected error building mocks');

			if(!file)
				return result.mocks;

			//write the file out.
			let abs = path.resolve(file);			
			fs.writeFileSync(abs, JSON.stringify(result.mocks, null, 2));

		} catch( err ) {

			return this._cliError('createdata', err.message);
		}
	}

	async listFixtures() {

		let fixtures = await this.fix.listFixtures();

		if(!fixtures.length) console.log(info('There are no fixtures'))
		else{
			console.log(info('Available fixtures:'))
			fixtures.forEach(fixture => {
				console.log(info(' - '+fixture));
			})
		}
		console.log(info('done.'));
	}

	/**
	 * Load a fixture.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.name the fixture name 
	 * @param {String} args.uri a mongodb service uri
	 * @param {Boolean} args.silent no user input, instead throw errors on missing flags
	 * @param {Boolean} args.force no confirmations.Error
	 * 
	 * @returns {Promise} 
	 */
	async loadFixture({name, uri, silent, force}) {

		let result;

		silent = silent === undefined ? false : silent;
		force = force === undefined ? false : force;

		

		try {

			const {databases,current_database} = this.config;
			let {mgURI} = this.fix.config;

			let dbname;

			if(!name && !silent) {

				let fixtures = await this.fix.listFixtures();
				result = await inquirer.prompt({
					type: 'list',
					message: info('Please choose a fixture:'),
					choices:fixtures,
					name:'sFixture'
				});
				name = result.sFixture
			}
			else if(!name && silent) {

				throw new Error('requires a fixture name.')
			}

			if(!silent) console.log();

			if(!uri && !silent) {

				result = await inquirer.prompt({
					type: 'rawlist',
					message: info('Please choose target database:'),
					choices: Object.keys(databases).map(name => {
						return {
							name:(name+' ['+databases[name]+']'),
							value: name
						};
					}),
					name:'sDatabase'
				});

				dbname = result.sDatabase;
				uri = databases[dbname];
			}
			else if(!uri && silent) {

				throw new Error('requires a uri')
			}

			name = name.indexOf('.tar') === -1 ? name+'.tar' : name;

			if(!silent) console.log();

			if(!force) {

				result = await inquirer.prompt({type:'confirm', message:failure('Loading fixture '+name+' to database "'+dbname+'" will drop all data from the database.') + ' Are you sure', name:'confirm'});
				if(!result.confirm) return console(info('Exit.'));
			}

			result = await this.fix.start();
			assert(result.success, 'could not start the fixtures instance');
			if(!silent) console.log(info('Connected to ' + uri));

			result = await this.fix.loadFixture({name: name, uri: mgURI});
			assert(result.success, 'failed to fixture ' + name);
			if(!silent) console.log(info('Installed fixture ' + name));

			result = await this.fix.close();
			if(!silent) console.log(info('done.'));

		} catch( err ) {

			this._cliError('loadFixture', err.message);
		}
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

	async saveMockToMongo() {

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

	recipeToStages( recipe ) {

	}

	_rcExists() {

		return fs.existsSync(path.join(this._homedir(), '.lbttrc'));
	}

	_writeRC( config ) {

		config = config || this.config;
		if(!config)
			throw new Error('Could not determine a configuration to use');

		return fs.writeFileSync(path.join(this._homedir(), '.lbttrc'), JSON.stringify(config, null, 2));
	}

	_homedir() {

		return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
	}

	_cliError(climethod, message) {
		
		console.error(chalk(failure(climethod+' : '+message)));
	}

}