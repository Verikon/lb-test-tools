module.exports = {
	name: 'randbool',
	func: function randnum({string}) {

		let val = Math.random() >= 0.5;
		return string ? val.toString() : val;
	},
	description: 'generate a random bool true/false',
	args: {
		string: 'boolean - when true the bool is returned as a string'
	},
	usage: `
		"mocker":{
			"mockertype": "randbool"
			"string": true
		}
		returns: "true"
	`
};