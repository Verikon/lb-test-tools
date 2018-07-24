let counter;

module.exports = {
	name: 'sequence',
	init: async function({start}) {

		counter = start === undefined ? 1 : start;
	},
	func: function now({format, string}) {

		return counter++;

	},
	description: 'generate a date for this current moment',
	args: {
		start: 5
	},
	usage: `
		"mocker":{
			"mockertype": "sequence"
			"start":1
		}
		returns: prev value + 1
	`
};