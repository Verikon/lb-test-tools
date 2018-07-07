import {assert} from 'chai';
import {MongoFixtures} from "../../src";
import config from '../private/config';
import {existsSync, unlinkSync} from 'fs';
import path from 'path';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MongoFixtures::emptyDatabase', function() {

	this.timeout('15s');

	let Instance;

	describe('Test setup', () => {

		it('Instantiates the MongoFixtures class', () => {

			Instance = new MongoFixtures({config: {mgURI: config.mgURI, directory: 'spec/fixtures'}});
		});

		it('connects to a valid server (found in ~/spec/private/config.js)', async () => {

			let result = await Instance.connectMongo({uri: config.mgURI, useNewUrlParser: true});
			assert(result.success === true, 'failed --- did not indicated success');
		});

		it('Creates some collections', async () => {

			let result = await Instance.config.db.collection('test/this').insertMany([{a:1}, {a:2}, {a:3}]);
			assert(result.result.ok, 'did not indicate success');
		});

	});

	describe('Tests', () => {

		it('collections exist in the database', async () => {

			let result = await Instance.config.db.listCollections().toArray();
			assert(result.length, 'no items in the database');
		});

		it('invokes emptyDatabase using defaults', async() => {

			let result = await Instance.emptyDatabase();
		});

		it('a backup exists', () => {

			assert(existsSync( path.resolve('spec/fixtures', 'fixtures-backup.tar')), 'backup did not exist');
		});

		it('no collections exist in the database', async () => {

			let result = await Instance.config.db.listCollections().toArray();
			assert(!result.length, 'collections remained in the database');
		});

	});

	describe('Test cleanup', () => {

		it('Removes the test backup', () => {

			unlinkSync( path.resolve('spec/fixtures', 'fixtures-backup.tar'));
			assert( !existsSync( path.resolve('spec/fixtures', 'fixtures-backup.tar')), 'backup did not exist');
		});

		it('disconnects mongo', async () => {

			await Instance.closeMongo();
		});

	});

});