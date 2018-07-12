import {assert} from 'chai';
import {MockDataGen} from "../../src";

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::fakeFromSchema` tests', () => {

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a MockDataGen', () => {

			Instance = new MockDataGen();
		});

	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			it('invokes loadSchema with a valid asset name and 100 ', async () => {

				const result = await Instance.fakeFromSchema({name: 'unilever/supplychain/deployment_requirement.json', schema:11});
				assert(_realObject(result), 'failed - did not return an object');
			});

		});

	});

});