'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _requestPromiseNative = require('request-promise-native');

var _requestPromiseNative2 = _interopRequireDefault(_requestPromiseNative);

var _mongodb = require('mongodb');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* validators */
const v = {
	username: inp => inp.length < 3 ? 'Invalid username: to short.' : true,
	password: inp => inp.length < 6 ? 'Invalid password: to short.' : true,
	password_confirm: (inp, a) => inp !== a.mongo_pass ? 'Passwords do not match.' : true,
	person_name: inp => inp.length < 3 ? 'Invalid password: to short.' : true,
	mongo_uri: inp => {
		return true;
	},
	port: inp => {
		return parseInt(inp) > 1;
	},
	schema_server: inp => {
		if (inp.indexOf('http') === -1) return 'needs either http or https protocol';
		if (inp.substr(-1) !== '/') return 'needs a trailing forwardslash "/"';
		return true;
	},
	local_directory: inp => {

		if (inp === 'none') return true;

		let exists = _fs2.default.existsSync(_path2.default.resolve(inp));
		return exists ? true : 'The directory [' + inp + '] does not exist';
	},
	http_server: inp => {
		return new Promise((resolve, reject) => {
			_requestPromiseNative2.default.get({ url: inp }).then(resp => {
				resolve(true);
			}).catch(err => {
				reject('Could not connect');
			});
		});
	},
	mongo_server: inp => {
		return new Promise((resolve, reject) => {
			_mongodb.MongoClient.connect(inp, { useNewUrlParser: true }, (err, db) => {
				if (err) reject('failed to connect to ' + inp);

				db.close();
				return resolve(true);
			});
		});
	}

};

const assets = {
	user_create: ['role']
};

const homedir = function () {
	return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
};

exports.default = {

	setup: () => {

		return [{
			name: 'mongo_host',
			type: 'input',
			message: 'Mongo Host:',
			default: 'localhost',
			validate: v.mongo_uri
		}, {
			name: 'mongo_user',
			type: 'input',
			message: 'Mongo User:',
			validate: v.username
		}, {
			name: 'mongo_pass',
			type: 'password',
			message: 'Mongo Password:',
			validate: v.password
		}, {
			name: 'mongo_pass_conf',
			type: 'password',
			message: 'Confirm password:',
			validate: v.password_confirm
		}, {
			name: 'mongo_port',
			type: 'input',
			message: 'Mongo Port',
			default: 27017,
			validate: v.port
		}, {
			name: 'mongo_db',
			type: 'input',
			message: 'Mongo Initial Database:',
			default: 'mongo'
		}];
	},

	fixtures_setup: () => {

		return [{
			type: 'input',
			name: 'fixtures_dir',
			message: _chalk2.default.yellow('Directory to save fixtures to:'),
			default: _path2.default.join(homedir(), 'fixtures'),
			validate: v.local_directory
		}];
	},

	schema_setup: () => {

		return [{
			type: 'input',
			name: 'schema_uri',
			message: _chalk2.default.yellow(`Schema server URL (be patient):`),
			default: 'http://jsonschema.com:3000/schema/',
			validate: v.http_server
		}, {
			type: 'input',
			name: 'schema_dir',
			message: _chalk2.default.yellow('Local version of the schema server:'),
			default: 'none',
			validate: v.local_directory
		}];
	},

	mongo_uri: () => {

		return [{
			type: 'input',
			name: 'mongo_uri',
			message: _chalk2.default.yellow('Default mongo URI'),
			default: 'mongodb://user:pass@server:27017/db',
			validate: v.mongo_server
		}];
	}
};