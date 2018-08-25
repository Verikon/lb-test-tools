import path from 'path';
import fs from 'fs';
import {existsSync} from 'fs';
import {MongoClient} from 'mongodb';
import backup from 'mongodb-backup';
import restore from 'mongodb-restore';
import assert from 'assert';
export class MongoFixtures {

	config = {
		// a default directory to save/load fixtures to/from.
		directory: null, 
		// a default mongo uri to use
		mgURI: null,
		// mongo client
		mg: null,
		// mongo db,
		db: null
	};

	/**
	 * 
	 * @param {Object} props the property object
	 * @param {Object} props.config the configuration object @see this.configure
	 * 
	 */
	constructor( props ) {

		props = props || {};

		if(props.config) {
			this.configure(props.config);
		}
	}

	/**
	 * 
	 * @param {Object} args an argument object
	 * @param {} args.directory a default directory
	 * @param {String} args.mgURI the mongo connection uri
	 * 
	 */
	configure({directory, mgURI}) {

		if(directory) this.setDefaultDirectory(directory);
		if(mgURI) this.setDefaultMongo(mgURI);
	}

	async start() {

		await this.isValidConfig();
		await this.connectMongo();

		return {success:true};
	}

	async close() {

		if(this.config.mg)
			await this.closeMongo();

		return {success: true};
	}

	getConfig() {

		return this.config;
	}

	async isValidConfig() {

		const {directory, mgURI} = this.config;
		
		assert(directory, 'no default directory specified');
		assert(mgURI, 'no mongo uri set');
		
		//test the directory.
		assert(existsSync(directory), 'directory '+directory+' does not exist');

		//test mongo connection
		let test = await this.connectMongo({isDefault: false});
		assert(test.success === true, 'invalid mongo uri');
		
		//disconnect the client
		test.client.close();

		return true;
	}

	setDefaultDirectory( directory ) {

		let abs = path.resolve(directory);
		if(!existsSync(abs)) {
			throw new Error(directory+' directory does not exist');
		}

		this.config.directory = abs;
		return true;
	}

	setDefaultMongo( uri ) {

		assert(typeof uri === 'string', 'argue a valid uri');
		this.config.mgURI = uri;
		return true;
	}

	/**
	 * Connect to Mongo
	 * 
	 * @param {Object} args argument object
	 * @param {String} args.uri the mongo uri to connect to, default instance.config
	 * @param {Boolean} args.isDefault connect this as the instance default.AAGUID
	 * 
	 * @returns {Promise}  
	 */
	async connectMongo( args ) {

		args = args || {};

		//set the uri to the instnace default if not argued.
		let uri = args.uri || this.config.mgURI;
		assert(uri, 'Could not resolve a mongo URI');

		//set this connection as the instance defualt if not argued.
		let isDefault = args.isDefault === undefined ? true : args.isDefault;

		const client = await MongoClient.connect(uri, {useNewUrlParser: true});
		const db = client.db(uri.split('/').pop());

		if(isDefault) {
			this.config.mg = client;
			this.config.db = db;
		}

		return {success: true, client: client, db: db};
	}

	async closeMongo() {


		let result = await this.config.mg.close();
	}

	async switchConnection({uri}) {

		await this.closeMongo();

		if(uri === 'default')
			uri = this.config.mgURI;

		const client = await MongoClient.connect(uri, {useNewUrlParser: true});
		const db = client.db(uri.split('/').pop());

		this.config.mg = client;
		this.config.db = db;
	}

	/**
	 * Get a list of fixtures
	 * 
	 * @returns {Promise} resolves to an array of fixtures.
	 */
	async listFixtures() {

		return fs.readdirSync(this.config.directory);
	}

	/**
	 * load a fixture to a database, dropping all data so database state matches the fixture exactly.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.name the fixture name
	 * @param {String} args.uri the mongoDB URI for the database to build a fixture from, default: instance default.
	 * @param {String} args.directory a directory to save the fixure into, default: Instance default directory
	 * @param {String} args.location a file location instead of a name/directory combo, default: null.
	 * @param {Boolean} args.silent perform without logging, default true
	 * 
	 * @returns {Promise} 
	 */
	async loadFixture({name, uri, directory, location, drop, silent}) {

		//if we aren't using the default uri as our fixture source, we will need to switch the connection over.
		let switchConnection = !!uri || uri !== this.config.mgURI;

		//set the default uri if not argued.
		uri = uri || this.config.mgURI;

		//set the default directory if not argued.
		directory = directory || this.config.directory;

		//set the drop default true.
		drop = drop === undefined ? true : drop;

		//set location null.
		location = location || null;

		if(location) { 
			name = path.basename(location);
			directory = path.dirname(location);
		}

		//be friendly, allow the user to argue .tar
		name = name.replace(/.tar/, '');

		if(!name)
			throw new Error('argued a fixture name');

		if(!uri)
			throw new Error('could not resolve a mongo URI');

		if(!directory)
			throw new Error('could not resolve a directory to save the backup to');

		let fileloc = path.resolve(directory, name+'.tar');

		console.log('SWITCHING CONNECTION?', switchConnection, uri);
		//ensure the file actually exists.
		if(!existsSync(fileloc))
			throw new Error('Cannot determine a directory; either provide config.directory or argue a directory');

		if(switchConnection)
			await this.switchConnection({uri : uri});

		await new Promise((resolve, reject) => {
			restore({
				uri:uri,
				root:directory,
				tar:name+'.tar',
				drop: drop,
				callback: err => {
					err ? reject(err) : resolve(true);
				}
			})
		});

		await this._safeCollectionNames({safe: 'off'});

		if(switchConnection)
			await this.switchConnection({uri : 'default'});

		return {success: true};

	}

