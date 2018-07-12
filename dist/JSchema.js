'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.JSchema = undefined;

var _events = require('events');

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
		this.configured = false;
		this.ajv = new _ajv2.default({ loadSchema: this.ajvLoadSchema });

		if (props.config) this.configure(props.config);
	}

	configure(config) {

		this.config = config;
		this.configured = true;
	}

	ajvLoadSchema(uri) {
		return _asyncToGenerator(function* () {

			return yield _requestPromiseNative2.default.get({ url: uri, json: true });
		})();
	}

	/**
  * 
  * @param {Object} args the argument object
  * @param {String} args.name the cannoncial name of the asset being loaded.
  * 
  * @returns {Promise} resolves with a parsed schema.
  */
	loadSchema({ type }) {
		var _this = this;

		return _asyncToGenerator(function* () {

			if (!_this.configured) throw new Error('loadSchema called when JSchema has not been configured.');

			const url = _this.config.schema_uri + type.replace(/.json/g, '') + '.json';

			let result;

			try {

				if (_this.schema_cache[type]) result = _this.schema_cache[type];else {
					result = yield _requestPromiseNative2.default.get({ url: url, json: true });
					_this.schema_cache[type] = result;
				}
			} catch (err) {

				throw new Error('Failed to load schema `' + type + '` - received ' + err.statusCode + ' from url ' + err.options.url);
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
		var _this2 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(data, _this2._error('validate', 'missing argument data'));
			data = Array.isArray(data) ? data : [data];

			let ret = yield _this2.resolveSchemaAndType({ type: type, schema: schema });
			schema = ret.schema;
			type = ret.type;

			const validate = yield _this2.ajv.compileAsync(schema);

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
		var _this3 = this;

		return _asyncToGenerator(function* () {

			(0, _assert2.default)(schema || type, _this3._error('resolveSchemaAndType', 'missing argument schema or type'));

			if (!schema) schema = yield _this3.loadSchema({ type: type });

			if (!type) type = _this3.getSchemaName({ schema: schema });

			(0, _assert2.default)(schema, _this3._error('resolveSchemaAndType', 'failed to resolve a valid schema'));
			(0, _assert2.default)(typeof type === 'string' && type.length, _this3._error('resolveSchemaAndType', 'failed to resolve a valid schema type'));

			return { schema: schema, type: type };
		})();
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

		return $ref.replace(this.config.schema_uri, '').replace(/.json/g, '');
	}

	_error(method, issue) {

		return 'JSchema::' + method + ' - ' + issue;
	}

};