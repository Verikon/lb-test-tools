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

let cliDatabase = class cliDatabase {

	constructor(main) {

		this.main = main;
	}

	list() {
		var _this = this;

		return _asyncToGenerator(function* () {

			let db, current;
			console.log(info('Databases:'));
			console.log();

			Object.keys(_this.main.config.databases).forEach(function (name) {

				db = _this.main.config.databases[name];
				current = _this.main.config.current_database === db;

				current ? console.log(success('\t* ' + name + ' - ' + db)) : console.log(info('\t' + name + ' - ' + db));
			});
			console.log();
		})();
	}

	add() {
		var _this2 = this;

		return _asyncToGenerator(function* () {

			let answ, uri, RCConfig;

			try {

				console.log(info('Creating new mongo database'));
				console.log();

				RCConfig = Object.assign({}, _this2.main.config);

				//console.log(RCConfig);
				answ = yield _inquirer2.default.prompt(questions.add());

				//make sure we're not overwriting an existing db name.
				if (RCConfig.databases[answ.name]) throw new Error('Database ' + answ.name + ' is already used, try a different name');

				//create the uri
				uri = 'mongodb://' + answ.user + ':' + answ.pass + '@' + answ.host + ':' + answ.port + '/' + answ.db;

				//uri = 'mongodb://ecmis:Enterra!02@10.2.0.16:27017/ecmis'

				//test the uri
				console.log(info('Attempting to connect to ' + uri));
				try {
					yield _this2.main.assets.connect({ endpoint: uri });
				} catch (err) {
					throw new Error('Could not connect to the database');
				}
				console.log(info('Success.'));
				console.log();

				//update RCConfig, and write it
				RCConfig.databases[answ.name] = uri;

				//set immediately?
				answ = yield _inquirer2.default.prompt({ name: 'confirmed', type: 'confirm', message: 'Use database ' + answ.name + ' now?' });
				if (answ.confirmed) RCConfig.current_database = uri;

				//write the config out.
				_this2.main._writeRC(RCConfig);

				console.log(info('Database successfully added.'));
			} catch (err) {

				return _this2.main._cliError('add', err.message);
			}
		})();
	}

	switch() {
		var _this3 = this;

		return _asyncToGenerator(function* () {

			let answ, RCConfig;

			try {

				RCConfig = Object.assign({}, _this3.main.config);

				console.log(info('Switching default database'));
				console.log();

				answ = yield _inquirer2.default.prompt(questions.switch(RCConfig.databases));

				RCConfig.current_database = answ.database.uri;

				_this3.main._writeRC(RCConfig);

				console.log(info('done.'));
			} catch (err) {

				return _this3.main._cliError('add', err.message);
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
			message: 'Connection name'
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