import {JSchema} from './JSchema';
import assert from 'assert';
import Faker from 'faker';
import fs from 'fs';
import path from 'path';

export class MockDataGen extends JSchema {

	mockers = {};
	mocker_initializers = {};
	mockers_loaded = false;

	constructor( props ) {

		props = props || {};

		super(props);

		if(props.config)
			this.configure(props.config);

		this.loadMockers();
	}

	configure( config ) {


		if(!this.configured)
			super.configure(config);

	}

	initialize() {

		this.loadMockers();
	}

	/**
	 * load mockers, binding their functions and initializers to this instance.
	 */
	loadMockers() {

		const mockers = this._getdircontents(path.join(__dirname, '..', 'mockers'));

		mockers.forEach(mocker => {
			
			const {name, func, description, args, init} = this._requireMocker(mocker);

			this.mockers[name] = func;

			if(init) this.mocker_initializers[name] = init;
		});

		this.mockers_loaded = true;
	}

	/**
	 * get a list of mockers available in the mockers directory.
	 */
	getMockerList() {
		
		const mockerlist = this._getdircontents(path.join(__dirname, '..', 'mockers'));
		let mockers = mockerlist.map(loc => {
			const mcont = this._requireMocker(loc);
			delete mcont.func;
			return mcont;
		})
		return mockers;
	}

