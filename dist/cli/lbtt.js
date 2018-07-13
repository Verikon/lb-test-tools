#!/usr/bin/env node
'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version('0.1.0').command('config <command>', 'configure lb test tools').command('fixtures <sect2> <cmd>', 'tools for using backups and fixtures').command('mock <command>', 'tools for creating mock data').command('mongo <command>', 'mongo tools').parse(process.argv);