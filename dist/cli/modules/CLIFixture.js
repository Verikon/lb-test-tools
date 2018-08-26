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

var _MongoFixtures = require('../../MongoFixtures');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const success = _chalk2.default.cyan.bold;
const failure = _chalk2.default.red.bold;
const info = _chalk2.default.yellow.bold;

let cliFixture = class cliFixture {

	constructor(main) {

		this.main = main;
	}

	load({ name, target }) {}

	save({ name, source }) {}
};
exports.default = cliFixture;