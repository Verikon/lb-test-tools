import {assert} from 'chai';
import {JSchema} from "../../src";

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::loadSchema` tests', () => {

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a JSchema', () => {

			Instance = new JSchema();
		});

	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			it('invokes loadSchema with a valid asset name', async () => {

				const result = await Instance.loadSchema({type: 'unilever/supplychain/deployment_requirement.json'});
				assert(_realObject(result), 'failed - did not return an object');
			});

		});

	});

});