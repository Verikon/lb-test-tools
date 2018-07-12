import {assert} from 'chai';
import {MockDataGen} from "../../src";

import config from '../private/config';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MockDataGen::initalizeMockers` tests', function() {

	this.timeout('45s');

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a MockDataGen', () => {

			Instance = new MockDataGen({config: config});
		});


		it('Invokes loadMockers', () => {

			Instance.loadMockers();
			assert(Instance.mockers_loaded, "mockers were not loaded");
		});


	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			it('invokes initializeMockers with a known type', async () => {

				const result = await Instance.initializeMockers({type: 'unilever/supplychain/deployment_requirement'});
				assert(result.success === true, 'did not indicate success');
				assert(Array.isArray(result.initialized), 'expected an array at result.initialized');
				assert(Boolean(result.initialized.find(mocker=> { return mocker === 'randasset'})), 'expected to initalize the randasset mocker');
			});

		});

	});

});