module.exports = {
	name: 'randnum',
	func: function randnum({min, max, string}) {

		min = parseInt(min);
		max = parseInt(max);
		string = Boolean(string);

		let val = Math.floor(Math.random() * (max - min + 1)) + min;
		return string ? val.toString() : val;
	},
	description: 'generate a random number between 2 values',
	args: {
		min: 'integer: the minium the number may be',
		max: 'integer: the maximum the number may be',
		string: 'boolean - when true the number is returned as a string'
	},
	usage: `
		"mocker":{
			"mockertype": "randnum",
			"min": 5,
			"max": 10,
			"string": true
		}
		returns: "6"
	`
};