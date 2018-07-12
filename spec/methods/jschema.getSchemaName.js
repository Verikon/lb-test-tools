import {assert} from 'chai';
import {JSchema} from "../../src";

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::getSchemaName` tests', () => {

	let testasset = 'unilever/supplychain/deployment_requirement';

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a JSchema', () => {

			Instance = new JSchema();
		});

	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			let Schema;

			describe('Preparation', () => {

				it('Loads a schema for the test', async () => {

					Schema = await Instance.loadSchema({name: testasset});
				});

			});

			describe('Invocation' , () => {

				it('invokes getSchemaName with a valid asset name', async () => {

					const result = await Instance.getSchemaName({schema: Schema});
					assert(result === testasset);
				});

			});

		});

	});

});