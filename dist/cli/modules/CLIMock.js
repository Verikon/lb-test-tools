'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _questions = require('./questions');

var _questions2 = _interopRequireDefault(_questions);

var _MockDataGen = require('../../MockDataGen');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const success = _chalk2.default.cyan.bold;
const failure = _chalk2.default.red.bold;
const info = _chalk2.default.yellow.bold;

let cliMock = class cliMock {

	constructor(main) {

		this.main = main;
	}

	test({ schema, local }) {
		var _this = this;

		return _asyncToGenerator(function* () {

			try {

				console.log(info('Running test (mocking 1) ' + schema));

				const config = _this.main.config;

				//ensure we've got a schema dir if running a local test.
				if (local && config.current_schema.dir === 'none') return console.log(info('No local schema directory set, configure one.'));

				local = local === undefined ? false : local;

				//instantiate the MDG
				const MDG = new _MockDataGen.MockDataGen({ config: config });

				//set local if propped.
				MDG.setLocal(local);

				//get the array nodes.
				let arraynodes = yield MDG.getArrayNodes({ type: schema });

				let configshim = {};
				if (arraynodes.length) {

					configshim.count = {};

					yield Promise.all(arraynodes.map((() => {
						var _ref = _asyncToGenerator(function* (node) {
							let v = yield _inquirer2.default.prompt({
								type: 'input',
								name: 'count',
								message: 'How many mocks to be generated for the ' + node + ' array prop',
								default: 5
							});
							configshim.count[node] = v.count;
						});

						return function (_x) {
							return _ref.apply(this, arguments);
						};
					})()));
				}

				let result = yield MDG.mockData({ type: schema, num: 1, count: configshim.count, validate: true });

				console.log(info('Mock:'));
				console.log(JSON.stringify(result[0], null, 2));
			} catch (err) {

				console.log(failure(err.message));
			}
		})();
	}

};
exports.default = cliMock;