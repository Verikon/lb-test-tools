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

_commander2.default.version('0.1.0').arguments('<command> <arg1>', 'command').option('-t, --type <type>', 'the schema/asset type to use').option('-n, --num <num>', 'Mongo database to save as a fixture').option('-f, --file <file>', 'Save output to file').option('-l, --local', 'Use the locale schema directory').action((() => {
	var _ref = _asyncToGenerator(function* (cmd, arg1) {

		const CLI = new _main2.default();
		if (_commander2.default.num) _commander2.default.num = parseFloat(_commander2.default.num);

		switch (cmd) {

			case 'register':
				yield CLI.registerMocker({ file: _commander2.default.file });
				break;

			case 'createdata':
				yield CLI.mockData({ type: _commander2.default.type, num: _commander2.default.num, file: _commander2.default.file });
				break;

			case 'bake':
				yield CLI.bake({ file: arg1 });
				break;

			case 'mockers':
				yield CLI.listMockers();
				break;

			case 'test':

				yield CLI.test({ type: 'mock', schema: arg1, local: _commander2.default.local });
				break;
			default:
				console.error('unknown mock command `' + command + '` use: lbtt mock for help.');

		}
	});

	return function (_x, _x2) {
		return _ref.apply(this, arguments);
	};
})());

_commander2.default.parse(process.argv);

if (!process.argv.slice(2).length) {

	const examples = ['Examples:', '', '% lbtt mock bake ./bake.yml', '', 'Creating mock data', '% lbtt mock createdata --type=myschema --num=10 --file ./here.json', '% lbtt mock createdata --type=myschema --num=1000 --db --collection my/collection', '', 'Getting a list of current mockers', '% lbtt mock mockers', 'Registering a mocker function:', '% lbtt mock register --file=/some/dir/mocker.js -- register a mocker function', '', 'Test a schema', '% lbtt mock test my/test', ''];

	_commander2.default.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return _chalk2.default.yellow.bold(output.join('\n'));
	});
}