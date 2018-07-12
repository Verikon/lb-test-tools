import {assert} from 'chai';
import {MongoFixtures} from "../../src";
import config from '../private/config';
import {existsSync, unlinkSync} from 'fs';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MongoFixtures::saveFixture', function() {

	this.timeout('15s');

	let Instance, TestFileLocation;

	describe('Test setup', () => {

		it('Instantiates the MongoFixtures class', () => {

			Instance = new MongoFixtures({config: {mgURI: config.current_database, directory: 'spec/fixtures'}});
		});

		it('Connects to a valid server (found in ~/spec/private/config.js)', async () => {

			let result = await Instance.connectMongo({uri: config.current_database, useNewUrlParser: true});
			assert(result.success === true, 'failed --- did not indicated success');
		});

		it('Empties the database' , async () => {

			let result = await Instance.emptyDatabase({backup: false});
			assert(result.success === true, 'failed to empty the database');
		});

		it('Creates some collections', async () => {

			let result = await Instance.config.db.collection('test/this').insertMany([{a:1}, {a:2}, {a:3}]);
			assert(result.result.ok, 'failed - did not create test collections')
			
		});

		it('Saves a fixture for the test', async() => {

			let result = await Instance.saveFixture({name: 'tester', replace:true, backup:false});
			assert(result.success === true, 'failed to save the test fixture');
			TestFileLocation = result.location;
		});

		it('Empties the database again for the test', async () => {

			let result = await Instance.emptyDatabase({backup: false});
			assert(result.success === true, 'failed to empty the database');
		})

	});

	describe('Tests method `loadFixture`', () => {

		let Result;

		it('Has no data before loading the fixture', async () => {

			let result = await Instance.config.db.listCollections().toArray();
			assert(!result.length, 'database is not empty/has collections');
		});

		it('Invoked loadFixture', async () => {

			Result = await Instance.loadFixture({name: 'tester'});
		});

		it('returned a correctly structured success', () => {

			assert(_realObject(Result), 'result was not an object')
			assert(Result.success === true, 'did not indicate success');
		});

		it('database has the data', async () => {

			let result = await Instance.config.db.listCollections().toArray();
			assert(result.length === 1, 'database is empty/has collections');
		});

	});

	describe('Test cleanup', () => {

		it('Removes the test tarball', () =>{

			unlinkSync(TestFileLocation);
			assert(!existsSync(TestFileLocation), 'failed to remove the test tarball');
		});

		it('Empties the database', async () => {

			let result = await Instance.emptyDatabase({backup: false});
			assert(result.success === true, 'failed to empty the database');
		});

		it('Disconnects mongo', async () => {

			await Instance.closeMongo();
		});

	});

});