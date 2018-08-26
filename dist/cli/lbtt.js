#!/usr/bin/env node
'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version('0.1.0').command('config <command>', 'configure lb test tools').command('fixtures <sect2> <cmd>', 'tools for using backups and fixtures').command('mock <command>', 'tools for creating mock data').command('mongo <command>', 'mongo tools').command('install', 'CLI setup and installation').alias('setup').command('test <type>', 'testing tools').command('bake <recipe>', 'mock baking').command('add <type>', 'add').command('load <type>', 'load').command('save <type>', 'save').command('list <type>', 'list').command('remove <type>', 'remove something').command('default <type>', 'set a default').parse(process.argv);