	/**
	 * Save a database state as a fixture.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.name the fixture name
	 * @param {String} args.uri the mongoDB URI for the database to build a fixture from, default: instance default.
	 * @param {String} args.directory a directory to save the fixure into, default: Instance default directory
	 * @param {String} args.location a filename location (eg /some/where/mything.tar) - takes priority as the save file locatin.
	 * @param {Boolean} args.silent perform without logging, default true
	 * @param {Boolean} args.replace replace an existing fixture, default false.
	 * 
	 * @returns {Promise} 
	 */
	async saveFixture({name, uri, directory, location, silent, replace}) {

		name = name || 'noname-'+new Date().getTime();

		//if we aren't using the default uri as our fixture source, we will need to switch the connection over.
		let switchConnection = !!uri || uri !== this.config.mgURI;

		uri = uri || this.config.mgURI;
		directory = directory || this.config.directory;
		silent = silent === undefined ? true : silent;
		replace = replace === undefined ? false : replace;
		location = location || null;

		if(!uri)
			throw new Error('could not resolve a mongo URI');

		if(!directory)
			throw new Error('could not resolve a directory to save the backup to');

		if(location) {
			name = path.basename(location);
			directory = path.dirname(location);
		}

		let fileloc = path.resolve(directory, name+'.tar');
	
		if(!replace){
			assert(!existsSync(fileloc), 'file exists --- '+fileloc);
		}

		let disconnectOnComplete = false;

		if(!this.config.mg) {
			let conn = await this.connectMongo();
			assert(conn.success);
			disconnectOnComplete = true;
		}

		if(switchConnection)
			await this.switchConnection({uri : uri});

		//safenames
		await this._safeCollectionNames({safe: 'on'});

		await new Promise((resolve, reject) => {

			console.log("'BACKING UP on" ,uri);
			backup({
				uri: uri,
				root: directory,
				tar: name+'.tar',
				callback: err => {
					err ? reject(err) : resolve(true)
				}
			});

		});

		await this._safeCollectionNames({safe:'off'});

		if(switchConnection)
			await this.switchConnection({uri : 'default'});

		if(disconnectOnComplete)
			await this.closeMongo();

		return {success: true, location: fileloc};
	}

	/**
	 * Blows away the database, creating a backup unless specified not to.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.directory
	 * @param {Boolean} args.backup perform a backup before emptying the database, default true.
	 * 
	 * @returns {Promise}
	 */
	async emptyDatabase( args ) {

		args = args || {};

		const directory = args.directory ? path.resolve(args.directory) : this.config.directory;

		const backup = args.backup === undefined ? true : args.backup;

		if(backup) {
			if(!directory) throw new Error('emptyDatabase cannot be called without a directory argued, or a default directory is set');
			if(!existsSync(directory)) throw new Error('Argued directory does no exist --- ', directory);
			await this.saveFixture({name: 'fixtures-backup'});
		}

		let result = await this.config.db.listCollections().toArray();

		//if the database was already empty, return gracefully.
		if(!result.length)
			return {success:true, collections:[]};

		let collections = result.reduce((c,coll) => { return coll.type === 'collection' ? c.concat([coll.name]) : c; }, []);

		await Promise.all(collections.map( coll => {
			return this.config.db.collection(coll).drop();
		}));

		return {success: true, collections: collections};

	}

	/**
	 * Rename all collections to be safe (currently just does slashes), or rename them back.
	 * This is used prior to mongo restore/backup which is bugged to not accept collections with said slahes.
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.safe either 'on' or 'off' (on renames collections replacing chars with '_sl_', off returns the '_sl_' to slashes)
	 * @param {Array} args.charmap an array of objects {char:'/', safechar:'#s'} to apply over the defaults
	 * 
	 * @returns {Promise}
	 */
	async _safeCollectionNames( args ) {

		const {safe,charmap} = args;

		let charm = [
			{char: '/', safechar:'#s#'}
		]

		//get all the collection names
		let collections = await this.config.db.listCollections().toArray();

		//if the db is empty, simplyreturn
		if(!collections.length) return;

		collections = collections.map(c =>{ return c.name });

		switch(safe) {

			case 'on':

				await Promise.all(collections.reduce((c,colname) => {

					//if it has no 'illegal' chars, return
					if(!charm.some(charm => (colname.indexOf(charm.char) !== -1))) return c;

					//we have the baddens, replace.
					let newcolname = colname;
					charm.forEach(c => {
						newcolname = newcolname.replace(new RegExp(c.char,'g'),c.safechar);
					});
					return c.concat([this.config.db.collection(colname).rename(newcolname)]);
				}, []));
				return;

			case 'off':

				await Promise.all(collections.reduce((c,colname) => {

					//if it has no tagged 'illegal' chars, return
					if(!charm.some(charm => (colname.indexOf(charm.safechar) !== -1))) return c;

					//we have the baddens, replace.
					let newcolname = colname;
					charm.forEach(c => {
						newcolname = newcolname.replace(new RegExp(c.safechar,'g'),c.char);
					})

					return c.concat([this.config.db.collection(colname).rename(newcolname)]);
				}, []));
				return;

			default:
				throw new Error('_safeCollectionNames received neither on or off as the `safe` arguement.');

		}

	}

	async 
}