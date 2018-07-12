import {assert} from 'chai';
import {MockDataGen} from "../../src";

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::constructor` tests', () => {

	let Instance;

	describe('Tests', () => {

		it('Instantiates a MockDataGen with no props', () => {

			Instance = new MockDataGen();
			assert(Instance instanceof MockDataGen, 'did not instantiate');
		});

	});

});