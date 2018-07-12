#!/usr/bin/env node
'use strict';

var _main = require('./main');

var _main2 = _interopRequireDefault(_main);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

_commander2.default.version('0.1.0').arguments('<command>', 'command').option('-u, --uri', 'Mongo database to save as a fixture').action((() => {
	var _ref = _asyncToGenerator(function* (command) {

		const CLI = new _main2.default();

		switch (command) {

			case 'list':
				yield CLI.showConfig();
				break;

			case 'setup':
				yield CLI.setup();
				break;

			case 'set':
				console.log('TODO');
				break;

			default:
				console.error('unknown config command `' + command + '` use: lbtt config for help.');
		}
	});

	return function (_x) {
		return _ref.apply(this, arguments);
	};
})());

_commander2.default.parse(process.argv);

if (!process.argv.slice(2).length) {

	const examples = ['Examples:', '', '% lbtt config setup -- run the interractive lb test tools setup', '% lbtt config list -- lists current lb test-tools config', '% lbtt config set mguri mongodb://somewhere:27107/db -- set a specific variable', ''];

	_commander2.default.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return _chalk2.default.yellow.bold(output.join('\n'));
	});
}