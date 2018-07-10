#!/usr/bin/env node
'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version('0.1.0').command('config', 'configure lb test tools').command('fixtures <sect> <cmd>', 'save the test database state as a fixture').parse(process.argv);