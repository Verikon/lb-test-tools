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

		it('connects to a valid server (found in ~/spec/private/config.js)', async () => {

			let result = await Instance.connectMongo({uri: config.current_database, useNewUrlParser: true});
			assert(result.success === true, 'failed --- did not indicated success');
		});

		it('Creates some collections', async () => {

			let result = await Instance.config.db.collection('test/this').insertMany([{a:1}, {a:2}, {a:3}]);
			assert(result.result.ok, 'failed - did not create test collections')
			
		});

	});

	describe('Tests method `saveFixture`', () => {

		let Result;

		it('Invoked saveFixture', async () => {

			Result = await Instance.saveFixture({name: 'tester', replace:true})
		});

		it('returned a correctly structured success', () => {

			assert(_realObject(Result), 'failed - result not an object');
			assert(Result.success === true, 'failed - did not indicate success');
			assert(typeof Result.location === 'string' && Result.location.length, 'did not return a valid location');
			TestFileLocation = Result.location;
		});

		it('Has the file', () => {

			assert(existsSync(TestFileLocation), 'file did not exist at - ' + TestFileLocation);
		});
	});

	describe('Test cleanup', () => {

		it('removes the test tarball', () =>{

			unlinkSync(TestFileLocation);
		});

		it('disconnects mongo', async () => {

			await Instance.closeMongo();
		});

	});

});