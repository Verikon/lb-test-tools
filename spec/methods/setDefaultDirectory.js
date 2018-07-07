import {assert} from 'chai';
import {MongoFixtures} from "../../src";

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

describe('Method test for `MongoFixtures::setDefaultDirectory', () => {

	let Instance;

	describe('Test setup', () => {

		it('Instantiates the MongoFixtures class', () => {

			Instance = new MongoFixtures();
		});

	});

	describe('Tests', () => {

		it('Sets the default directory', async () => {

			let result = Instance.setDefaultDirectory('spec/fixtures');
			assert(result === true, 'failed, expected return to be true');
			assert(Instance.config.directory, 'failed - did not set config.directory');
		});

		it('Fails propely when argued a non-existent directory', function( done ) {

			try {
				let result = Instance.setDefaultDirectory('no/where')
			} catch( err ) {
				return done();
			}

			done('failed - test is for an error, and an error did not get caught.');

		});

	});

	describe('Test cleanup', () => {

	});
});