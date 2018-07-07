import {assert} from 'chai';
import {MongoFixtures} from "../../src";
import config from '../private/config';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MongoFixtures::connectMongo', () => {

	let Instance;

	describe('Test setup', () => {

		it('Instantiates the MongoFixtures class', () => {

			Instance = new MongoFixtures({config: {mgURI: config.mgURI, directory: 'spec/fixtures'}});
		});

	});

	describe('Tests', () => {

		it('starts the service up', async () => {

			let result = await Instance.start();
			assert(result.success === true, 'did not indicate success');
		});

		it('closes the service', async () => {

			let result = await Instance.close();
			assert(result.success === true, 'did not indicate success');
		})

	});

	describe('Test cleanup', () => {


	});

});