'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.JSchema = undefined;

var _events = require('events');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _requestPromiseNative = require('request-promise-native');

var _requestPromiseNative2 = _interopRequireDefault(_requestPromiseNative);

var _ajv = require('ajv');

var _ajv2 = _interopRequireDefault(_ajv);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

let JSchema = exports.JSchema = class JSchema extends _events.EventEmitter {

	constructor(props) {

		props = props || {};

		super(props);

		this.schema_cache = {};
		this.local_schema = false;
		this.verbose = false;
		this.configured = false;
		this.ajv = new _ajv2.default({ loadSchema: this.ajvLoadSchema.bind(this) });

		if (props.config) this.configure(props.config);
	}

	configure(config) {

		this.config = config;
		this.configured = true;
	}

	/**
  * Set the instance to use the local schema directory
  * 
  * @param {Boolean} bool true/false.
  * 
  * @returns {Void}
  */
	setLocal(bool) {

		this.local_schema = bool;
	}

	setVerbose(bool) {

		this.verbose = bool;
	}

	ajvLoadSchema(uri) {
		var _this = this;

		return _asyncToGenerator(function* () {

			let result;

			if (_this.verbose) {
				console.log('LOADING uri :: ' + _this.loadSchema ? 'locally' : 'remote');
			}

			if (_this.local_schema) {

				let location = _this.schemaURLToDirectory(uri);
				result = _fs2.default.readFileSync(location, 'utf8');
				if (!result) throw new Error('Could not find local schema definition for ' + type + ' tried [' + location + ']');
				try {
					result = JSON.parse(result);
				} catch (err) {
					throw new Error('Could not parse local schema ' + type);
				}
			} else {

				result = yield _requestPromiseNative2.default.get({ url: uri, json: true });
			}

			return result;
		})();
	}

	/**
  * 
  * @param {Object} args the argument object
  * @param {String} args.name the cannoncial name of the asset being loaded.
  * @returns {Promise} resolves with a parsed schema.
  */
	loadSchema({ type }) {
		var _this2 = this;

		return _asyncToGenerator(function* () {

			if (!_this2.configured) throw new Error('loadSchema called when JSchema has not been configured.');

			const url = _this2.config.current_schema.uri + type.replace(/.json/g, '') + '.json';

			let result;

			//if we already have it.
			if (_this2.schema_cache[type]) {
				result = _this2.schema_cache[type];
			}
			//if we're using the local directory
			else if (_this2.local_schema) {

					let location = _this2.schemaURLToDirectory(url);

					try {
						result = _fs2.default.readFileSync(location, 'utf8');
					} catch (err) {
						throw new Error('Failed to read local schema ' + type + ' tried [' + location + ']');
					}

					if (!result) throw new Error('Could not find local schema definition for ' + type + ' tried [' + location + ']');

					try {
						result = JSON.parse(result);
					} catch (err) {
						throw new Error('Could not parse local schema ' + type);
					}
					_this2.schema_cache[type] = result;
				}
				//loading it from a server.
				else {

						try {
							result = yield _requestPromiseNative2.default.get({ url: url, json: true });
						} catch (err) {
							throw new Error('Failed to load schema `' + type + '` - received ' + err.statusCode + ' from url ' + err.options.url);
						}
						_this2.schema_cache[type] = result;
					}

			return result;
		})();
	}

	/**
  * 
  * @param {Object} args the argument object
  * @param {Object} args.schema the schema 
  * @param {String} args.type  the asset type
  * @param {Object|Array} args.data data to validate
  * 
  * @returns {Promise} resolves with {valid:true/false, errors: [...array of issues...]} , the errors array only exists if the valid is false.
  */
	validate({ schema, type, data }) {
		var _this3 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(data, _this3._error('validate', 'missing argument data'));
			data = Array.isArray(data) ? data : [data];

			let ret = yield _this3.resolveSchemaAndType({ type: type, schema: schema });
			schema = ret.schema;
			type = ret.type;

			const validate = yield _this3.ajv.compileAsync(schema);

			let valid,
			    invalids = [];
			data.forEach(function (item) {
				valid = validate(item);
				if (!valid) invalids = invalids.concat(validate.errors);
			});

			return invalids.length ? { valid: false, errors: invalids } : { valid: true };
		})();
	}

	/**
  * Resolve both the schema and the asset type by supplying one
  * 
  * @param {Object} args the argument object
  * @param {Object} args.schema the schema object
  * @param {String} args.type the asset type
  * 
  * @returns {Promise} resolves with {schema: <schema object>, type: <asset type> }
  */
	resolveSchemaAndType({ schema, type }) {
		var _this4 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(schema || type, _this4._error('resolveSchemaAndType', 'missing argument schema or type'));

			if (!schema) schema = yield _this4.loadSchema({ type: type });

			if (!type) type = _this4.getSchemaName({ schema: schema });

			(0, _assert2.default)(schema, _this4._error('resolveSchemaAndType', 'failed to resolve a valid schema'));
			(0, _assert2.default)(typeof type === 'string' && type.length, _this4._error('resolveSchemaAndType', 'failed to resolve a valid schema type'));

			return { schema: schema, type: type };
		})();
	}

	schemaURLToDirectory(url) {

		let parts = url.replace(this.config.current_schema.uri, '').split('/');
		let resolve = [this.config.current_schema.dir].concat(parts);
		return _path2.default.resolve.apply(this, resolve);
	}

	/**
  * Get the schema name/type from a schema object.
  * 
  * @param {Object} args the argument object
  * @param {Object} args.schema the schema object
  * @param {Integer} args.draft the JSONschema draft
  * 
  * @returns {String} the name of the asset type. 
  */
	getSchemaName({ schema, draft }) {

		draft = draft || 7;

		(0, _assert2.default)(schema, this._error('getSchemaName', 'missing argument schema'));

		let name;
		switch (draft) {

			case 7:
				if (!schema.$id && schema.id) throw new Error('JSONSchema draft 4 supplied, expected draft 7, change top level id to $id on type ' + this.refToType(schema.id));
				name = schema.$id;
				break;

			default:
				throw new Error('Unsupported JSON schema draft ' + draft);

		}

		(0, _assert2.default)(typeof name === 'string' && name.length, this._error('getSchemaName', 'invalid id field'));

		return name.replace(this.config.schema_uri, '').replace(/.json/g, '');
	}

	refToType($ref) {

		return $ref.replace(this.config.current_schema.uri, '').replace(/.json/g, '');
	}

	_error(method, issue) {

		return 'JSchema::' + method + ' - ' + issue;
	}

};