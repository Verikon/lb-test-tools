#!/usr/bin/env node
'use strict';

var _main = require('./main');

var _main2 = _interopRequireDefault(_main);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version('0.1.0').option('-u, --uri', 'Mongo database to save as a fixture').action((type, cmd) => {

	console.log('HI');
	/**
 const config = require(cmd.dev ? '../../config-dev' : '../../config');
 const CLI = new AuthCLI({config: config});
 	CLI.create({type: type});
 **/
});

_commander2.default.parse(process.argv);

if (!process.argv.slice(2).length) {

	const examples = ['Examples:', '', '% lbtt fixtures save -- save the mongo db state as a fixture', ''];

	_commander2.default.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return _chalk2.default.yellow.bold(output.join('\n'));
	});
}