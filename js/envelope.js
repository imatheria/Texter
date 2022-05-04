'use strict';

import './protos.js';
import * as defaults from './constants.js';

import { runtime } from './runtime.js';
import { history } from './history.js';

export class Envelope
{
	static freezedEnvelopes = {};

	constructor( data )
	{	if( !!data ) this.update( data );
		this.actualValue = undefined;
		this.timeMark = 0;	}

	update( {startValue, envelope, onValue, onWait, onFinish, target, scale} )
	{
		this.env = envelope || this.env || [[ 1,0 ]];
		this.onValue = onValue || this.onValue || ((v) => console.log("Envelope.onValue", v));
		this.onWait = onWait || this.onWait;
		this.onFinish = onFinish || this.onFinish;
		this.startValue = startValue;
		this.target = target || this.target || '';
		this.startValue = startValue || this.startValue || 0.;
		this.scale = scale || 1.;
	}
	launch( data )
	{
		if( !!data ) this.update( data );
		
	 // stop already running envelope
		if( this.generator )
		{
			if( !!data ? !data.startValue : true )
			 // · use actual generator value as startValue
				if( this.actualValue !== undefined )
					this.startValue = this.actualValue;

			this.generator.return();
		}
			
		this.freezed = false;
		this.generator = this.iter( this.startValue, this.env.lvl2Clone() );
	}

	freeze( waitstate )
	{
		this.freezed = true;
		if( Envelope.freezedEnvelopes[ waitstate ] )
			Envelope.freezedEnvelopes[ waitstate ].push( this );
		else
			Envelope.freezedEnvelopes[ waitstate ] = [ this ];
	}

	static unfreeze( waitstate )
	{
		const freezed = Envelope.freezedEnvelopes[ waitstate ];
		const len = freezed.length;
		for(let i=0; i<len; i++)
		{	freezed[i].freezed = false;
		}

		Envelope.freezedEnvelopes[ waitstate ].length = 0;
	}
	static unfreezeAll()
	{	return defaults.RUNTIME_EVENTS
			.forEach( (waitstate) => Envelope.unfreeze( waitstate ) );
	}
	
	*iter( startValue, env )
	{// init envelope run
		const envelopeTimer = () =>
		{// set envelope timeframe starting from now on until next waitstate
			let ts = runtime.time;
			for(let i=0; i<env.length; i++)
			{	const part = env[i];

			 // only until next waitstate
				if(part.length == 1)
				 // waitstate reached
					break; // stop time calculation
				
				ts += part[1]*1000;
				part[1] = ts;
			}
		};
		const eventsSince = ( waitstate ) =>
		{// count of events -> history.events.reduce( (a,e) => a += e.timestamp > startTime ? 1 : 0, 0 );
			if( !history.events.length ) return 0;
			let count = 0;
			let i=history.events.length-1;
			while( i>=0 )
			{
				if( history.events[i][0] <= this.timeMark)
					break;
				const ev = history.events[i][1]/*word|line|page*/;
				if( (ev == waitstate) || (ev == 'bump') ) count++;
				i--;
			}
			return count;
		};
		

		this.timeMark = runtime.time;
		envelopeTimer();
		let actual = [ parseFloat(startValue) || 0. ,runtime.time ];
		let next = env.shift();

	 // iterate via time
		while(next)
		{// catch waits
			if(next.length == 1)
			{// skip a waitstate if a key got pressed already
				const waitstate = next[0];
			 	while( eventsSince( waitstate ) < 1 )
			 	{
					this.freeze( waitstate );
					if(this.onWait) this.onWait( waitstate );
					
					this.actualValue = actual[0] * this.scale;
					this.onValue( this.target, this.actualValue );
					
					while( this.freezed ){
						yield;}
				}

//				this.eventMark = history.events.length;
				this.timeMark = runtime.time-1;
				envelopeTimer();
				
				actual[1] = runtime.time;
				next = env.shift();
				continue;
			}
			
		 // interpolate envelope-part
			const valFrom = actual[0];
			const valTo = next[0];
			const tsFrom = actual[1];
			const tsTo = next[1];
			const mode = next[2];
			while( runtime.time < tsFrom )
			{	this.actualValue = valFrom * this.scale;
				this.onValue( this.target, this.actualValue );
				yield;
			}
			
			while( runtime.time < tsTo )
			{// return interpolated value via timestamp
				const tsDelta = (runtime.time-tsFrom) / (tsTo-tsFrom);
				const valDelta = valTo-valFrom;
				
				this.actualValue = (valFrom + valDelta * tsDelta) * this.scale;
				this.onValue( this.target, this.actualValue );
				yield;
			}
		 // next part
			actual = next;
			next = env.shift();
		}
	 // final value
		this.onValue( this.target, actual[0] * this.scale);
		this.actualValue = undefined;
		if(this.onFinish) this.onFinish();	
	}

	next()
	{	if( !this.generator ) return;
		this.generator.next();			
	}

};

defaults.RUNTIME_EVENTS.forEach( (e) => Envelope.freezedEnvelopes[e] = [] );
