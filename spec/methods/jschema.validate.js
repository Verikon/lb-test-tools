import {assert} from 'chai';
import {JSchema} from "../../src";

let _realObject = obj => { return (!!obj) && (obj.constructor === Object); };

let testdr = {
	"date":"2018-01-02",
	"line": "2",
	"supplying_dc": "111",
	"receiving_dc":"222",
	"du": {
		"name":"testdu",
		"description": "testdesc"
	},
	"uom":"cases",
	"quantity": 1000,
	"type": "whatever",
	"dfc": 5
}



describe('Method test for `MockDataGen::validate` tests', () => {

	let Instance;

	describe('Testsuite prepartion', () => {

		it('Instances a JSchema', () => {

			Instance = new JSchema();
		});

	});

	describe('Tests', () => {

		describe('Minimal use', () => {

			it('invokes validate with a valid asset name', async () => {

				const result = await Instance.validate({type: 'unilever/supplychain/deployment_requirement.json', data:testdr});
				assert(_realObject(result), 'failed - did not return an object');
				console.log(result);
			});

		});

	});

});