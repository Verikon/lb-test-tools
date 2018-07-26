const MongoClient = require('mongodb').MongoClient;
const Cache = require('./MockerBase').cache;
const fromCache= require('./MockerBase').fromCache;

let cached_collection = {};

module.exports = {
	name: 'randasset',
	init: async function({config, index, collection, filter, sample, cache}) {

		console.log('>>>>>>>>>>>>>>>>FISHING on ', collection);

		sample = sample || 50;
		filter = filter || {};

		//make sure we have a config
		if(!config)
			throw new Error('mocker randasset did not receive a config');

		//make sure the config has the current database URI
		if(!config.current_database)
			throw new Error('mocker randasset requires a valid mongo uri on config.current_database');

		//ensure we have a collection
		if(!collection)
			throw new Error('mocker randasset requires a collection be argued');

		//set the uri
		let uri = config.current_database;

		let client, db, colls, exists;
		
		//connect the database.
		client = await MongoClient.connect(uri, {useNewUrlParser: true});
		db = client.db(uri.split('/').pop());

		//pull back the collections to ensure the argued one exists.
		colls = await db.listCollections().toArray();

		//check it exists.
		exists = Boolean(colls.find(col => { return col.name === collection}));
		if(!exists) throw new Error('mocker `randasset` failed : collection `'+collection+'` doesnt exist in the database');

		//pull back some documents.
		cached_collection[index] = await db.collection(collection).find(filter).limit(sample).toArray();

		//if we got an empty collection, thats not good.
		if(!cached_collection[index].length)
			throw new Error('mocker randasset was argued an empty collection: '+collection);

		if(cache)
			Cache({collection: cache, items: cached_collection[index] });

		await client.close();

		return true;
	},
	func: function randasset({index, values, string}) {

		string = Boolean(string);

		let pick = Math.floor(Math.random() * (cached_collection[index].length));
		let val = cached_collection[index][pick];
		return string ? val.toString() : val;
	},
	description: 'randomly select a document from a mongo collection sample',
	args: {
		collection: 'string - the collection name to randomly select from'
	},
	usage: `
		"mocker":{
			"mockertype": "randmongodoc",
			"collection": "some/people",
			"filter": {},
			"sample": 20
		}
		returns: {"firstname": "jim", lastname: "jones}
	`
};