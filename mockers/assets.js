const MongoClient = require('mongodb').MongoClient;

let cached_assets = [];

module.exports = {
	name: 'assets',
	init: async function({config, collection, filter, sample}) {

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
			throw new Error('mocker user requires a collection be argued');

		//set the uri
		let uri = config.current_database;

		let client, db, colls, exists;
		
		//connect the database.
		client = await MongoClient.connect(uri, {useNewUrlParser: true});
		db = client.db(uri.split('/').pop());

		//pull back the collections to ensure the argued one exists.
		cached_assets = await db.collection(collection).find(filter).toArray();

		await client.close();

		return true;
	},
	func: function randasset({values, string}) {

		return cached_assets;
	},
	description: 'retrieve some assets to attach to the mock',
	args: {
		collection: 'string - the collection the assets exists in',
		filter: 'a filter to retrieve with (used in mongodb::find)'
	},
	usage: `
		"mocker":{
			"mockertype": "assets",
			"collection": "user",
			"filter": {
				"username" :"jim"
			}
		}
		returns: [
			{"firstname": "jim", lastname: "jones"},
			{"firstname": "jim", lastname: "belushi"}
		]
	`
};