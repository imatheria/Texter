'use strict';

import * as defaults from './constants.js';
import { runtime } from './runtime.js';

export const history =
{// stored events (next word|line|page|image) - sorted by time
	events: [],

 // stored user input (for replay) - sorted by time
	commands: [], // [timestamp, word|line|page, forward|back]

//	eventCount: 0,
	pushEvent: ( type ) => history.events.push( [ runtime.time, type] ),
	pushCommand: ( type, dir ) => history.commands.push( [runtime.time, type, dir] ),
};

