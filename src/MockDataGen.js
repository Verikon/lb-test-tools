import {JSchema} from './JSchema';
import MongoAssets from 'mongo-assets';
import assert from 'assert';
import Faker from 'faker';
import fs from 'fs';
import path from 'path';

export class MockDataGen extends JSchema {

	mockers = {};
	mocker_initializers = {};
	mockers_loaded = false;

	/**
	 * 
	 * @param {Object} props the property object
	 * @param {Object} props.config the config objet
	 * @param {String} props.current_dataase - a mongo uri 
	 */
	constructor( props ) {

		props = props || {};

		super(props);

		if(props.config)
			this.configure(props.config);

		this.loadMockers();

		this.mongo_assets_attached = false;
	}

	configure( config ) {

		if(!this.configured)
			super.configure(config);

		this.assets = new MongoAssets();
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
	async bakeRecipe({recipe, save, assets, user}) {

		await this.attachMongoAssets();

		save = save === undefined ? false : save;
		assets = assets || recipe.assets || false;
		user = user || recipe.user || false;

		assert(recipe, 'argue a recipe')

		//ensures it has a recipe.
		assert(recipe.recipe, 'recipe does not contain a recipe attribute');

		//replacing this with an async version which will mean we need deps and stages.
		//but for now.
		let item, result = {};

		for(let i=0; i<recipe.recipe.length; i++) {

			item = recipe.recipe[i];

			//create the mock for this item.
			result[item.type] = await this.mockData(item);

			if(save) {

				if(assets) {
					await this.assets.createAssets({user:user, type:item.type, assets:result[item.type]});
				} else {
					await this.saveAssets({collection: item.type, assets:result[item.type]});
				}
			}

		}

		return result;
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
	async mockData({type, num, count, validate}) {

		assert(typeof type === 'string' && type.length, 'Invalid --type. Should be an asset type');
		assert(typeof num === 'number' && num > 0, 'Invalid --num. Should be the number of how many mocks are to be generated');

		let nodeArray, mockconfig;

		nodeArray = await this.findArrayNodes({type: type});
		mockconfig = {};

		await Promise.all( nodeArray.map( async node => {
			
			if(count && count[node.key] !== undefined) {
				mockconfig[node.key] = { count: count[node.key] };
			}
			else {
				console.log('>>>>>>>>>>DO CLI HERE>');
			}

		}));

		//create the mock data.
		let result = await this.mockFromSchema({type: type, num:num, mockconfig: mockconfig, validate: validate});
		assert(result.success === true, 'received an unexpected error building mocks -- ' + result.error);

		return result.mocks;

	}

	/**
	 * Configure sibling arrays
	 * 
	 * @param {String} the schema/type
	 * 
	 * @returns {Promise} An array of props which are array nodes in the schema
	 */
	async getArrayNodes({type}) {

		const nodeArray = await this.findArrayNodes({type: type});
		return nodeArray.map(node => (node.key));
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

		//if nothing is required.
		if(!schema.required) return [];

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

		//generate 100 items by default.
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

			//iterate through the required props on this schema
			mock = schema.required.reduce((c,key,ridx) => {

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
						margs = Object.assign({}, mocker, {definition:schema.properties[key], index:ridx});
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
				margs = Object.assign({}, mocker, {definition:schema.properties[key], mock:c, index:ridx});

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
			schema.required.reduce((c,key,ridx) => {
				
				//if the prop has a mocker
				if(schema.properties[key].mocker) {

					//assign the mockertype.
					mockertype = schema.properties[key].mocker.mockertype;
				
					//if this mocker has an initializer.
					if(typeof this.mocker_initializers[mockertype] === 'function') {
					
						initlist.push(mockertype);

						//build the args, and execute.
						mockerargs = Object.assign({}, {config:this.config, index: ridx},schema.properties[key].mocker);
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

	/**
	 * Attach and connect mongo assets to this.assets
	 */
	async attachMongoAssets() {

		if(!this.mongo_assets_attached) {
			
			const {current_database} = this.config;
			await this.assets.initialize({config:{endpoint: current_database}});
			this.mongo_assets_attached = true;
		}	
	}

	async close() {
	
		if(this.mongo_assets_attached)
			await this.assets.disconnect();

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
	async saveAssets({collection, assets}) {

		let result = await this.assets.db.collection(collection).insertMany(assets);
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