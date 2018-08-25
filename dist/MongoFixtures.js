'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.MongoFixtures = undefined;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mongodb = require('mongodb');

var _mongodbBackup = require('mongodb-backup');

var _mongodbBackup2 = _interopRequireDefault(_mongodbBackup);

var _mongodbRestore = require('mongodb-restore');

var _mongodbRestore2 = _interopRequireDefault(_mongodbRestore);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

let MongoFixtures = exports.MongoFixtures = class MongoFixtures {

	/**
  * 
  * @param {Object} props the property object
  * @param {Object} props.config the configuration object @see this.configure
  * 
  */
	constructor(props) {
		this.config = {
			// a default directory to save/load fixtures to/from.
			directory: null,
			// a default mongo uri to use
			mgURI: null,
			// mongo client
			mg: null,
			// mongo db,
			db: null
		};


		props = props || {};

		if (props.config) {
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
	configure({ directory, mgURI }) {

		if (directory) this.setDefaultDirectory(directory);
		if (mgURI) this.setDefaultMongo(mgURI);
	}

	start() {
		var _this = this;

		return _asyncToGenerator(function* () {

			yield _this.isValidConfig();
			yield _this.connectMongo();

			return { success: true };
		})();
	}

	close() {
		var _this2 = this;

		return _asyncToGenerator(function* () {

			if (_this2.config.mg) yield _this2.closeMongo();

			return { success: true };
		})();
	}

	getConfig() {

		return this.config;
	}

	isValidConfig() {
		var _this3 = this;

		return _asyncToGenerator(function* () {

			const { directory, mgURI } = _this3.config;

			(0, _assert2.default)(directory, 'no default directory specified');
			(0, _assert2.default)(mgURI, 'no mongo uri set');

			//test the directory.
			(0, _assert2.default)((0, _fs.existsSync)(directory), 'directory ' + directory + ' does not exist');

			//test mongo connection
			let test = yield _this3.connectMongo({ isDefault: false });
			(0, _assert2.default)(test.success === true, 'invalid mongo uri');

			//disconnect the client
			test.client.close();

			return true;
		})();
	}

	setDefaultDirectory(directory) {

		let abs = _path2.default.resolve(directory);
		if (!(0, _fs.existsSync)(abs)) {
			throw new Error(directory + ' directory does not exist');
		}

		this.config.directory = abs;
		return true;
	}

	setDefaultMongo(uri) {

		(0, _assert2.default)(typeof uri === 'string', 'argue a valid uri');
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
	connectMongo(args) {
		var _this4 = this;

		return _asyncToGenerator(function* () {

			args = args || {};

			//set the uri to the instnace default if not argued.
			let uri = args.uri || _this4.config.mgURI;
			(0, _assert2.default)(uri, 'Could not resolve a mongo URI');

			//set this connection as the instance defualt if not argued.
			let isDefault = args.isDefault === undefined ? true : args.isDefault;

			const client = yield _mongodb.MongoClient.connect(uri, { useNewUrlParser: true });
			const db = client.db(uri.split('/').pop());

			if (isDefault) {
				_this4.config.mg = client;
				_this4.config.db = db;
			}

			return { success: true, client: client, db: db };
		})();
	}

	closeMongo() {
		var _this5 = this;

		return _asyncToGenerator(function* () {

			let result = yield _this5.config.mg.close();
		})();
	}

	switchConnection({ uri }) {
		var _this6 = this;

		return _asyncToGenerator(function* () {

			yield _this6.closeMongo();

			if (uri === 'default') uri = _this6.config.mgURI;

			const client = yield _mongodb.MongoClient.connect(uri, { useNewUrlParser: true });
			const db = client.db(uri.split('/').pop());

			_this6.config.mg = client;
			_this6.config.db = db;
		})();
	}

	/**
  * Get a list of fixtures
  * 
  * @returns {Promise} resolves to an array of fixtures.
  */
	listFixtures() {
		var _this7 = this;

		return _asyncToGenerator(function* () {

			return _fs2.default.readdirSync(_this7.config.directory);
		})();
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
	loadFixture({ name, uri, directory, location, drop, silent }) {
		var _this8 = this;

		return _asyncToGenerator(function* () {

			//if we aren't using the default uri as our fixture source, we will need to switch the connection over.
			let switchConnection = !!uri || uri !== _this8.config.mgURI;

			//set the default uri if not argued.
			uri = uri || _this8.config.mgURI;

			//set the default directory if not argued.
			directory = directory || _this8.config.directory;

			//set the drop default true.
			drop = drop === undefined ? true : drop;

			//set location null.
			location = location || null;

			if (location) {
				name = _path2.default.basename(location);
				directory = _path2.default.dirname(location);
			}

			//be friendly, allow the user to argue .tar
			name = name.replace(/.tar/, '');

			if (!name) throw new Error('argued a fixture name');

			if (!uri) throw new Error('could not resolve a mongo URI');

			if (!directory) throw new Error('could not resolve a directory to save the backup to');

			let fileloc = _path2.default.resolve(directory, name + '.tar');

			console.log('SWITCHING CONNECTION?', switchConnection, uri);
			//ensure the file actually exists.
			if (!(0, _fs.existsSync)(fileloc)) throw new Error('Cannot determine a directory; either provide config.directory or argue a directory');

			if (switchConnection) yield _this8.switchConnection({ uri: uri });

			yield new Promise(function (resolve, reject) {
				(0, _mongodbRestore2.default)({
					uri: uri,
					root: directory,
					tar: name + '.tar',
					drop: drop,
					callback: function (err) {
						err ? reject(err) : resolve(true);
					}
				});
			});

			yield _this8._safeCollectionNames({ safe: 'off' });

			if (switchConnection) yield _this8.switchConnection({ uri: 'default' });

			return { success: true };
		})();
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
	saveFixture({ name, uri, directory, location, silent, replace }) {
		var _this9 = this;

		return _asyncToGenerator(function* () {

			name = name || 'noname-' + new Date().getTime();

			//if we aren't using the default uri as our fixture source, we will need to switch the connection over.
			let switchConnection = !!uri || uri !== _this9.config.mgURI;

			uri = uri || _this9.config.mgURI;
			directory = directory || _this9.config.directory;
			silent = silent === undefined ? true : silent;
			replace = replace === undefined ? false : replace;
			location = location || null;

			if (!uri) throw new Error('could not resolve a mongo URI');

			if (!directory) throw new Error('could not resolve a directory to save the backup to');

			if (location) {
				name = _path2.default.basename(location);
				directory = _path2.default.dirname(location);
			}

			let fileloc = _path2.default.resolve(directory, name + '.tar');

			if (!replace) {
				(0, _assert2.default)(!(0, _fs.existsSync)(fileloc), 'file exists --- ' + fileloc);
			}

			let disconnectOnComplete = false;

			if (!_this9.config.mg) {
				let conn = yield _this9.connectMongo();
				(0, _assert2.default)(conn.success);
				disconnectOnComplete = true;
			}

			if (switchConnection) yield _this9.switchConnection({ uri: uri });

			//safenames
			yield _this9._safeCollectionNames({ safe: 'on' });

			yield new Promise(function (resolve, reject) {

				console.log("'BACKING UP on", uri);
				(0, _mongodbBackup2.default)({
					uri: uri,
					root: directory,
					tar: name + '.tar',
					callback: function (err) {
						err ? reject(err) : resolve(true);
					}
				});
			});

			yield _this9._safeCollectionNames({ safe: 'off' });

			if (switchConnection) yield _this9.switchConnection({ uri: 'default' });

			if (disconnectOnComplete) yield _this9.closeMongo();

			return { success: true, location: fileloc };
		})();
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
	emptyDatabase(args) {
		var _this10 = this;

		return _asyncToGenerator(function* () {

			args = args || {};

			const directory = args.directory ? _path2.default.resolve(args.directory) : _this10.config.directory;

			const backup = args.backup === undefined ? true : args.backup;

			if (backup) {
				if (!directory) throw new Error('emptyDatabase cannot be called without a directory argued, or a default directory is set');
				if (!(0, _fs.existsSync)(directory)) throw new Error('Argued directory does no exist --- ', directory);
				yield _this10.saveFixture({ name: 'fixtures-backup' });
			}

			let result = yield _this10.config.db.listCollections().toArray();

			//if the database was already empty, return gracefully.
			if (!result.length) return { success: true, collections: [] };

			let collections = result.reduce(function (c, coll) {
				return coll.type === 'collection' ? c.concat([coll.name]) : c;
			}, []);

			yield Promise.all(collections.map(function (coll) {
				return _this10.config.db.collection(coll).drop();
			}));

			return { success: true, collections: collections };
		})();
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
	_safeCollectionNames(args) {
		var _this11 = this;

		return _asyncToGenerator(function* () {

			const { safe, charmap } = args;

			let charm = [{ char: '/', safechar: '#s#' }];

			//get all the collection names
			let collections = yield _this11.config.db.listCollections().toArray();

			//if the db is empty, simplyreturn
			if (!collections.length) return;

			collections = collections.map(function (c) {
				return c.name;
			});

			switch (safe) {

				case 'on':

					yield Promise.all(collections.reduce(function (c, colname) {

						//if it has no 'illegal' chars, return
						if (!charm.some(function (charm) {
							return colname.indexOf(charm.char) !== -1;
						})) return c;

						//we have the baddens, replace.
						let newcolname = colname;
						charm.forEach(function (c) {
							newcolname = newcolname.replace(new RegExp(c.char, 'g'), c.safechar);
						});
						return c.concat([_this11.config.db.collection(colname).rename(newcolname)]);
					}, []));
					return;

				case 'off':

					yield Promise.all(collections.reduce(function (c, colname) {

						//if it has no tagged 'illegal' chars, return
						if (!charm.some(function (charm) {
							return colname.indexOf(charm.safechar) !== -1;
						})) return c;

						//we have the baddens, replace.
						let newcolname = colname;
						charm.forEach(function (c) {
							newcolname = newcolname.replace(new RegExp(c.safechar, 'g'), c.char);
						});

						return c.concat([_this11.config.db.collection(colname).rename(newcolname)]);
					}, []));
					return;

				default:
					throw new Error('_safeCollectionNames received neither on or off as the `safe` arguement.');

			}
		})();
	}

};