import {assert} from 'chai';
import {MockDataGen} from "../../src";

import config from '../private/config';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::findArrayNodes` tests', function() {

	this.timeout('45s');

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a MockDataGen', () => {

			Instance = new MockDataGen({config: config});
		});

		it('creates 10 test/simple documents', () => {

		});

	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			it('invokes findArrayNodes on a valid asset type which has an array of items', async () => {

				const result = await Instance.findArrayNodes({type: 'test/findarraynodes1'});
				assert(Array.isArray(result), 'expected an object');
				assert(result.length === 1, 'expected 1 array node');
				assert(_realObject(result[0]), 'the arraynode should be an object');
				assert(result[0].key === 'simplelist', 'expected the array nodes key to be simplelist');
				assert(result[0].type === 'test/simple', 'expected array nodes type to be test/simple');
			});

		});

	});

});