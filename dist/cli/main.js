'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _mongodb = require('mongodb');

var _MongoFixtures = require('../MongoFixtures');

var _MockDataGen = require('../MockDataGen');

var _mongoAssets = require('mongo-assets');

var _mongoAssets2 = _interopRequireDefault(_mongoAssets);

var _yamljs = require('yamljs');

var _yamljs2 = _interopRequireDefault(_yamljs);

var _requestPromiseNative = require('request-promise-native');

var _requestPromiseNative2 = _interopRequireDefault(_requestPromiseNative);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _cli = require('./cli.database');

var _cli2 = _interopRequireDefault(_cli);

var _CLIMock = require('./modules/CLIMock');

var _CLIMock2 = _interopRequireDefault(_CLIMock);

var _questions = require('./questions');

var _questions2 = _interopRequireDefault(_questions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const success = _chalk2.default.cyan.bold;
const failure = _chalk2.default.red.bold;
const info = _chalk2.default.yellow.bold;

let LBTTCLI = class LBTTCLI {

	constructor(props) {

		this.initialize();
	}

	initialize() {

		this.loadRC();
		this.bindModules();
		this.registerPrompts();

		this.mdg = new _MockDataGen.MockDataGen({ config: this.config });
		this.fix = new _MongoFixtures.MongoFixtures({ config: { directory: this.config.fixtures_directory, mgURI: this.config.current_database } });
		this.assets = new _mongoAssets2.default({ config: { endpoint: this.config.current_database } });
	}

	bindModules() {

		const db = new _cli2.default(this);
		const mock = new _CLIMock2.default(this);

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

		_inquirer2.default.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));
	}

	loadRC() {

		if (!this._rcExists()) {
			console.warn(_chalk2.default.red.bold('lb test tools is not setup, please run `lbtt config setup`'));
			return false;
		}

		let rcloc = _path2.default.join(this._homedir(), '.lbttrc');

		try {

			let rc_contents = _fs2.default.readFileSync(rcloc, 'utf8');
			this.config = JSON.parse(rc_contents);
			return true;
		} catch (err) {

			console.error(failure('Corrupt config file ' + rcloc + '. Try reconfiguring with `lbtt config setup`'));
			return false;
		}
	}

	configure() {

		console.log('CONFIGURE:');
		console.log(process.cwd());
	}

	/**
  * interractively set up lb tt
  */
	setup() {
		var _this = this;

		return _asyncToGenerator(function* () {

			if (_this._rcExists()) {
				let overwrite = yield _inquirer2.default.prompt([{ type: 'confirm', name: 'confirm', message: 'Overwrite existing config?' }]);
				if (!overwrite.confirm) return console.log(info('Setup cancelled by user.'));
			}

			console.log();
			console.log(info('LBTT uses JSONSchema for its data mocking'));
			const json_answers = yield _inquirer2.default.prompt(_questions2.default.schema_setup());

			//add a backslash if one wasn't provided
			if (json_answers.schema_uri.substr(-1) !== '/') json_answers.schema_uri += '/';

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
			const ans = yield _inquirer2.default.prompt(_questions2.default.mongo_uri());
			const mguri = ans.mongo_uri;
			const databases = { default: mguri };

			//check the mongo connection.
			yield Promise.all(Object.keys(databases).map((() => {
				var _ref = _asyncToGenerator(function* (key) {
					conn = yield _this.canMGConnect(databases[key]);
					return true;
				});

				return function (_x) {
					return _ref.apply(this, arguments);
				};
			})()));

			console.log();
			console.log(info('LBTT Fixtures:'));
			const fix_questions = yield _inquirer2.default.prompt(_questions2.default.fixtures_setup());

			let rcconfig = {
				databases: databases,
				current_database: databases.default,
				schemas: schemas,
				current_schema: schemas.default,
				fixtures_directory: fix_questions.fixtures_dir
			};

			let config_location = _path2.default.resolve(_this._homedir(), '.lbttrc');

			console.log();
			console.log(info('Review:'));
			console.log(success('\tSchema server: ' + rcconfig.current_schema.uri));
			console.log(success('\tSchema server: ' + rcconfig.current_schema.dir));
			console.log(success('\tMongo URI: ' + rcconfig.current_database));
			console.log(success('\tFixtures directory: ' + rcconfig.fixtures_directory));
			console.log();

			let confirm = yield _inquirer2.default.prompt({
				type: 'confirm',
				name: 'confirm',
				message: _chalk2.default.yellow('Write configuration')
			});

			if (!confirm.confirm) return console.log(info('Exit'));

			try {
				_fs2.default.writeFileSync(config_location, JSON.stringify(rcconfig, null, 2));
			} catch (err) {
				console.log(failure('Could not write the config to ' + config_location + '\n\n' + err.message));
			}
			console.log();
			console.log(success('Configuration complete'));

			return true;
		})();
	}

	showConfig() {
		var _this2 = this;

		return _asyncToGenerator(function* () {

			console.log(info(JSON.stringify(_this2.config, null, 2)));
		})();
	}

	registerMocker() {
		return _asyncToGenerator(function* () {})();
	}

	listMockers() {
		var _this3 = this;

		return _asyncToGenerator(function* () {

			let mockers = _this3.mdg.getMockerList();

			mockers.forEach(function (mocker) {
				console.log(info('name: ' + mocker.name));

				if (mocker.description) console.log(_chalk2.default.yellow(mocker.description));

				if (mocker.args) {
					console.log('Arguments:');
					Object.keys(mocker.args).forEach(function (arg) {
						console.log('\t' + arg + ': ' + mocker.args[arg]);
					});
				};

				if (mocker.usage) console.log('Usage: ' + mocker.usage);

				console.log();
			});
		})();
	}

	list({ type }) {
		var _this4 = this;

		return _asyncToGenerator(function* () {

			try {

				(0, _assert2.default)(_this4.types[type], 'Unknown type ' + type);
				const inst = _this4.types[type];

				(0, _assert2.default)(typeof inst.list === 'function', 'no list function on ' + type);

				inst.list();
			} catch (err) {

				return _this4._cliError('list', err.message);
			}
		})();
	}

	add({ type }) {
		var _this5 = this;

		return _asyncToGenerator(function* () {

			try {

				(0, _assert2.default)(_this5.types[type], 'Unknown type ' + type);
				const inst = _this5.types[type];

				(0, _assert2.default)(typeof inst.add === 'function', 'no add function on ' + type);

				inst.add();
			} catch (err) {

				return _this5._cliError('add', err.message);
			}
		})();
	}

	switch({ type }) {
		var _this6 = this;

		return _asyncToGenerator(function* () {

			try {

				(0, _assert2.default)(_this6.types[type], 'Unknown type' + type);
				const inst = _this6.types[type];

				(0, _assert2.default)(typeof inst.switch === 'function', 'no switch function on ' + type);

				inst.switch();
			} catch (err) {

				return _this6._cliError('switch', err.message);
			}
		})();
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
	bake({ file, fixture, drop, verbose, local }) {
		var _this7 = this;

		return _asyncToGenerator(function* () {

			let result;

			//loads and parses the yml.
			try {

				//set the verbosity level
				_this7.mdg.setVerbose(verbose);

				const { config } = _this7.mdg;

				vlog('Baking Recipe ' + file);
				vlog('Retrieving schema definitions ' + (local ? 'locally' : 'remotely.'));
				vlog('Using ' + (local ? config.current_schema.dir : config.current_schema.url), 1);

				let result, confirm, //confirm placehold for inquirer
				useMongoAssets, //baking to the mongo-assets conventions.
				user, //the user performing the bake.
				role; //the role recieving the mocks being baked

				//set the schema mode (local or remote)
				_this7.mdg.setLocal(local);

				//assert the YML recipe is good.
				(0, _assert2.default)(file, 'cannot bake, no file provided');
				let abs = _path2.default.resolve(file);
				(0, _assert2.default)(_fs2.default.existsSync(abs), 'File does not exist - ' + file + ' [absolute]' + abs);
				vlog('Loaded recipe ' + file);

				//load and parse the YML
				const rec = _yamljs2.default.load(abs);

				//ensures it has a recipe.
				(0, _assert2.default)(rec.recipe, 'YML does not have a recipe');

				vlog('Parsed recipe');
				result = yield _this7.assets.connect();
				result = yield _this7.fix.start();

				//drop the database if optioned
				vlog('Dropping database before bake: ' + (drop ? 'YES' : 'NO'));
				if (drop) {
					confirm = yield _inquirer2.default.prompt({ type: 'confirm', name: 'confirmed', message: info('Really drop all data on ' + _this7.config.current_database) });
					if (!confirm.confirmed) return console.log(info('Exited.'));

					result = yield _this7.assets.dropCollections({ name: 'all' });
					(0, _assert2.default)(result.success, 'failed to drop collections in the datbase');
					vlog('Dropped database', 1);
				}

				vlog('Applying fixture before bake: ' + (fixture || rec.fixture ? 'YES' : 'NO'));
				//load a fixture if optioned or part of the recipe.
				if (fixture || rec.fixture) {
					let afix = fixture || rec.fixture;
					result = yield _this7.fix.loadFixture({ location: afix });
					vlog('applied fixture: ' + afix);
				}

				//are we using mongo-assets (sharing etc.)
				useMongoAssets = Boolean(rec.assets);
				vlog('Ussing mongo-assets: ' + (useMongoAssets ? 'YES' : 'NO'));
				if (useMongoAssets) {

					result = yield _this7.assets.auth.authenticate({ user: rec.user.user, pass: rec.user.pass });
					(0, _assert2.default)(result.success, 'An error occured during authentication');
					(0, _assert2.default)(result.authenticated, 'Could not authenticate with recipe user ' + JSON.stringify(rec.user));
					user = result.user;
					vlog('Authenticated user ' + user.user);

					role = rec.user.role ? user.role.find(function (role) {
						return role.name === rec.user.role;
					}) : user.role.find(function (role) {
						return role.type === 'user' && role.system;
					});

					vlog('Baking data as ' + user.user + ' in the ' + role.name + ' role');
				}

				//replacing this with an async version which will mean we need deps and stages.
				//but for now.
				let item;

				/*
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
    */

				yield _this7.mdg.bakeRecipe({ recipe: rec, save: true, assets: useMongoAssets, user: user });

				yield _this7.assets.disconnect();
				yield _this7.fix.close();

				console.log(info('Done.'));
			} catch (err) {

				console.log(err);
				return _this7._cliError('bake', err.message);
			}
		})();
	}

	test(args) {
		var _this8 = this;

		return _asyncToGenerator(function* () {

			const { type } = args;

			try {
				(0, _assert2.default)(_this8.modules[type], 'Unknown type' + type);
				const inst = _this8.modules[type];

				(0, _assert2.default)(typeof inst.test === 'function', 'no test function on ' + type);

				inst.test(args);
			} catch (err) {

				return _this8._cliError('test', err.message);
			}
		})();
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
	mockData({ type, num, count, file }) {
		var _this9 = this;

		return _asyncToGenerator(function* () {

			try {

				//assert arguments.
				(0, _assert2.default)(typeof type === 'string' && type.length, 'Invalid --type. Should be an asset type');
				(0, _assert2.default)(typeof num === 'number' && num > 0, 'Invalid --num. Should be the number of how many mocks are to be generated');

				//find the props which are arrays.
				let nodeArray = yield _this9.mdg.findArrayNodes({ type: type });

				//build an empty config, iterate over the array props.
				let mockconfig = {};
				count = count || {};
				yield Promise.all(nodeArray.map((() => {
					var _ref2 = _asyncToGenerator(function* (node) {

						let shim = {};

						//if the recipe has a count value.
						if (count[node.key] !== undefined) {

							shim[node.key] = { count: count[node.key] };
							mockconfig = Object.assign(mockconfig, shim);

							//otherwise prompt the user for how many we're baking.
						} else {

							console.log(info('Asset type `' + type + '` requires a list ' + node.type + '` for its property `' + node.key + '`'));

							return yield _inquirer2.default.prompt({ type: 'input', name: node.key, message: 'Number of items to mock:', default: 10, validate: function (v) {
									return parseInt(v) > 1 ? true : 'Not a number';
								} }).then(function (r) {
								let shim = {};
								let rkey = Object.keys(r)[0];
								shim[rkey] = { count: parseInt(r[node.key]) };
								mockconfig = Object.assign(mockconfig, shim);
							});
						}
					});

					return function (_x2) {
						return _ref2.apply(this, arguments);
					};
				})()));

				//create the mock data.
				let result = yield _this9.mdg.mockFromSchema({ type: type, num: num, mockconfig: mockconfig });
				(0, _assert2.default)(result.success === true, 'received an unexpected error building mocks');

				if (!file) return result.mocks;

				//write the file out.
				let abs = _path2.default.resolve(file);
				_fs2.default.writeFileSync(abs, JSON.stringify(result.mocks, null, 2));
			} catch (err) {

				return _this9._cliError('createdata', err.message);
			}
		})();
	}

	listFixtures() {
		var _this10 = this;

		return _asyncToGenerator(function* () {

			let fixtures = yield _this10.fix.listFixtures();

			if (!fixtures.length) console.log(info('There are no fixtures'));else {
				console.log(info('Available fixtures:'));
				fixtures.forEach(function (fixture) {
					console.log(info(' - ' + fixture));
				});
			}
			console.log(info('done.'));
		})();
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
	loadFixture({ name, uri, silent, force }) {
		var _this11 = this;

		return _asyncToGenerator(function* () {

			let result;

			silent = silent === undefined ? false : silent;
			force = force === undefined ? false : force;

			try {

				const { databases, current_database } = _this11.config;

				let { mgURI } = _this11.fix.config;

				let dbname;

				if (!name && !silent) {

					let fixtures = yield _this11.fix.listFixtures();
					result = yield _inquirer2.default.prompt({
						type: 'list',
						message: info('Please choose a fixture:'),
						choices: fixtures,
						name: 'sFixture'
					});
					name = result.sFixture;
				} else if (!name && silent) {

					throw new Error('requires a fixture name.');
				}

				if (!silent) console.log();

				if (!uri && !silent) {

					result = yield _inquirer2.default.prompt({
						type: 'rawlist',
						message: info('Please choose target database:'),
						choices: Object.keys(databases).map(function (name) {
							return {
								name: name + ' [' + databases[name] + ']',
								value: name
							};
						}),
						name: 'sDatabase'
					});

					dbname = result.sDatabase;
					uri = databases[dbname];
					console.log('DETERMINED URI............', uri);
				} else if (!uri && silent) {

					throw new Error('requires a uri');
				}

				name = name.indexOf('.tar') === -1 ? name + '.tar' : name;

				if (!silent) console.log();

				if (!force) {

					result = yield _inquirer2.default.prompt({ type: 'confirm', message: failure('Loading fixture ' + name + ' to database "' + dbname + '" will drop all data from the database.') + ' Are you sure', name: 'confirm' });
					if (!result.confirm) return console(info('Exit.'));
				}

				result = yield _this11.fix.start();
				(0, _assert2.default)(result.success, 'could not start the fixtures instance');
				if (!silent) console.log(info('Connected to ' + uri));

				result = yield _this11.fix.loadFixture({ name: name, uri: uri });
				(0, _assert2.default)(result.success, 'failed to fixture ' + name);
				if (!silent) console.log(info('Installed fixture ' + name));

				result = yield _this11.fix.close();
				if (!silent) console.log(info('done.'));
			} catch (err) {

				_this11._cliError('loadFixture', err.message);
			}
		})();
	}

	/**
  * Save a fixture.
  * 
  * @param {Object} args the argument object
  * @param {String} args.name the name of the fixture to save
  * 
  * @returns {Promise} 
  */
	saveFixture({ name }) {
		var _this12 = this;

		return _asyncToGenerator(function* () {

			const { fixtures_directory, databases, current_database } = _this12.config;
			let result, savelocation, fixturename, dbname, uri;

			try {

				result = yield _inquirer2.default.prompt({
					type: 'rawlist',
					message: info('Please choose source database:'),
					choices: Object.keys(databases).map(function (name) {
						return {
							name: name + ' [' + databases[name] + ']',
							value: name
						};
					}),
					name: 'sDatabase'
				});

				dbname = result.sDatabase;
				uri = databases[dbname];

				if (!name) {
					result = yield _inquirer2.default.prompt({ type: 'input', message: 'Fixture name:', default: 'myfixture', name: 'name' });
					name = result.name;
				}

				console.log(info('Saving fixture ' + name));
				result = yield _this12.fix.saveFixture({ name: name, uri: uri });
				console.log(success('complete..'));
			} catch (err) {

				_this12._cliError('saveFixture', err.message);
			}
		})();
	}

	backupMongo({ file, db, azure, uri }) {
		var _this13 = this;

		return _asyncToGenerator(function* () {

			const { fixtures_directory, databases, current_database } = _this13.config;
			let result, savelocation;

			try {

				let dbname = Object.keys(databases).find(function (key) {
					return databases[key] === current_database;
				});
				let defaultFilename = dbname + '-' + (0, _moment2.default)(new Date()).format('YYYYMMDD-HHMM') + '.tar';

				result = yield _inquirer2.default.prompt({ type: 'confirm', message: 'Create backup of `' + _this13.config.current_database + '`', name: "confirm" });
				if (!result.confirm) console.log(info('Exit.'));

				result = yield _inquirer2.default.prompt({ type: 'input', message: 'Save as:', default: _path2.default.join(fixtures_directory, defaultFilename), name: 'location' });
				savelocation = result.location;

				if (_fs2.default.existsSync(savelocation)) {
					result = yield _inquirer2.default.prompt({ type: 'confirm', message: 'File ' + savelocation + ' exists. Overwrite?', name: 'confirm' });
					if (!result.confirm) console.log(info('Exit.'));
				}

				console.log(info('Backing up...'));
				result = yield _this13.fix.saveFixture({ location: savelocation });
				console.log(success('Saved... '));
			} catch (err) {

				_this13._cliError('backupMongo', err.message);
			}
		})();
	}

	restoreMongo() {
		return _asyncToGenerator(function* () {})();
	}

	saveMockToMongo() {
		return _asyncToGenerator(function* () {})();
	}

	canMGConnect(uri) {
		return _asyncToGenerator(function* () {

			try {
				console.log(success('Testing database ' + uri + ' ... '));
				const conn = yield _mongodb.MongoClient.connect(uri, { useNewUrlParser: true });
				console.log(success('connection OK.'));
				conn.close();
				return true;
			} catch (err) {
				console.log(_chalk2.default.red.bold('Database ' + uri + ' failed:'));
				console.error(err.message);
				return false;
			}
		})();
	}

	recipeToStages(recipe) {}

	_rcExists() {

		return _fs2.default.existsSync(_path2.default.join(this._homedir(), '.lbttrc'));
	}

	_writeRC(config) {

		config = config || this.config;
		if (!config) throw new Error('Could not determine a configuration to use');

		return _fs2.default.writeFileSync(_path2.default.join(this._homedir(), '.lbttrc'), JSON.stringify(config, null, 2));
	}

	_homedir() {

		return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
	}

	_cliError(climethod, message) {

		console.error((0, _chalk2.default)(failure(climethod + ' : ' + message)));
	}

};
exports.default = LBTTCLI;