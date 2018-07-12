import {assert} from 'chai';
import {MongoFixtures} from "../../src";
import config from '../private/config';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `constructor tests', () => {

	let Instance;

	describe('Test setup', () => {


	});

	describe('Tests', () => {

		it('Instantiates the MongoFixtures class', () => {

			Instance = new MongoFixtures({config: {mgURI: config.current_database, directory: 'spec/fixtures'}});
			let result = Instance.getConfig();
			assert(result.directory, 'directory not set');
			assert(result.mgURI, 'mgURI not set');

		});

	});

	describe('Test cleanup', () => {

	});

});