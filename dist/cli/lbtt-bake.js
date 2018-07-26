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

_commander2.default.version('0.1.0').arguments('<module> [type]', 'command').option('-l, --local', 'Use the locale schema directory').option('-v, --verbose', 'Verbose output during bake').option('-f, --fixture <name>', 'Load a fixture before baking').option('-d, --drop', 'empty the database before baking').action((() => {
	var _ref = _asyncToGenerator(function* (recipe) {

		const CLI = new _main2.default();

		let result = yield CLI.bake({
			file: recipe,
			fixture: _commander2.default.fixture,
			drop: _commander2.default.drop,
			local: !!_commander2.default.local,
			verbose: !!_commander2.default.verbose
		});
	});

	return function (_x) {
		return _ref.apply(this, arguments);
	};
})());

_commander2.default.parse(process.argv);

if (!process.argv.slice(2).length) {

	const examples = ['Examples:', '', '% lbtt bake ./myrecipe.yml |bake a recipe', '% lbtt bake ./myrecipe.yml -fixture ~/myfixture |bake a recipe', '', ''];

	_commander2.default.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return _chalk2.default.yellow.bold(output.join('\n'));
	});
}