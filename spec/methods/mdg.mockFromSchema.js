import {assert} from 'chai';
import {MockDataGen} from "../../src";
import config from '../private/config';
let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::mockFromSchema` tests', function() {

	this.timeout('45s');

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a MockDataGen', () => {

			Instance = new MockDataGen({config: config});
		});

	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			it.skip('invokes loadSchema with a valid asset-type and for 100 rows of mocked data', async () => {

				const result = await Instance.mockFromSchema({type: 'unilever/supplychain/deployment_unit',num:100});

				assert(result.success === true, 'did not indicate success');

				assert(Array.isArray(result.mocks), 'expected a mocks array');
				assert(result.mocks.length === 100, 'expected 100 rows');
				assert(_realObject(result.valid), 'validation object result.valid does not exist');
				assert(result.valid.valid === true, 'validation failed');
				//dont have time right now to give this a solid test.
			});

			it.skip('invokes loadSchema with a valid asset-type and for 10,000 rows of mocked data', async () => {

				const result = await Instance.mockFromSchema({type: 'unilever/supplychain/deployment_requirement',num:10000});
				assert(result.success === true, 'did not indicate success');
				assert(Array.isArray(result.mocks), 'expected a mocks array');
				assert(result.mocks.length === 10000, 'expected 100 rows');
				assert(_realObject(result.valid), 'validation object result.valid does not exist');
				assert(result.valid.valid === true, 'validation failed');
				//dont have time right now to give this a solid test.
			});

			it('invokes mockFromSchema on a valid asset type which has an array of items', async () => {

				const result = await Instance.mockFromSchema({type: 'test/findarraynodes1', num: 1});
				console.log(JSON.stringify(result, null, 2));
				//const result = await Instance.mockFromSchema({type: 'unilever/supplychain/supply_plan', num: 1});
				assert(result.success === true, 'did not indicate success');
				
			});

		});

	});

});