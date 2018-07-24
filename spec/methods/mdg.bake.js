import {assert} from 'chai';
import {MockDataGen} from "../../src";

import fs from 'fs';
import path from 'path';
import YAML from 'yamljs';
import config from '../private/config';
import {MongoFixtures} from '../../src';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::bake` tests', function() {

	this.timeout('45s');

	let Instance,
		Fix;

	describe('Testsuite prepartion', () => {

		it('Instances a MockDataGen', () => {

			Instance = new MockDataGen({config: config});
		});

		it('Instantiates the Fixtures tool', async () => {
	
			Fix = new MongoFixtures({config:{mgURI: config.current_database, directory: 'spec/fixtures'}});

			let result = await Fix.start();
			assert(result.success === true, 'did not indicate success');
		});

		it('Loads the `freshinstall+1mod` fixture', async () => {

			let result = await Fix.loadFixture({name: 'fresh-install'});
			assert(result.success === true, 'did not indicate success');
		});

		it('Attaches the assets instance', async () => {

			await Instance.attachMongoAssets();
		});

	});

	describe('Tests', () => {

		it('has the bake method', () => {

			assert(typeof Instance.bakeRecipe === 'function', 'bake method does not exist');
		});

		describe('Simple data', () => {

			let Recipe1,
				Result;

			describe('Preparation', () => {

				it('loads and parses the testrecipe1 YML file', () => {

					let contents = fs.readFileSync(path.resolve('spec/mocks/recipes/testrecipe1.yml'), 'utf8');
					Recipe1 = YAML.parse(contents);
				});

			});

			describe('Invocation', () => {

				it('Invokes bakeRecipe', async () => {

					Result = await Instance.bakeRecipe({recipe: Recipe1});

				});

			});

			describe('Assertion', () => {

				it('Received an object', () => {
					assert(_realObject(Result), 'failed');
				});

				it('Contained a test/simple array - with 15 items', () =>{
					
					assert(Array.isArray(Result['test/simple']), 'test/simple array does not exist');
					assert(Result['test/simple'].length === 15, 'test/simple array does not exist');

				});

			});

		});

		describe('Simple data, stored to database', () => {

			let Recipe1,
				Result;

			describe('Preparation', () => {

				it('loads and parses the testrecipe1 YML file', () => {

					let contents = fs.readFileSync(path.resolve('spec/mocks/recipes/testrecipe1.yml'), 'utf8');
					Recipe1 = YAML.parse(contents);
				});

			});

			describe('Invocation', () => {

				it('Invokes bakeRecipe with save:true', async () => {

					Result = await Instance.bakeRecipe({recipe: Recipe1, save:true});

				});

			});

			describe('Assertion', () => {

				it('Received an object', () => {

					assert(_realObject(Result), 'failed');
				});

				it('Contained a test/simple array - with 15 items', () =>{
					
					assert(Array.isArray(Result['test/simple']), 'test/simple array does not exist');
					assert(Result['test/simple'].length === 15, 'test/simple array does not exist');

				});

				it('the data exists in the database', async () => {
					
					let result = await Instance.assets.db.collection('test/simple').find().toArray();
					assert(result.length === 15, 'failed');
				});

			});

			describe('Cleanup', () => {

				it('drops the created data', async () => {

					await Instance.assets.db.collection('test/simple').drop();
				});

			});

		});

		describe('Simple data, stored to database, using mongo assets (sharing)', () => {

			let Recipe1,
				User,
				Result,
				UpdatedRole;

			describe('Preparation', () => {

				it('loads and parses the testrecipe1 YML file', () => {

					let contents = fs.readFileSync(path.resolve('spec/mocks/recipes/testrecipe1.yml'), 'utf8');
					Recipe1 = YAML.parse(contents);
				});

				it('Gains the user', async () => {

					User = await Instance.assets.db.collection('user').findOne({user: 'rootun'});

				})

			});

			describe('Invocation', () => {

				it('Invokes bakeRecipe', async () => {

					Result = await Instance.bakeRecipe({recipe: Recipe1, save: true, assets: true, user: User});
				});

			});

			describe('Assertion', () => {

				it('Received an object', () => {

					assert(_realObject(Result), 'failed');
				});

				it('Contained a test/simple array - with 15 items', () =>{
					
					assert(Array.isArray(Result['test/simple']), 'test/simple array does not exist');
					assert(Result['test/simple'].length === 15, 'test/simple array does not exist');

				});

				it('Persisted the data to the database', async () => {

					UpdatedRole = await Instance.assets.db.collection('role').findOne({type: 'user', system:true});
					assert(Array.isArray(UpdatedRole['test/simple']), 'failed');
					assert(UpdatedRole['test/simple'].length === 15, 'failed');
				});

			});

			describe('Cleanup', () => {

				it('Deletes the 15 assets it created', async () => {

					await Instance.assets.deleteAssets({type: 'test/simple', deleteAll: true})
				});
			})

		});

		describe('Simple data, stored to database, using mongo assets (sharing)', () => {

			let Recipe1,
				User,
				Result,
				UpdatedRole;

			describe('Preparation', () => {

				it('loads and parses the testrecipe2 YML file', () => {

					let contents = fs.readFileSync(path.resolve('spec/mocks/recipes/testrecipe2.yml'), 'utf8');
					Recipe1 = YAML.parse(contents);
				});

				it('Gains the user', async () => {

					User = await Instance.assets.db.collection('user').findOne({user: 'rootun'});

				})

			});

			describe('Invocation', () => {

				it('Invokes bakeRecipe', async () => {

					Result = await Instance.bakeRecipe({recipe: Recipe1, save: true, user: User});

				});

			});

			describe('Assertion', () => {

				it('Received an object', () => {

					assert(_realObject(Result), 'failed');
				});

				it('Contained a test/simple array - with 15 items', () =>{
					
					assert(Array.isArray(Result['test/simple']), 'test/simple array does not exist');
					assert(Result['test/simple'].length === 15, 'test/simple array does not exist');

				});

				it('Contained a test/scenario', () => {

					assert(Array.isArray(Result['test/scenario']), 'failed');
					assert(Result['test/scenario'].length === 1, 'expected only 1 test/scenario');
				});

				it('Contained 3 test/simples and simpleitems', () => {

					assert(Array.isArray(Result['test/scenario'][0].simpleitems), 'failed - did not have a simpleitems array')
					assert(Result['test/scenario'][0].simpleitems.length === 3, 'failed - did not have exactly 3')
				});

				it('Persisted the data to the database', async () => {

					UpdatedRole = await Instance.assets.db.collection('role').findOne({type: 'user', system:true});
					console.log('UpdatedRole', UpdatedRole['test/simple'].length);
					assert(Array.isArray(UpdatedRole['test/simple']), 'failed');
					assert(UpdatedRole['test/simple'].length === 15, 'failed');
				});

			});

		});


	});

	describe('Cleans up after the testsuite', () => {

		it.skip('Empties the database', async () => {

			let result = await Fix.emptyDatabase({backup: false});
			assert(result.success === true, 'did not indicate success');
		});

		it('Closes the Fixtures instance', async () => {

			let result = await Fix.close();
			assert(result.success === true, 'did not indicate success');
		});

		it('Closes the AuthServices instance', async () => {
			
			await Instance.close();
		});

	});
});