import {assert} from 'chai';
import {MockDataGen} from "../../src";

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::schemaCanFake` tests', () => {

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a MockDataGen', () => {

			Instance = new MockDataGen();
		});

	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			it('invokes schemaCanFake with a valid asset name which IS Mockable', async () => {

				const result = await Instance.schemaCanMock({type: 'unilever/supplychain/deployment_unit'});
				assert(_realObject(result), 'failed - did not return an object');
				assert(result.mockable === true, 'expected result.mockable to be true');
				assert(result.issues === undefined, 'expected result.issues to be undefined');
			});

			it('invokes schemaCanFake with a valid asset name which IS NOT Mockable', async () => {

				const result = await Instance.schemaCanMock({type: 'unilever/supplychain/deployment_requirement'});
				assert(_realObject(result), 'failed - did not return an object');
				assert(result.mockable === false, 'expected response.mocker to be false');
				assert(Array.isArray(result.issues), 'expected response.issues to be an array');
				assert(result.issues.length, 'expected at least 1 issue');
			});

			it("'invokes schemaCanFake with an invalid asset type", async () => {

				const result = await Instance.schemaCanMock({type: 'nowhere/nohow'});
				assert(result.mockable === false, 'expected mockable to be false');
				assert(Array.isArray(result.issues), 'expected an issues array');
				assert(result.issues.length === 1, 'expected exactly 1 issue (the 404)')
			})

		});

	});

});