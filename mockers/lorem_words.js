const dictionary = [
	'ad','adipisicing','aliqua','aliquip','amet','anim','aute','cillum','commodo','consectetur','consequat','culpa',
	'cupidatat','deserunt','do','dolor','dolore','duis','ea','eiusmod','elit','enim','esse','est','et','eu','ex','excepteur',
	'exercitation','fugiat','id','in','incididunt','ipsum','irure','labore','laboris','laborum','Lorem','magna','minim',
	'mollit','nisi','non','nostrud','nulla','occaecat','officia','pariatur','proident','qui','quis','reprehenderit','sint',
	'sit','sunt','tempor','ullamco','ut','velit','veniam','voluptate'];

module.exports = {
	name: 'lorem_words',	
	func: function lorem_words({min, max}) {

		if(!min) throw new Error('lorem_words requires a min value');
		if(!max) max = min;

		min = parseInt(min);
		max = parseInt(max);

		let dictlength = dictionary.length,
			words = Math.floor(Math.random() * (max - min + 1)) + min,
			ret = [],
			wordnum;
	
		while(words--) {
			wordnum = Math.floor(Math.random() * (dictlength - 0)) + 0;
			ret.push(dictionary[wordnum]);
		}

		return ret.join(' ');
	},
	description: 'generate a specified amount of lorem ipsum words',
	args: {
		min: 'integer: the minimum amount of words to generate',
		max: 'integer" the maximum amount of words to generate, if not provided the minimum will be used'
	},
	usage: `
		"mocker":{
			"mockertype: "lorem_words",
			"min": 5
			"max": 10
		}
		returns: lorem ipsum dolar sit amet
	`
};