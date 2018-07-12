const fakerlib = require('faker');

module.exports = {
	name: 'faker',
	func: function faker({category, type, cast}) {


		if(typeof category !== 'string' || !category.length) throw new Error('faker requires a category (eg "address")');
		if(typeof type !== 'string' || !type.length) throw new Error('faker requires a type (eg "streetAddress")');

		if(!fakerlib[category]) throw new Error('faker does not have category `'+category+'`');
		if(typeof fakerlib[category][type] !== 'function') throw new Error('faker does not have type `'+type+'` on category `'+category+'`');
		let val = fakerlib[category][type]();

		if(cast) {
			switch(cast) {

				case 'int':
				case 'integer':
					val = parseInt(val, 10);
					break

				case 'number':
				case 'float':
					val = parseFloat(val);
					break;

				case 'string':
					val = val.toString();
					break;
			}
		}

		return val;
	},
	description: 'generate a value from the fakerjs library - see https://github.com/marak/Faker.js/',
	args: {
		category: 'string - one of the fakerjs categories',
		type: 'string - the type inside the category',
		cast: 'string cast the value to a specified type (integer|float|string)'
	},
	usage: `
		"mocker":{
			"mockertype": "faker",
			"category": "name",
			"type": "firstname"
		}
		returns: "joe blow"
	`
};