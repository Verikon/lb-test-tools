module.exports = {
	name: 'randpick',
	func: function randpick({values, string}) {

		string = Boolean(string);

		let pick = Math.floor(Math.random() * (values.length - 0 + 1)) + 0;
		let val = values[pick];
		return string ? val.toString() : val;
	},
	description: 'generate a value from a random selection of argued values',
	args: {
		values: 'array - an array of values to select from',
		string: 'boolean - when true the number is returned as a string'
	},
	usage: `
		"mocker":{
			"mockertype": "randpick"
			"values" : ["cat", "dog", "elephant"]
		}
		returns: "dog"
	`
};