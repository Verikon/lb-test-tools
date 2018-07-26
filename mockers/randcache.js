const fromCache = require('./MockerBase').fromCache;

module.exports = {
	name: 'randcache',
	func: function randnum({string, cache}) {

		let items = fromCache({collection: cache});
		let pick = Math.floor(Math.random() * (items.length));
		return items[pick];
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