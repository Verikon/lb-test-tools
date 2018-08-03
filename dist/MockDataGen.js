'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.MockDataGen = undefined;

var _JSchema = require('./JSchema');

var _mongoAssets = require('mongo-assets');

var _mongoAssets2 = _interopRequireDefault(_mongoAssets);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _faker = require('faker');

var _faker2 = _interopRequireDefault(_faker);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const info = message => {
	console.log(_chalk2.default.yellow.bold(message));
};
const success = message => {
	console.log(_chalk2.default.cyan.bold(message));
};

let MockDataGen = exports.MockDataGen = class MockDataGen extends _JSchema.JSchema {

	/**
  * 
  * @param {Object} props the property object
  * @param {Object} props.config the config objet
  * @param {String} props.current_dataase - a mongo uri 
  */
	constructor(props) {

		props = props || {};

		super(props);

		this.mockers = {};
		this.mocker_initializers = {};
		this.mocker_finalizers = {};
		this.mockers_loaded = false;
		if (props.config) this.configure(props.config);

		this.loadMockers();
		this.mongo_assets_attached = false;
	}

	configure(config) {

		if (!this.configured) super.configure(config);

		this.assets = new _mongoAssets2.default();
	}

	initialize() {

		this.loadMockers();
	}

	/**
  * load mockers, binding their initializers, mocking functions and associators to this instance.
  */
	loadMockers() {

		try {

			this._vlog('Loading Mockers');
			const mockers = this._getdircontents(_path2.default.join(__dirname, '..', 'mockers'));

			//for every installed mocker.
			mockers.forEach(mocker => {

				const inst = this._requireMocker(mocker);
				const { name, func, init, final } = inst;

				//bind the mocking function.
				this.mockers[name] = func;

				//bind the initializor if it has one
				if (init) this.mocker_initializers[name] = init.bind(inst);

				//bind the finalizer if it has one.
				if (final) this.mocker_finalizers[name] = final.bind(inst);
			});

			this.mockers_loaded = true;
		} catch (err) {

			console.error('Invalid Mocker');
			console.log(err);
		}
	}

	/**
  * get a list of mockers available in the mockers directory.
  */
	getMockerList() {

		const mockerlist = this._getdircontents(_path2.default.join(__dirname, '..', 'mockers'));
		let mockers = mockerlist.map(loc => {
			const mcont = this._requireMocker(loc);
			delete mcont.func;
			return mcont;
		});
		return mockers;
	}

	registerMocker() {}

	/**
  * Bake a recipe
  * 
  * @param {Object} args the argument object
  * @param {Object} args.recipe the receipe
  * @param {Boolean} args.save save the data
  * @param {Boolean} args.assets use mongo assets
  * @param {Boolean} args.user the user to perform under, if using mongo assets.
  * 
  * @returns {Promise}
  */
	bakeRecipe({ recipe, save, assets, user }) {
		var _this = this;

		return _asyncToGenerator(function* () {

			console.log();
			info('Baking Recipe ' + (recipe.project || 'Unknown'));
			info(recipe.description || 'Unknown');
			info('___________________');
			console.log();

			//instantiate a mongo assets
			yield _this.attachMongoAssets();

			//set some defaults.
			save = save === undefined ? false : save;
			assets = assets || recipe.mongo_assets || false;
			user = user || recipe.user || false;

			//ensures it has a recipe.
			(0, _assert2.default)(recipe, 'argue a recipe');
			(0, _assert2.default)(recipe.recipe, 'recipe does not contain a recipe attribute');

			//replacing this with an async version which will mean we need deps and stages.
			let item,
			    actioning_user,
			    actioning_role,
			    result = {},
			    i;

			vlog('Loading mockers');
			yield _this.loadMockers();

			//get the user object
			if (assets) {

				result = yield _this.assets.auth.authenticate(recipe.user);
				(0, _assert2.default)(result.success, 'Could not authenticate this recipe - user does not exist or the server is not a mongo-assets server');
				actioning_user = result.user;
				actioning_role = recipe.user.role ? actioning_user.role.find(function (role) {
					return role.name === recipe.user.role;
				}) : actioning_user.role.find(function (role) {
					return role.system && role.type === 'user';
				});

				(0, _assert2.default)(actioning_role, 'could not determine the role to apply the mocked data to - does the role detailed in the receipe exist?');
			}

			//loop and process initalizors and mocking functions.
			for (let i = 0; i < recipe.recipe.length; i++) {

				//args are the recipe item for this item in the recipe + the user/role.
				item = recipe.recipe[i];
				let mockArgs = Object.assign({}, { user: actioning_user, role: actioning_role }, item);

				//create the mock for this item.
				result[item.type] = yield _this.mockData(mockArgs);

				//create the data.
				if (save) {

					if (assets) {

						info('Saving asset type: ' + item.type);
						let aresult = yield _this.assets.createAssets({ user: actioning_user, role: actioning_role, type: item.type, assets: result[item.type] });
						result[item.type] = aresult.assets;
						success('done.');
						console.log();
					} else {
						info('Saving documents: ' + item.type);
						yield _this.saveAssets({ collection: item.type, assets: result[item.type] });
						success('done.');
						console.log();
					}
				}
			}

			//do the finalizer loop here (eg associating data)
			for (let i = 0; i < recipe.recipe.length; i++) {

				item = recipe.recipe[i];
				yield _this.finalizeMockers({
					item: item,
					items: result[item.type],
					recipe: recipe.recipe,
					user: actioning_user,
					role: actioning_role
				});
			}

			yield _this.close();

			return result;
		})();
	}

	/**
  * Mock some data.
  * 
  * @param {Object} args the argument object
  * @param {String} args.type the cannoncical type of asset to mock
  * @param {Integer} args.num the number of assets to generate/mock
  * @param {Object} args.count the count config (ie. how many child types) - eg {count:{requirements:4}} will give 4 of the requirements array.
  * @param {Boolean} args.local use the local schema directory, default : false
  * 
  * @returns {Promise}  
  */
	mockData({ type, num, count, validate }) {
		var _this2 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(typeof type === 'string' && type.length, 'Invalid --type. Should be an asset type');
			(0, _assert2.default)(typeof num === 'number' && num > 0, 'Invalid --num. Should be the number of how many mocks are to be generated');

			let nodeArray, mockconfig;

			//find the array nodes, so we can work out how many items of the array we're creating.
			nodeArray = yield _this2.findArrayNodes({ type: type });
			mockconfig = {};

			//iterate the array nodes.
			yield Promise.all(nodeArray.map((() => {
				var _ref = _asyncToGenerator(function* (node) {

					//if the recipe has a count attribute for this item, assume the count.
					if (count && count[node.key] !== undefined) {
						mockconfig[node.key] = { count: count[node.key] };
					} else {

						console.error('Could not determine how many ' + node.key + ' we have - get the cli to produce this before entering the mockData phase.');
					}
				});

				return function (_x) {
					return _ref.apply(this, arguments);
				};
			})()));

			//create the mock data.
			let result = yield _this2.mockFromSchema({ type: type, num: num, mockconfig: mockconfig, validate: validate });
			(0, _assert2.default)(result.success === true, 'received an unexpected error building mocks -- ' + result.error);

			return result.mocks;
		})();
	}

	/**
  * Configure sibling arrays
  * 
  * @param {String} the schema/type
  * 
  * @returns {Promise} An array of props which are array nodes in the schema
  */
	getArrayNodes({ type }) {
		var _this3 = this;

		return _asyncToGenerator(function* () {

			const nodeArray = yield _this3.findArrayNodes({ type: type });
			return nodeArray.map(function (node) {
				return node.key;
			});
		})();
	}

	/**
  * Find array nodes (properties specified to be an array) in an argued asset type
  * 
  * @param {Object} args the argument object
  * @param {String} args.type the asset type to seek array props in
  * @param {Object} args.schema the schema of this asset type.
  * 
  * @returns {Promise} resolves an array with {key:<property which is specced to ba array>, type: <the asset type populating the array>}
  */
	findArrayNodes({ type, schema }) {
		var _this4 = this;

		return _asyncToGenerator(function* () {

			let result = yield _this4.resolveSchemaAndType({ type: type, schema: schema });

			type = result.type;
			schema = result.schema;

			//if nothing is required.
			if (!schema.required) return [];

			return schema.required.reduce(function (c, key) {

				if (schema.properties[key].type === 'array') {

					if (schema.properties[key].items.$ref) return c.concat([{ key: key, type: _this4.refToType(schema.properties[key].items.$ref) }]);

					return c.concat([{ key: key }]);
				}

				return c;
			}, []);
		})();
	}

	/**
  * Fake some data from a schema.
  * 
  * @param {Object} args the argument object
  * @param {String} args.type the cannoncial type of the asset to fake
  * @param {Integer} args.num the amount of fakes to generate
  * @param {Boolean} args.validate validate the mocked data, default true.
  * @param {Object} args.mockconfig various params for mocking the schema, eg {someArrayProp: { count: 10 } }//mock 10 items for this array.
  * 
  * @returns {Promise} {success: true, mocks: [...array of mocked data...]}
  */
	mockFromSchema({ type, schema, num, validate, mockconfig }) {
		var _this5 = this;

		return _asyncToGenerator(function* () {

			//generate 100 items by default.
			num = num || 100;
			validate = validate === undefined ? true : validate;

			let result;

			mockconfig = mockconfig || {};

			//load the mockers if we haven't already; ensuring we have all the mocker functions good to go.
			if (!_this5.mockers_loaded) _this5.loadMockers();

			//resolve the schmea and the type we're mocking.
			result = yield _this5.resolveSchemaAndType({ type: type, schema: schema });
			type = result.type;
			schema = result.schema;

			//ensure its mockable.
			result = yield _this5.schemaCanMock({ type: type });
			if (!result.mockable) return { success: false, error: 'unmockable type ' + type, issues: result.issues };

			let mock,
			    mocker,
			    mockers,
			    mname,
			    margs,
			    mocks = [],
			    minit,
			    mockerstack;

			//run mocker initializers
			vlog('Initializing');
			mockers = yield _this5.initializeMockers({ type: type, schema: schema });

			//mock the argued number of items.
			while (num--) {

				//iterate through the required props on this schema
				mock = schema.required.reduce(function (c, key, ridx) {

					//if this is an array
					if (schema.properties[key].type === 'array') {

						//determine how many items well mock
						let cnt = mockconfig[key] ? mockconfig[key].count || 10 : 10;

						//is this an array of $ref 
						let ref = schema.properties[key].items.$ref || null;

						//will this array use a mocker?
						let willMock = Boolean(schema.properties[key].mocker);

						if (ref && willMock) {

							mocker = schema.properties[key].mocker;
							mname = mocker.mockertype;
							margs = Object.assign({}, mocker, { definition: schema.properties[key], index: ridx });
							mockerstack = [];

							while (cnt--) {
								let mockerresult = _this5.mockers[mname](margs);
								if (mockerresult !== '!!defer!!') //dont push to the result (the mocker will deal with it during finalization)
									mockerstack.push(_this5.mockers[mname](margs));
							}
							c[key] = mockerstack;
							return c;
						}

						if (ref) {

							c[key] = [];
							c[key] = _this5.mockFromSchema({ type: _this5.refToType(ref), num: cnt, validate: false }).then(function (r) {
								c[key] = r.mocks;
							});
							return c;
						}
					}

					//is this a ref
					if (schema.properties[key].$ref && !schema.properties[key].mocker) {

						c[key] = _this5.mockFromSchema({ type: _this5.refToType(schema.properties[key].$ref), num: 1, validate: false }).then(function (r) {
							c[key] = r.mocks[0];
						});
						return c;
					}

					mocker = schema.properties[key].mocker;
					mname = mocker.mockertype;
					margs = Object.assign({}, mocker, { definition: schema.properties[key], mock: c, index: ridx });

					c[key] = _this5.mockers[mname](margs);
					return c;
				}, {});

				//wait for all promises
				yield Promise.all(Object.keys(mock).reduce(function (c, key) {
					return mock[key] instanceof Promise ? c.concat([mock[key]]) : c;
				}, []));

				mocks.push(mock);
			}

			let valid;
			if (validate) {
				valid = yield _this5.validate({ schema: schema, data: mocks });
			}

			//if this is an interative call, send the data only.
			return validate ? { success: true, mocks: mocks, valid: valid } : { success: true, mocks: mocks };
		})();
	}

	/**
  * Initialize mockers that have initalizers. If neither type or schema is argued then all mockers will run their init methods.
  * 
  * @param {Object} args the argument object
  * @param {String} args.type the assettype/schema (gains the mocker list from what this type uses)
  * @param {Object} args.schema schema to initialize (gains the mocker list from what this schema uses)
  * 
  * @returns {Promise} 
  */
	initializeMockers({ type, schema }) {
		var _this6 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(_this6.mockers_loaded, 'mockers need to be loaded first, invoke loadMockers');

			let result,
			    mockers,
			    mockertype,
			    mockerargs,
			    initlist = [];

			result = yield _this6.resolveSchemaAndType({ type: type, schema: schema });
			type = result.type;
			schema = result.schema;

			//iterate over the required props in the schema.
			result = yield Promise.all(schema.required.reduce(function (c, key, ridx) {

				//if the prop has a mocker
				if (schema.properties[key].mocker) {

					//assign the mockertype.
					mockertype = schema.properties[key].mocker.mockertype;

					//if this mocker has an initializer.
					if (typeof _this6.mocker_initializers[mockertype] === 'function') {

						initlist.push(mockertype);

						//build the args, and execute.
						mockerargs = Object.assign({}, { config: _this6.config, index: ridx }, schema.properties[key].mocker);
						let result = _this6.mocker_initializers[mockertype](mockerargs);
						c.push(result); //this will be a promise.
					}
				}

				return c;
			}, []));

			return { success: true, initialized: initlist };
		})();
	}

	/**
  * 
  * @param {Object} args the argument object
  * @param {Object} args.item the item
  * @param {Array} args.items the mocked items created during the mocking phase
  * @param {Object} args.recipe the recipe
  * 
  * @returns {Promise} 
  */
	finalizeMockers({ item, items, recipe }) {
		var _this7 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(_this7.mockers_loaded, 'mockers need to be loaded first, invoke loadMockers');

			let result,
			    schema,
			    mockers,
			    mockertype,
			    mockerargs,
			    finalizedlist = [];

			const { type } = item;

			//gain the type's schema.
			result = yield _this7.resolveSchemaAndType({ type: type });
			schema = result.schema;

			//iterate over the schema's required properties
			result = yield Promise.all(schema.required.reduce(function (c, key, ridx) {

				//if the prop has a mocker
				if (schema.properties[key].mocker) {

					//assign the mockertype.
					mockertype = schema.properties[key].mocker.mockertype;

					//if this mocker has an finalizer.
					if (typeof _this7.mocker_finalizers[mockertype] === 'function') {

						//push this type to the finalized list.
						finalizedlist.push(mockertype);

						//build the args and execute.
						mockerargs = Object.assign({
							config: _this7.config, // a reference to the runtime config
							index: ridx, // a unique index
							schema: schema, // a reference to the schema
							prop: key, // the schema property,
							items: items, // a reference to the mocked data items relevent to this schema property
							item: item, // a reference to the recipe item for this bake schema type
							mongo_assets: _this7.assets, // a reference to the mongo-assets instance
							recipe: recipe // a refernece to the entire recipe
						}, schema.properties[key].mocker);

						let result = _this7.mocker_finalizers[mockertype](mockerargs);
						c.push(result); //this will be a promise.
					}
				}
				return c;
			}, []));

			return { success: true, deferred: finalizedlist };
		})();
	}

	/**
  * get the mockers used for an argued type/schema.
  * 
  * @param {Object} args the argument object.
  * @param {String} args.type an assettype for which to gain the mocker list.
  * @param {Object} args.schema a schema for which to gain the mocker list.
  * 
  * @returns {Promise} 
  */
	getMockers({ type, schema }) {
		var _this8 = this;

		return _asyncToGenerator(function* () {

			let result,
			    mockers = [];

			result = yield _this8.resolveSchemaAndType({ type: type, schema: schema });
			type = result.type;
			schema = result.schema;

			//if there are no reuired attributes, theres nothing to mock.
			if (!Array.isArray(schema.required)) {
				console.warn('Schema for type ' + _this8.getSchemaName(schema) + ' has no required attributes, no mockers will be initalized');
				return mockers;
			}

			mockers = schema.required.reduce(function (c, key) {
				return schema.properties[key].mocker && c.indexOf(schema.properties[key].mocker.mockertype) === -1 ? c.concat([schema.properties[key].mocker.mockertype]) : c;
			}, []);

			return { success: true, mockers: mockers };
		})();
	}

	/**
  * Is the schema valid/mockable?
  * 
  * @param {Object} args the argument object
  * @param {Object} args.schema a parsed JSON schema object.
  * @param {String} args.type the cannonical of the asset being tested
  * 
  * @returns {Promise} resolves {mockable: true/false, reasons: [](issues exists only if mockable is false)
  */
	schemaCanMock({ schema, type }) {
		var _this9 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(schema || type, 'required argument type or schema missing');
			(0, _assert2.default)(!(schema && type), 'argue type or schema, not both');

			if (type) {
				try {
					schema = yield _this9.loadSchema({ type: type });
				} catch (err) {
					return { mockable: false, issues: [err.message] };
				}
			}

			if (!type) type = _this9.getSchemaName(schema);

			(0, _assert2.default)(Array.isArray(schema.required), 'Schema has no required fields, nothing to mock');

			let unfakeables = [];

			schema.required.forEach(function (req) {

				//if this is an array
				if (schema.properties[req].type === 'array') return;

				//if its a reference, without a mocker, return (we'll mock the $ref)
				if (schema.properties[req].$ref && !schema.properties[req].mocker) return;

				//ensure a mocker has been declared upon a required prop.
				if (schema.properties[req].mocker === undefined && !schema.properties[req].$ref) return unfakeables.push('property `' + req + '` is required but does not have a mocker');

				//ensure the declared mocker has been registered with this instance.
				let mockername = schema.properties[req].mocker.mockertype;
				if (!_this9._mockerLoaded(mockername)) return unfakeables.push('property `' + req + '` has an unknown mocker `' + mockername + '` - register with `lbtt mock register`');
			});

			console.log('UNFA', unfakeables);
			return Object.keys(unfakeables).length ? { mockable: false, issues: unfakeables } : { mockable: true };
		})();
	}

	/**
  * Attach and connect mongo assets to this.assets
  */
	attachMongoAssets() {
		var _this10 = this;

		return _asyncToGenerator(function* () {

			if (!_this10.mongo_assets_attached) {

				const { current_database } = _this10.config;
				yield _this10.assets.initialize({ config: { endpoint: current_database } });
				_this10.mongo_assets_attached = true;
			}
		})();
	}

	close() {
		var _this11 = this;

		return _asyncToGenerator(function* () {

			if (_this11.mongo_assets_attached) yield _this11.assets.disconnect();
		})();
	}

	/**
  * Save the assets to the current mongo (as documents, unrelated)
  * 
  * @param {Object} args the argument object
  * @param {String} args.collection collection name
  * @param {Array} args.assets the document/assets to save in the collection
  * 
  * @returns {Promise} 
  */
	saveAssets({ collection, assets }) {
		var _this12 = this;

		return _asyncToGenerator(function* () {

			let result = yield _this12.assets.db.collection(collection).insertMany(assets);
		})();
	}

	_getdircontents(dir) {

		dir = _path2.default.resolve(dir);
		return _fs2.default.readdirSync(dir);
	}

	_requireMocker(mocker_filename) {

		return require(_path2.default.resolve(__dirname, '..', 'mockers', mocker_filename));
	}

	_mockerLoaded(mocker) {

		return typeof this.mockers[mocker] === 'function';
	}

};