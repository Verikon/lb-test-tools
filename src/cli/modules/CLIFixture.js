
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import inquirer from 'inquirer';
import assert from 'assert';
import q from './questions';
import {MongoFixtures} from '../../MongoFixtures';

const success = chalk.cyan.bold;
const failure = chalk.red.bold;
const info = chalk.yellow.bold;

export default class cliFixture {

	constructor( main ) {

		this.main = main;
	}

	load({name, target}) {

		
	}

	save({name, source}) {

	}
}