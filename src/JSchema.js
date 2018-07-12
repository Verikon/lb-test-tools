import {EventEmitter} from 'events';
import assert from 'assert';
import Request from 'request-promise-native';
import Ajv from 'ajv';

export class JSchema extends EventEmitter {

	schema_cache = {};
	configured = false;

	constructor( props ) {

		props = props || {};

		super(props);

		this.ajv = new Ajv({loadSchema:this.ajvLoadSchema});

		if(props.config)
			this.configure(props.config);
	}

	configure( config ) {

		this.config = config;
		this.configured = true;
	}

	async ajvLoadSchema( uri ) {
		
		return await Request.get({url: uri, json:true});
	}

	/**
	 * 
	 * @param {Object} args the argument object
	 * @param {String} args.name the cannoncial name of the asset being loaded.
	 * 
	 * @returns {Promise} resolves with a parsed schema.
	 */
	async loadSchema({type}) {

		if(!this.configured)
			throw new Error('loadSchema called when JSchema has not been configured.');

		const url = this.config.schema_uri + type.replace(/.json/g, '') + '.json';

		let result;

		try {
			
			if(this.schema_cache[type])
				result = this.schema_cache[type];
			else{
				result = await Request.get({url: url, json:true});
				this.schema_cache[type] = result;
			}

		} catch( err ) {

			throw new Error('Failed to load schema `'+type+'` - received '+err.statusCode+' from url '+err.options.url);
		}

		return result;
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
	async validate({schema, type, data}) {

		assert(data, this._error('validate', 'missing argument data'));
		data = Array.isArray(data) ? data : [data];

		let ret = await this.resolveSchemaAndType({type: type, schema: schema});
		schema = ret.schema;
		type = ret.type;


		const validate = await this.ajv.compileAsync(schema);

		let valid, invalids = [];
		data.forEach(item => {
			valid = validate(item);
			if(!valid) invalids = invalids.concat(validate.errors);
		});

		return invalids.length
			? {valid: false, errors: invalids}
			: {valid: true};
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
	async resolveSchemaAndType({schema, type}) {

		assert(schema || type, this._error('resolveSchemaAndType', 'missing argument schema or type'));

		if(!schema)
			schema = await this.loadSchema({type: type});

		if(!type)
			type = this.getSchemaName({schema: schema});

		assert(schema, this._error('resolveSchemaAndType', 'failed to resolve a valid schema'));
		assert(typeof type === 'string' && type.length, this._error('resolveSchemaAndType', 'failed to resolve a valid schema type'));

		return {schema: schema, type: type};
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
	getSchemaName({schema, draft}) {

		draft = draft || 7;

		assert(schema, this._error('getSchemaName', 'missing argument schema'));

		let name;
		switch(draft) {

			case 7:
				if(!schema.$id && schema.id)
					throw new Error('JSONSchema draft 4 supplied, expected draft 7, change top level id to $id on type '+this.refToType(schema.id));
				name = schema.$id;
				break;

			default:
				throw new Error('Unsupported JSON schema draft '+draft);

		}

		assert(typeof name === 'string' && name.length, this._error('getSchemaName', 'invalid id field'));

		return name.replace(this.config.schema_uri, '').replace(/.json/g, '');

	}

	refToType( $ref ) {

		return $ref.replace(this.config.schema_uri, '').replace(/.json/g, '');
	}

	_error( method, issue ) {

		return 'JSchema::'+method+' - '+issue;
	}

}