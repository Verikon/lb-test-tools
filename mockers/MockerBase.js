class MockerBase {

	constructor( props ) {

	}

	setRuntimeConfig( config ) {

		this.runtimeConfig = config || null;
	}

	vlog( message, level ) {

	}

	error( message ) {

		return new Error('Mocker '+ this.name+ ' errored - '+message);
	}
	urlToType( url ) {

		return url.replace(this.runtimeConfig.current_schema.uri, '').replace(/.json/g, '');
	}
}

module.exports = MockerBase;