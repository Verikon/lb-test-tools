'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

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
	directory: inp => {
		let abs = _path2.default.resolve(inp);
		return !_fs2.default.existsSync(abs) ? 'Path ' + abs + ' does not exist' : true;
	},
	port: inp => {
		return parseInt(inp) > 1;
	},
	schema_server: inp => {
		if (inp.indexOf('http') === -1) return 'needs either http or https protocol';
		if (inp.substr(-1) !== '/') return 'needs a trailing forwardslash "/"';
		return true;
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
		}, {
			type: 'input',
			name: 'fixtures_dir',
			message: 'Directory to save fixtures to:',
			default: _path2.default.join(homedir(), 'fixtures'),
			validate: v.directory
		}, {
			type: 'input',
			name: 'schema_uri',
			message: 'JSONSchema Server',
			default: 'http://jsonschema.com:3000/schema/',
			validate: v.schemaserver
		}];
	}
};