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

_commander2.default.version('0.1.0').arguments('<command>', 'command').option('-f, --file <filename>', 'the file to use').option('-d, --db <dbname>', 'the database tag for a db in your config').option('-u, --uri <mgURI>', 'a mongo urito use').option('-a, --azure <aname>', 'store to an azure container').action((() => {
	var _ref = _asyncToGenerator(function* (cmd, argx) {

		const CLI = new _main2.default();
		const { file, dbname, uri, azure } = _commander2.default;

		switch (cmd) {

			case 'backup':
				yield CLI.backupMongo({ file: file, db: dbname, uri: uri, azure: azure });
				break;

			case 'restore':
				yield CLI.restoreMongo();
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

	const examples = ['Examples:', '', 'Backup the default mongo database', '% lbtt mongo backup', '% lbtt mongo backup --file mybackup.tar', '% lbtt mongo backup --db client-dev --file mybackup.tar', '% lbtt mongo backup --uri mongodb://user:pass@server:27017/database --file backup.tar', '% lbtt mongo backup --azure mycontainer/mybackup', '', 'Restore a current mongo database', '% lbtt mongo restore --file mybackup.tar', '% lbtt mongo restore --uri mongodb://user:pass@server:27017/database --file backup.tar', '% lbtt mongo restore --azure mycontainer/mybackup.tar', ''];

	_commander2.default.outputHelp(msg => {
		const output = [].concat([msg]).concat(examples);
		return _chalk2.default.yellow.bold(output.join('\n'));
	});
}