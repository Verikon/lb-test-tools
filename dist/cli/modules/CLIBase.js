'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let CLIBase = class CLIBase {

	constructor(main) {

		this.main = main;
		this.config = main.config;
	}

	RC() {

		return JSON.parse(_fs2.default.readFileSync(_path2.default.join(this._homedir(), '.lbttrc')));
	}

	writeRC(config) {

		config = config || this.config;

		if (!config) throw new Error('Could not determine a configuration to use');

		return _fs2.default.writeFileSync(_path2.default.join(this._homedir(), '.lbttrc'), JSON.stringify(config, null, 2));
	}

	rcExists() {

		return _fs2.default.existsSync(_path2.default.join(this._homedir()), '.lbttrc');
	}

	_homedir() {

		return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
	}

};
exports.default = CLIBase;