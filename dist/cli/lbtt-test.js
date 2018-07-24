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

_commander2.default.version('0.1.0').arguments('<module> [type]', 'command').option('-l, --local', 'Use the locale schema directory').action((() => {
	var _ref = _asyncToGenerator(function* (module, type) {

		const CLI = new _main2.default();

		switch (module) {

			case 'mock':
				yield CLI.test({ type: 'mock', schema: type, local: _commander2.default.local });
				break;

			default:
				console.error('unknown test command `' + command + '` use: lbtt test for help.');

		}
	});

	return function (_x, _x2) {
		return _ref.apply(this, arguments);
	};
})());

_commander2.default.parse(process.argv);

if (!process.argv.slice(2).length) {

	const examples = ['Examples:', '', '% lbtt test mock this/asset | test the this/asset mock', '% lbtt test mock this/asset --local | test the this/asset mock using your local schema library', '', ''];

	_commander2.default.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return _chalk2.default.yellow.bold(output.join('\n'));
	});
}