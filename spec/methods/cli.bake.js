import {assert} from 'chai';

import {MongoFixtures} from '../../src/MongoFixtures';
import LBTTCLI from '../../src/cli/main';
import config from '../private/config';

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `LBTTCLI::bake', function() {

	this.timeout('30s');

	let Instance;

	describe('Test setup', () => {

		it('Instantiates the CLI class', () => {

			Instance = new LBTTCLI();
		});

		it('Connects the fixture instance', async () => {

			let result = await Instance.fix.start();
			assert(result.success, 'Fixture instance failed to start');

		});

		it('Installs the fresh-install fixture', async () => {

			let result = await Instance.fix.loadFixture({location: 'spec/fixtures/fresh-install.tar'});
			assert(result.success, 'failed to load the fixture');
		});

	});

	describe('Tests', () => {

		it('Has the bake method', () => {

			assert(typeof Instance.bake === 'function', 'function does not exist');
		});

		it('bakes spec/mock/testrecipe1.yml', async () => {

			let result = await Instance.bake({file: 'spec/mocks/testrecipe1.yml'});

		});

	});

	describe('Test cleanup', () => {

	});

});