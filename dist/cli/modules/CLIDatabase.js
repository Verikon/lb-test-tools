'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _CLIBase = require('./CLIBase');

var _CLIBase2 = _interopRequireDefault(_CLIBase);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _questions = require('./questions');

var _questions2 = _interopRequireDefault(_questions);

var _MongoFixtures = require('../../MongoFixtures');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const success = _chalk2.default.cyan.bold;
const failure = _chalk2.default.red.bold;
const info = _chalk2.default.yellow.bold;

let cliDatabase = class cliDatabase extends _CLIBase2.default {

	constructor(main) {

		super(main);
	}

	add() {
		var _this = this;

		return _asyncToGenerator(function* () {

			const rc = _this.RC();

			let answ, uri, RCConfig;

			try {

				console.log(info('Creating new mongo database'));
				console.log();

				RCConfig = Object.assign({}, rc);

				//console.log(RCConfig);
				answ = yield _inquirer2.default.prompt(questions.add());

				//make sure we're not overwriting an existing db name.
				if (RCConfig.databases[answ.name]) throw new Error('Database ' + answ.name + ' is already used, try a different name');

				//create the uri
				uri = 'mongodb://' + answ.user + ':' + answ.pass + '@' + answ.host + ':' + answ.port + '/' + answ.db;

				//test the uri
				console.log(info('Attempting to connect to ' + uri));
				try {

					yield _this.main.assets.connect({ endpoint: uri });
				} catch (err) {

					throw new Error('Could not connect to the database');
				}
				console.log(info('Success.'));
				console.log();

				yield _this.main.assets.disconnect();

				//update RCConfig, and write it
				RCConfig.databases[answ.name] = uri;

				//set immediately?
				answ = yield _inquirer2.default.prompt({ name: 'confirmed', type: 'confirm', message: 'Set this database ' + answ.name + ' as the default database?' });
				if (answ.confirmed) RCConfig.current_database = uri;

				//write the config out.
				_this.main._writeRC(RCConfig);

				console.log(info('Database successfully added.'));
			} catch (err) {

				return _this.main._cliError('add', err.message);
			}
		})();
	}

	list() {
		var _this2 = this;

		return _asyncToGenerator(function* () {

			const rc = _this2.RC();

			console.log(info('Databases:'));
			console.log();
			Object.keys(rc.databases).forEach(function (dbname) {

				const db = rc.databases[dbname];
				const defaultdb = db === rc.current_database;

				defaultdb ? console.log(success('\t* ' + dbname + ' - ' + db)) : console.log(info('\t' + dbname + ' - ' + db));
			});
			console.log();
		})();
	}

	remove() {
		var _this3 = this;

		return _asyncToGenerator(function* () {

			try {

				const rc = _this3.RC();

				const answ = yield _inquirer2.default.prompt(questions.remove(rc.databases));
				const confirm = yield _inquirer2.default.prompt({ name: 'confirm', type: 'confirm', message: 'Remove this database', default: false });

				if (!confirm.confirm) return console.log(success('Aborted.'));

				const RCConfig = Object.assign({}, rc);

				//is default?
				const isDefault = RCConfig.current_database === answ.database.uri;

				let dbkey;
				Object.keys(RCConfig.databases).some(function (dbname) {
					if (RCConfig.databases[dbname] === answ.database.uri) {
						dbkey = dbname;
						return true;
					}
				});

				delete RCConfig.databases[dbkey];

				if (isDefault) {
					console.log(info('You are removing the default database, please select the new default'));
					const result = yield _this3.default();
					RCConfig.current_database = null;
				}

				console.log('RC', RCConfig);
			} catch (err) {

				return _this3.main._cliError('add', err.message);
			}

			console.log('ANSWERZ>>>', answ);
			console.log('Confirm', confirm);
		})();
	}

	default() {
		var _this4 = this;

		return _asyncToGenerator(function* () {

			try {

				const rc = _this4.RC();
				let RCConfig = Object.assign({}, rc);

				const answ = yield _inquirer2.default.prompt(questions.default(rc.databases));
				RCConfig.current_database = answ.database.uri;

				yield _this4.writeRC(RCConfig);

				console.log(success('Configuration updated.'));
			} catch (err) {

				_this4.main._cliError('default', err.message);
			}
		})();
	}

};
exports.default = cliDatabase;


const questions = {

	add: () => {

		return [{
			name: 'name',
			type: 'input',
			message: 'Name for this MongoDB:'
		}, {
			name: 'host',
			type: 'input',
			message: 'Mongo Host:',
			default: 'localhost'
		}, {
			name: 'user',
			type: 'input',
			message: 'Mongo User:'
		}, {
			name: 'pass',
			type: 'password',
			message: 'Mongo Password:'
		}, {
			name: 'port',
			type: 'input',
			message: 'Mongo Port',
			default: 27017
		}, {
			name: 'db',
			type: 'input',
			message: 'Mongo Initial Database:',
			default: 'mongo'
		}];
	},

	remove: databases => {

		return [{
			name: 'database',
			type: 'list',
			message: info('Select Database to remove'),
			choices: Object.keys(databases).map(name => {
				return { name: name + ' [' + databases[name] + ']', value: { name: name, uri: databases[name] } };
			})
		}];
	},

	default: databases => {

		return [{
			name: 'database',
			type: 'list',
			message: info('Select the default database'),
			choices: Object.keys(databases).map(name => {
				return { name: name + ' [' + databases[name] + ']', value: { name: name, uri: databases[name] } };
			})
		}];
	},

	switch: databases => {

		return [{
			name: 'database',
			type: 'list',
			message: 'Select Database:',
			choices: Object.keys(databases).map(name => {
				return { name: name + ' [' + databases[name] + ']', value: { name: name, uri: databases[name] } };
			})
		}];
	}

};