	registerMocker() {

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
	async findArrayNodes({type, schema}) {

		let result = await this.resolveSchemaAndType({type:type, schema:schema});
		type = result.type;
		schema = result.schema;

		return schema.required.reduce((c,key) => {

			if(schema.properties[key].type === 'array') {
	
				if(schema.properties[key].items.$ref)
					return c.concat([{key:key, type: this.refToType(schema.properties[key].items.$ref)}]);

				return c.concat([{key: key}]);
			}

			return c;
		}, []);

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
	async mockFromSchema({type, schema, num, validate, mockconfig}) {

		num = num || 100;
		validate = validate === undefined ? true : validate;

		let result;

		mockconfig = mockconfig || {};

		if(!this.mockers_loaded)
			this.loadMockers();

		result = await this.resolveSchemaAndType({type:type, schema:schema});
		type = result.type;
		schema = result.schema;

		//ensure its mockable.
		result = await this.schemaCanMock({type: type});

		if(!result.mockable)
			return {success: false, error: 'unmockable type '+type, issues: result.issues};

		//run mocker initializers
		let mock, mocker, mockers, mname, margs, mocks = [], minit, mockerstack;

		mockers = await this.initializeMockers({type: type, schema: schema});

		while(num--) {

			mock = schema.required.reduce((c,key) => {

				//if this is an array
				if(schema.properties[key].type === 'array'){

					//determine how many items well mock
					let cnt = mockconfig[key] ? mockconfig[key].count || 10 : 10;

					//is this an array of $ref 
					let ref = schema.properties[key].items.$ref || null;

					//will this array use a mocker?
					let willMock = Boolean(schema.properties[key].mocker);

					if(ref && willMock) {

						mocker = schema.properties[key].mocker;
						mname = mocker.mockertype;
						margs = Object.assign({}, mocker, {definition:schema.properties[key]});
						mockerstack = [];
						
						while(cnt--)
							mockerstack.push(this.mockers[mname](margs));

						c[key] = mockerstack;
						return c;
					}

					if(ref) {

						c[key] = [];
						c[key] = this.mockFromSchema({ type: this.refToType(ref), num: cnt, validate: false})
									.then(r=> { c[key] = r.mocks; });
						return c;
					}

				}

				//is this a ref
				if(schema.properties[key].$ref && !schema.properties[key].mocker) {
					
					c[key] = this.mockFromSchema({type: this.refToType(schema.properties[key].$ref), num:1, validate:false})
								.then(r=> { c[key] = r.mocks[0]; });
					return c;
				}

				mocker = schema.properties[key].mocker;
				mname = mocker.mockertype;
				margs = Object.assign({}, mocker, {definition:schema.properties[key]});
				c[key] = this.mockers[mname](margs);
				return c;

			}, {});

			//wait for all promises
			await Promise.all(Object.keys(mock).reduce((c,key) => {				
				return mock[key] instanceof Promise
					? c.concat([mock[key]])
					: c;
			}, []) );

			mocks.push(mock);
		}

		let valid;
		if(validate) {
			valid = await this.validate({schema:schema, data:mocks});
		}

		//if this is an interative call, send the data only.
		return validate
			? {success: true, mocks: mocks, valid: valid}
			: {success: true, mocks: mocks};
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
	async initializeMockers({type, schema}) {

		assert(this.mockers_loaded, 'mockers need to be loaded first, invoke loadMockers');

		let result, mockers, mockertype, mockerargs, initlist =[];

		result = await this.resolveSchemaAndType({type: type, schema: schema});
		type = result.type;
		schema = result.schema;

		//iterate over the required props in the schema.
		result = await Promise.all(
			schema.required.reduce((c,key) => {
				
				//if the prop has a mocker
				if(schema.properties[key].mocker) {

					//assign the mockertype.
					mockertype = schema.properties[key].mocker.mockertype;
				
					//if this mocker has an initializer.
					if(typeof this.mocker_initializers[mockertype] === 'function') {
					
						initlist.push(mockertype);

						//build the args, and execute.
						mockerargs = Object.assign({}, {config:this.config},schema.properties[key].mocker);
						let result = this.mocker_initializers[mockertype](mockerargs);
						c.push(result); //this will be a promise.
					}
				}
	
				return c;
			}, [])
		);

		return {success: true, initialized: initlist };
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
	async getMockers({type, schema}) {
		
		let result,
			mockers = [];

		result = await this.resolveSchemaAndType({type: type, schema: schema});
		type = result.type;
		schema = result.schema;

		//if there are no reuired attributes, theres nothing to mock.
		if(!Array.isArray(schema.required)) {
			console.warn('Schema for type ' + this.getSchemaName(schema) + ' has no required attributes, no mockers will be initalized');
			return mockers;
		}

		mockers = schema.required.reduce((c,key) => {
			return schema.properties[key].mocker && c.indexOf(schema.properties[key].mocker.mockertype) === -1
				? c.concat([schema.properties[key].mocker.mockertype])
				: c;
		}, []);

		return {success: true, mockers: mockers};
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
	async schemaCanMock({schema, type}) {

		assert(schema || type, 'required argument type or schema missing');
		assert(!(schema && type), 'argue type or schema, not both');

		if(type) {
			try {
				schema = await this.loadSchema({type:type});
			} catch( err ) {
				return {mockable: false, issues: [err.message]}
			}
		}

		if(!type)
			type = this.getSchemaName(schema);

		assert(Array.isArray(schema.required), 'Schema has no required fields, nothing to mock');

		let unfakeables = [];

		schema.required.forEach( req => {

			//if this is an array
			if(schema.properties[req].type === 'array') return;

			//if its a reference, without a mocker, return (we'll mock the $ref)
			if(schema.properties[req].$ref && !schema.properties[req].mocker) return;

			//ensure a mocker has been declared upon a required prop.
			if(schema.properties[req].mocker === undefined && !schema.properties[req].$ref)
				return unfakeables.push('property `'+req+'` is required but does not have a mocker');

			//ensure the declared mocker has been registered with this instance.
			let mockername = schema.properties[req].mocker.mockertype;
			if(!this._mockerLoaded(mockername))
				return unfakeables.push('property `'+req+'` has an unknown mocker `'+mockername+'` - register with `lbtt mock register`');

		});

		return Object.keys(unfakeables).length
			? {mockable: false, issues: unfakeables}
			: {mockable: true};
	}

	_getdircontents( dir ) {

		dir = path.resolve(dir);
		return fs.readdirSync(dir);
	}

	_requireMocker( mocker_filename ) {

		return require(path.resolve(__dirname, '..', 'mockers', mocker_filename));
	}

	_mockerLoaded( mocker ) {

		return typeof this.mockers[mocker] === 'function'
	}

}