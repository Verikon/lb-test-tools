var Moment = require('moment');

module.exports = {
	name: 'date',	
	func: function date({min, max, format, string}) {

		if(!min) throw new Error('lorem_words requires a min value');
		if(!max) throw new Error('lorem_words requires a min value');

		//get start and end epochtime
		let start = new Date(min).getTime();
		let end = new Date(max).getTime();

		//generate a number between
		let epoch = Math.floor(Math.random() * (end - start + 1)) + start;

		return Moment(epoch).format(format);

	},
	description: 'generate a date between 2 RFC3339 dates',
	args: {
		min: 'string: RFC3339 earliest date',
		max: 'string: RFC3339 latest date',
		format: 'string: MomentJS formatting argument',
		string: 'boolean: when true, return the date as a string'
	},
	usage: `
		"mocker":{
			"mockertype": "date",
			"min":"2018-01-01",
			"max":"2019-01-01",
			"format":"YYYY-MM-DD",
			"string": true
		}
		returns: "2018-05-22"
	`
};