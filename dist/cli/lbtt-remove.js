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

_commander2.default.version('0.1.0').arguments('<type>', 'type').option('-n, --name <name>', 'fixture name').action((() => {
	var _ref = _asyncToGenerator(function* (type) {

		const CLI = new _main2.default();

		switch (type) {

			case 'db':
			case 'database':
				yield CLI.remove({ type: type });
				break;

			default:
				console.error('Cannot load ' + type + 'use `lbtt load` for help.');
		}
	});

	return function (_x) {
		return _ref.apply(this, arguments);
	};
})());

_commander2.default.parse(process.argv);

if (!process.argv.slice(2).length) {

	const examples = ['Examples:', '', '% lbtt remove database -- remove a database through the CLI', '% lbtt remove database mydb --remove the mydb database', '', ''];

	_commander2.default.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return _chalk2.default.yellow.bold(output.join('\n'));
	});
}