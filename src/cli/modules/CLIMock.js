
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import inquirer from 'inquirer';
import assert from 'assert';
import q from './questions';
import {MockDataGen} from '../../MockDataGen';

const success = chalk.cyan.bold;
const failure = chalk.red.bold;
const info = chalk.yellow.bold;

export default class cliMock {

	constructor( main ) {

		this.main = main;
	}

	async test({schema, local}) {

		try {

			console.log(info('Running test (mocking 1) '+schema));

			const config = this.main.config;

			//ensure we've got a schema dir if running a local test.
			if(local && config.current_schema.dir === 'none')
				return console.log(info('No local schema directory set, configure one.'))

			local = local === undefined ? false : local;

			//instantiate the MDG
			const MDG = new MockDataGen({config: config});

			//set local if propped.
			MDG.setLocal(local);

			//get the array nodes.
			let arraynodes = await MDG.getArrayNodes({type: schema});

			let configshim = {};
			if(arraynodes.length ) {

				configshim.count = {};

				await Promise.all( arraynodes.map( async node => {
					let v = await inquirer.prompt({
						type: 'input',
						name: 'count',
						message: 'How many mocks to be generated for the '+node+ ' array prop',
						default: 5
					});
					configshim.count[node] = v.count;
				}))
			}

			let result = await MDG.mockData({type: schema, num:1, count: configshim.count, validate: true});

			console.log(info('Mock:'))
			console.log(JSON.stringify(result[0],null,2));

		} catch( err ) {

			console.log(failure(err.message));
		}
	}

}