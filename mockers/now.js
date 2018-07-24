var Moment = require('moment');

module.exports = {
	name: 'now',	
	func: function now({format, string}) {

		string = string === undefined ? false : string;

		if(!format && string)
			return Moment(new Date()).toISOString();

		if(string) return new Date();
		if(format === 'iso') return Moment(new Date()).format();
		return Moment(new Date()).format(format);

	},
	description: 'generate a date for this current moment',
	args: {
		format: 'string: MomentJS formatting argument, default is ISO-8601',
		string: 'boolean: when false returns a Date object, default true'
	},
	usage: `
		"mocker":{
			"mockertype": "now"
			"format": "YYYY-MM-DD"
		}
		returns: "2018-05-22"
	`
};