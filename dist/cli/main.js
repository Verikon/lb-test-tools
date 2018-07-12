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

var _requestPromiseNative = require('request-promise-native');

var _requestPromiseNative2 = _interopRequireDefault(_requestPromiseNative);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

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
		this.registerPrompts();
		this.mdg = new _MockDataGen.MockDataGen({ config: this.config });
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

			const ans = yield _inquirer2.default.prompt(_questions2.default.setup());

			const mguri = 'mongodb://' + ans.mongo_user + ':' + ans.mongo_pass + '@' + ans.mongo_host + ':' + ans.mongo_port + '/' + ans.mongo_db;
			const databases = { default: mguri };

			let conn;

			//check the JSONschema service
			try {
				conn = yield _requestPromiseNative2.default.get({ url: ans.schema_uri });
			} catch (err) {
				console.error(failure('Invalid schema uri - ' + ans.schema_uri));
			}

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

			//write the config out.
			let rconfig = {
				databases: databases,
				current_database: databases.default,
				fixtures_directory: ans.fixtures_dir,
				schema_uri: ans.schema_uri
			};

			let config_location = _path2.default.resolve(_this._homedir(), '.lbttrc');

			try {
				_fs2.default.writeFileSync(config_location, JSON.stringify(rconfig, null, 2));
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

	/**
  * Mock some data.
  * 
  * @param {Object} args the argument object
  * @param {String} args.type the cannoncical type of asset to mock
  * @param {Integer} args.num the number of assets to generate/mock
  * 
  * @returns {Promise}  
  */
	mockData({ type, num, file }) {
		var _this4 = this;

		return _asyncToGenerator(function* () {

			//assert valid arguments
			try {

				(0, _assert2.default)(typeof type === 'string' && type.length, 'Invalid --type. Should be an asset type');
				(0, _assert2.default)(typeof num === 'number' && num > 0, 'Invalid --num. Should be the number of how many mocks are to be generated');

				let nodeArray = yield _this4.mdg.findArrayNodes({ type: type });

				let mockconfig = {};
				yield Promise.all(nodeArray.map((() => {
					var _ref2 = _asyncToGenerator(function* (node) {

						console.log(info('Asset type `' + type + '` requires a list ' + node.type + '` for its property `' + node.key + '`'));

						return yield _inquirer2.default.prompt({ type: 'input', name: node.key, message: 'Number of items to mock:', default: 10, validate: function (v) {
								return parseInt(v) > 1 ? true : 'Not a number';
							} }).then(function (r) {
							let shim = {};
							let rkey = Object.keys(r)[0];
							shim[rkey] = { count: parseInt(r[node.key]) };
							mockconfig = Object.assign(mockconfig, shim);
						});
					});

					return function (_x2) {
						return _ref2.apply(this, arguments);
					};
				})()));

				//create the mock data.
				let result = yield _this4.mdg.mockFromSchema({ type: type, num: num, mockconfig: mockconfig });
				(0, _assert2.default)(result.success === true, 'received an unexpected error building mocks');

				if (!file) return console.log(JSON.stringify(result.mocks, null, 2));

				//write the file out.
				let abs = _path2.default.resolve(file);
				_fs2.default.writeFileSync(abs, JSON.stringify(result.mocks, null, 2));
			} catch (err) {

				return _this4._cliError('createdata', err.message);
			}
		})();
	}

	loadFixture() {}

	/**
  * 
  * @param {Object} args the argument object
  * @param {String} args.name the name of the fixture to save
  * 
  * @returns {Promise} 
  */
	saveFixture({ name }) {

		const { fixtures_directory } = this.config;

		if (existsSync(_path2.default.resolve(fixtures_directory, name))) throw new Error('Fixture ' + name + ' exists.');
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

	_rcExists() {

		return _fs2.default.existsSync(_path2.default.join(this._homedir(), '.lbttrc'));
	}

	_homedir() {

		return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
	}

	_cliError(climethod, message) {

		console.error((0, _chalk2.default)(failure(climethod + ' : ' + message)));
	}

};
exports.default = LBTTCLI;