import {assert} from 'chai';
import {MongoFixtures} from "../../src";
import config from '../private/config';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MongoFixtures::connectMongo', () => {

	let Instance;

	describe('Test setup', () => {

		it('Instantiates the MongoFixtures class', () => {

			Instance = new MongoFixtures();
		});

	});

	describe('Tests', () => {

		it('connects to a valid server (found in ~/spec/private/config.js)', async () => {

			let result = await Instance.connectMongo({uri: config.mgURI, useNewUrlParser: true});
			assert(_realObject(result), 'failed --- did not return an object');
			assert(result.success === true, 'failed --- did not indicated success');
			assert(result.client.constructor.name === 'MongoClient', 'failed --- did not return MongoClient');
			assert(result.db.constructor.name === 'Db', 'failed --- did not return the Db instance');
		});

	});

	describe('Test cleanup', () => {

		it('disconnects mongo', async () => {

			await Instance.closeMongo();
		});

	});

});