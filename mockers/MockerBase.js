module.exports = {

	cache: function({collection, items}) {

		console.log('CACHING', collection);
		global.mockercache = global.mockercache || {};
		global.mockercache[collection] = global.mockercache[collection] || [];
		global.mockercache[collection] = global.mockercache[collection].concat(items);
	},

	fromCache: function({collection}) {

		console.log('retrieving', collection);
		return global.mockercache[collection];
	}
}

