import fs from 'fs';
import path from 'path';

export default class CLIBase {

	constructor( main ) {

		this.main = main;
		this.config = main.config;
	}

	RC() {

		return JSON.parse(fs.readFileSync(path.join(this._homedir(), '.lbttrc')));
	}

	writeRC( config ) {

		config = config || this.config;

		if(!config)
			throw new Error('Could not determine a configuration to use');

		return fs.writeFileSync(path.join(this._homedir(), '.lbttrc'), JSON.stringify(config, null, 2));
	}

	rcExists() {

		return fs.existsSync(path.join(this._homedir()), '.lbttrc');
	}

	_homedir() {

		return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
	}

}