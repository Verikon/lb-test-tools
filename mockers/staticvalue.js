module.exports = {
	name: 'staticvalue',
	func: function staticvalue({value}) {
		return value;
	},
	description: 'set a static/argued value',
	args: {
		value: 'the static value to use'
	},
	usage: `
		"mocker":{
			"mockertype": "staticvalue"
			"value": "your value"
		}
		returns "your value"
	`
};