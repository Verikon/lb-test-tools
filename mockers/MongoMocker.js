const MockerBase = require('./MockerBase');
const {MongoClient} = require('mongodb');

class MongoMocker extends MockerBase {

	constructor( props ) {

		super(props);

		this.mg_db = null;
		this.mg_client = null;
		this.mg_connected = false;
	}

	async connectMongo( config ) {

		if(this.mg_connected) return;

		const endpoint = config.current_database;
		if(!endpoint)
			throw new Error('MongoMocker::connectMongo failed - no valid endpoint');

		this.mg_client = await MongoClient.connect(endpoint, {useNewUrlParser: true});
		this.mg_db = this.mg_client.db(endpoint.split('/').pop());
		this.mg_connected = true;
	}

	async closeMongo() {

		if(!this.mg_connected) return;

		await this.mg_client.close();
		this.mg_connected = false;

		return true;
	}

}

module.exports = MongoMocker;