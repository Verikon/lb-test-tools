'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.MockDataGen = undefined;

var _JSchema = require('./JSchema');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _faker = require('faker');

var _faker2 = _interopRequireDefault(_faker);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

let MockDataGen = exports.MockDataGen = class MockDataGen extends _JSchema.JSchema {

	constructor(props) {

		props = props || {};

		super(props);

		this.mockers = {};
		this.mocker_initializers = {};
		this.mockers_loaded = false;
		if (props.config) this.configure(props.config);

		this.loadMockers();
	}

	configure(config) {

		if (!this.configured) super.configure(config);
	}

	initialize() {

		this.loadMockers();
	}

	/**
  * load mockers, binding their functions and initializers to this instance.
  */
	loadMockers() {

		const mockers = this._getdircontents(_path2.default.join(__dirname, '..', 'mockers'));

		mockers.forEach(mocker => {

			const { name, func, description, args, init } = this._requireMocker(mocker);

			this.mockers[name] = func;

			if (init) this.mocker_initializers[name] = init;
		});

		this.mockers_loaded = true;
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
  * Find array nodes (properties specified to be an array) in an argued asset type
  * 
  * @param {Object} args the argument object
  * @param {String} args.type the asset type to seek array props in
  * @param {Object} args.schema the schema of this asset type.
  * 
  * @returns {Promise} resolves an array with {key:<property which is specced to ba array>, type: <the asset type populating the array>}
  */
	findArrayNodes({ type, schema }) {
		var _this = this;

		return _asyncToGenerator(function* () {

			let result = yield _this.resolveSchemaAndType({ type: type, schema: schema });
			type = result.type;
			schema = result.schema;

			return schema.required.reduce(function (c, key) {

				if (schema.properties[key].type === 'array') {

					if (schema.properties[key].items.$ref) return c.concat([{ key: key, type: _this.refToType(schema.properties[key].items.$ref) }]);

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
		var _this2 = this;

		return _asyncToGenerator(function* () {

			num = num || 100;
			validate = validate === undefined ? true : validate;

			let result;

			mockconfig = mockconfig || {};

			if (!_this2.mockers_loaded) _this2.loadMockers();

			result = yield _this2.resolveSchemaAndType({ type: type, schema: schema });
			type = result.type;
			schema = result.schema;

			//ensure its mockable.
			result = yield _this2.schemaCanMock({ type: type });

			if (!result.mockable) return { success: false, error: 'unmockable type ' + type, issues: result.issues };

			//run mocker initializers
			let mock,
			    mocker,
			    mockers,
			    mname,
			    margs,
			    mocks = [],
			    minit,
			    mockerstack;

			mockers = yield _this2.initializeMockers({ type: type, schema: schema });

			while (num--) {

				mock = schema.required.reduce(function (c, key) {

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
							margs = Object.assign({}, mocker, { definition: schema.properties[key] });
							mockerstack = [];

							while (cnt--) mockerstack.push(_this2.mockers[mname](margs));

							c[key] = mockerstack;
							return c;
						}

						if (ref) {

							c[key] = [];
							c[key] = _this2.mockFromSchema({ type: _this2.refToType(ref), num: cnt, validate: false }).then(function (r) {
								c[key] = r.mocks;
							});
							return c;
						}
					}

					//is this a ref
					if (schema.properties[key].$ref && !schema.properties[key].mocker) {

						c[key] = _this2.mockFromSchema({ type: _this2.refToType(schema.properties[key].$ref), num: 1, validate: false }).then(function (r) {
							c[key] = r.mocks[0];
						});
						return c;
					}

					mocker = schema.properties[key].mocker;
					mname = mocker.mockertype;
					margs = Object.assign({}, mocker, { definition: schema.properties[key] });
					c[key] = _this2.mockers[mname](margs);
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
				valid = yield _this2.validate({ schema: schema, data: mocks });
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
		var _this3 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(_this3.mockers_loaded, 'mockers need to be loaded first, invoke loadMockers');

			let result,
			    mockers,
			    mockertype,
			    mockerargs,
			    initlist = [];

			result = yield _this3.resolveSchemaAndType({ type: type, schema: schema });
			type = result.type;
			schema = result.schema;

			//iterate over the required props in the schema.
			result = yield Promise.all(schema.required.reduce(function (c, key) {

				//if the prop has a mocker
				if (schema.properties[key].mocker) {

					//assign the mockertype.
					mockertype = schema.properties[key].mocker.mockertype;

					//if this mocker has an initializer.
					if (typeof _this3.mocker_initializers[mockertype] === 'function') {

						initlist.push(mockertype);

						//build the args, and execute.
						mockerargs = Object.assign({}, { config: _this3.config }, schema.properties[key].mocker);
						let result = _this3.mocker_initializers[mockertype](mockerargs);
						c.push(result); //this will be a promise.
					}
				}

				return c;
			}, []));

			return { success: true, initialized: initlist };
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
		var _this4 = this;

		return _asyncToGenerator(function* () {

			let result,
			    mockers = [];

			result = yield _this4.resolveSchemaAndType({ type: type, schema: schema });
			type = result.type;
			schema = result.schema;

			//if there are no reuired attributes, theres nothing to mock.
			if (!Array.isArray(schema.required)) {
				console.warn('Schema for type ' + _this4.getSchemaName(schema) + ' has no required attributes, no mockers will be initalized');
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
		var _this5 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(schema || type, 'required argument type or schema missing');
			(0, _assert2.default)(!(schema && type), 'argue type or schema, not both');

			if (type) {
				try {
					schema = yield _this5.loadSchema({ type: type });
				} catch (err) {
					return { mockable: false, issues: [err.message] };
				}
			}

			if (!type) type = _this5.getSchemaName(schema);

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
				if (!_this5._mockerLoaded(mockername)) return unfakeables.push('property `' + req + '` has an unknown mocker `' + mockername + '` - register with `lbtt mock register`');
			});

			return Object.keys(unfakeables).length ? { mockable: false, issues: unfakeables } : { mockable: true };
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