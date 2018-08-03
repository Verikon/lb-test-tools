const MongoMocker = require('./MongoMocker');
const ObjectId = require('mongodb').ObjectId;
const info = require('chalk').cyan.bold;

class Associate extends MongoMocker {

	constructor( props ) {

		super(props);
		this.setConfig();
	}

	setConfig() {

		this.name = 'associate';
		this.description = 'associate assets';
		this.args = {
			edge: 'String | a global, unique name for the assoc edge (so the source and target can find its connection in the finalizers)',
			source: 'Boolean | if its the source',
			target: 'Boolean | if its the target',
			count: 'Intger | how many items the target should recieve',
			unique: 'Boolean | an item can be used only once in this array of associates',
			global_unique: 'Boolean | an item can be used only once across all arrays of associates'
		};

		this.usage = `
			"mocker":{
				"mockertype": "associate"
			}
			returns: 1
		`;
	}

	async init({config}) {

		this.setRuntimeConfig(config);
		global.edges = global.edges || [];
	}

	func({edge, source, target, num, definition}) {

		if(edge) {
			global.edges[edge] = global.edges[edge] || {
				stage: 0, //there are 3 stages (0 - neither edge has finalized, 1 - 1 edge has finalized, 2 - both edges have finalized.)
				assocMap: {}
			};
		}

		return definition.type && definition.type === 'array'
			? '!!defer!!'
			: {};
	}

	/**
	 * 
	 * @param {Object} args.config - the runtime configurateion
	 * @param {String} args.edge a unique name for this association edge
	 * @param {Integer} args.count if an array, how many items to associate, only effective for props typed to "array"
	 * @param {Boolean} args.unique - not used, yet
	 * @param {Boolean} args.global_unqie - not used yet
	 * @param {Object} args.schema the schema
	 * @param {String} args.prop the property in the schema this is coming from
	 * @param {Array} args.items the items created for this mock
	 * @param {MongoAssets} args.mongo_assets the mongo assets instance.
	 *  
	 */
	async final({
		config,
		edge,
		unique,
		global_unique,
		schema,
		prop,
		item,
		items,
		mongo_assets,
		method }) {

		//connect mongo.
		await this.connectMongo(config);

		//determine sourcetype, doctype and whether or not this is a associated collection or object/document.
		let sourcetype, doctype, objectassoc;

		//gain the source type from the schema's urls (resolve http://whereever/schema/whatever/whatever to whatever/whaterver)
		sourcetype = schema.properties[prop].type === 'array'
			? schema.properties[prop].items.$ref
			: schema.properties[prop].$ref;

		if(!sourcetype)
			throw new Error('Mocker associate could not finalize : could not determine sourcetype');

		sourcetype = this.urlToType(sourcetype);
		doctype = this.urlToType(schema.$id);

		//true for the association(s) being a nested object, false for an array of assocations.
		objectassoc = schema.properties[prop].type !== 'array';

		let edgeActual;
		if(edge) {
			//gain the edge maniest.
			edgeActual = global.edges[edge];
			if(!edgeActual)
				throw new Error('Could not determine edge '+edge);
		}

		//determine from the recipe how many assocs are needed for this side of the association.
		const count = this.getCount(prop, item);

		let idArray = items.map(item=> ({_id: item._id}));

		const stage = edgeActual ? edgeActual.stage : 0;

		let result;

		//first state (the first side invokes this) and we create the reltionship map we'll complete in stage 2.
		if(stage === 0)  {

			let sample_method;

			//determine the retrieve method.
			if(!unique && !global_unique)
				sample_method = this.evenlyDistribute.bind(this);

			if(!sample_method)
				throw this.error('Could not determine an appropriate sampling method');

			result = await sample_method(sourcetype, doctype, count, items, mongo_assets, objectassoc, prop, method);

			if(edge) {
				edgeActual.assocmap = result;
				edgeActual.stage = 1;
			}

		}
		//if this is the second side invocation we do teh actual data operations.
		else if(stage === 1 ) {

			result = await this.distributeAssocMap(sourcetype, doctype, count, items, mongo_assets, objectassoc, prop, method, edgeActual);
		}
		else {
			throw new Error('stage should be either 1 or 0 --- not ' + stage);
		}

		await this.closeMongo();
	}

	async evenlyDistribute(sibtype, doctype, count, items, ma, single, attribute, method) {

		const size = count * items.length;
		const need = count;

		//pull back all the needed assets in random order
		//turns out $sample will return no duplicates from what i can tell - but beware
		let assets = await this.mg_db.collection(sibtype).aggregate([{$sample:{size:size}}]).toArray();

		if(!assets.length)
			throw this.error('No assets of type ' + sibtype + ' found.')

		let sample = assets.map(item=>(item._id));

		//let resids = res.map(res=>{ return res._id});
		let shim = {
			type: doctype,
			sibtype: sibtype,
			assocs: {
			}
		};

		let pos = 0;

		//build {<docid>: [sibid, sibid], ...} - an object where the keys are a doc id, the values are an array of sib ids
		shim.assocs = items.reduce((c,item) => {
			c[item._id.toString()] = assets.slice(pos, pos+count);
			pos = pos+count;
			if(!assets[pos]) pos = 0;
			return c;
		}, {});

		for(var i=0; i < items.length; i++) {

			let item = items[i];
			let assets = shim.assocs[items[i]._id.toString()];
			console.log(info('\t -- associating '+sibtype+' to ' +doctype+'['+item._id+'] phase1('+i+'/'+items.length+')'));
			await ma.relate({assets: assets, recipient: item, single: single, attribute: attribute, method: method});
		}

		return shim;
	}

	async distributeAssocMap(sibtype, doctype, count, items, ma, single, attribute, method, edge) {

		const shim = edge.assocmap;

		//invert the assocmap and apply.
		shim.assocs = Object.keys(shim.assocs).reduce((c, key) => {
			shim.assocs[key].forEach(sib=> {
				if(!c[sib._id]) c[sib._id] = [];
				c[sib._id].push(key);
			})
			return c;
		}, {})
		
		for(var i=0; i < items.length; i++) {

			let item = items[i];
			let assetquery = {$or: shim.assocs[item._id].map(assoc=> { return {_id: ObjectId(assoc) }})};
			let assets = await this.mg_db.collection(sibtype).find(assetquery).toArray();

			if(count !== assets.length)
				console.warn(info(doctype+' is specified to receive '+count+' items of '+sibtype+' but there are not enough assets to fulfill it - only '+assets.length+' have been applied.'));

			console.log(info('\t -- associating '+sibtype+' to ' +doctype+'['+item._id+'] phase2('+i+'/'+items.length+')'));
			await ma.relate({assets: assets, recipient: item, single: single, attribute: attribute, method: method});
		}
		
		return shim;

	}

	async getAssetsUnique(type, count) {

	}

	getCount( prop, recipe ) {

		return recipe.count && recipe.count[prop]
			? recipe.count[prop]
			: 1;
	}


}

module.exports = new Associate();