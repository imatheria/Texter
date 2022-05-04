'use strict';

import * as defaults from './constants.js';

import { hud } from './hud.js';
import { screen } from './screen.js';
import { history } from './history.js';
import { Envelope } from './envelope.js';

export const runtime =
{// frame controls
	frameCounter: 0,
	numNthFrame: 30,
	nthFrame: false,
	displayFpS: false,
	STOPP: false,

	secDelta: 0.,
    minDelta: 0.,
	minRadDelta: 0.,

 // framerate calculation globals
	msFrame: 0.,
	maxFrametime: 0.,
	time: 0.,

 // performance data
	activePlanes: [],
	actualImage: undefined,
		
 // assignments
	planeOpacity: ( plane, value ) => plane.mesh.material.opacity = Math.sin( value * Math.PI/2 ) * plane.alpha, 
	planeOffsetX: ( plane, value ) => plane.mesh.position.x = plane.x + value,
	planeOffsetY: ( plane, value ) => plane.mesh.position.y = plane.y + value,
	planeOffsetS: ( plane, value ) => plane.mesh.scale.set( 
										plane.scale + value * runtime.minDelta, 
										plane.scale + value * runtime.minDelta, 
										value * runtime.minDelta ),
	planeOffsetR: ( plane, value ) => plane.mesh.rotateZ( value * runtime.minRadDelta ),
	planeDriftX: ( mesh, value ) => mesh.position.x += value * runtime.secDelta,
	planeDriftY: ( mesh, value ) => mesh.position.y += value * runtime.secDelta,
	planeDriftS: ( mesh, value ) => mesh.scale.addScalar( value * runtime.minDelta ),
	planeDriftR: ( mesh, value ) => mesh.rotateZ( value * runtime.minRadDelta ),
	
 // start performance, arrangement from script fields on screen
	start( units )
	{// get arrangement of scripts to execute
		hud.logSpecial(`RUNTIME START`);
		console.log("runtime units", units );

	 // start first script and auto play the first page

		runtime.unitIterator = runtime.unitIterGenerator( units );
		runtime.time = performance.now();
		//runtime.startUnit( runtime.unitIterator.next() );

		requestAnimationFrame( runtime.nextFrame );
	},

	nextFrame( time )
	{// update time & deltas
		runtime.secDelta = (time - runtime.time) / 1000;
		runtime.minDelta = runtime.secDelta / 60;
		runtime.minRadDelta = Math.PI*2 * runtime.minDelta;
		runtime.time = time;
		runtime.timeSeconds = time/1000;

	 // every nth frame bool
		runtime.nthFrame = runtime.frameCounter++ % runtime.numNthFrame == 0;
		
	 // update running planes
		const { PLANE_FADE, PLANE_DRIFT_CONST, PLANE_DRIFT_VAR, PLANE_DRIFT_FNC, PLANE_DRIFT_ENV } = defaults;
		const finishedPlanes = [];
		for( let i=0; i<runtime.activePlanes.length; i++ )
		{
			const plane = runtime.activePlanes[i];

		 // performances -> tests.driftIteration
			const perf = plane.performances;

		 // opacity fade
			perf[ PLANE_FADE ].next();

		 // drifts
			if( perf[ PLANE_DRIFT_CONST ] )
			{	const drifts = perf[ PLANE_DRIFT_CONST ];
				const len = drifts.length;
				for( let i=0; i<len; i++ )
					drifts[i][1]( plane.mesh, drifts[i][0]/*calc*/ );
			}	
			if( perf[ PLANE_DRIFT_VAR ] )
			{	const drifts = perf[ PLANE_DRIFT_VAR ];
				const len = drifts.length;
				for( let i=0; i<len; i++ )
					drifts[i][1]( plane, drifts[i][0]()/*calc()*/ );
			}	
			if( perf[ PLANE_DRIFT_FNC ] )
			{	const drifts = perf[ PLANE_DRIFT_FNC ];
				const len = drifts.length;
				for( let i=0; i<len; i++ )
				{	const calc = drifts[i][0];
					drifts[i][1]( plane, calc[1](calc[0]) );
			}	}
			if( perf[ PLANE_DRIFT_ENV ] )
			{	const drifts = perf[ PLANE_DRIFT_ENV ];
				const len = drifts.length;
				for( let i=0; i<len; i++ )
					drifts[i].next();
			}
		}
			
	 // remove finishedPlanes or waitstated
		runtime.deactivatePlanes( finishedPlanes )

	 // max frame time
		runtime.maxFrametime = runtime.secDelta > runtime.maxFrametime ? runtime.secDelta : runtime.maxFrametime;
		
	 // call every n'th frame only
		if(runtime.displayFpS)
			if(runtime.nthFrame)
				hud.changeText( 'framerate', `FpS: ${runtime.secDelta.toFixed(2)} | max: ${runtime.maxFrametime.toFixed(2)}<BR>active planes: ${runtime.activePlanes.length}`);

	 // display next frame
		screen.renderer.render(screen.scene, screen.camera);
		
		if( !runtime.STOPP )
			requestAnimationFrame( runtime.nextFrame );
	},

 // 
	launchPlane( plane )
	{// start performances of a new plane
		const { PLANE_FADE, PLANE_DRIFT_ENV } = defaults;
		const perf = plane.performances;

	 // (re)launch Envelopes
		perf[ PLANE_FADE ].launch();

		if( perf[ PLANE_DRIFT_ENV ] )
			perf[ PLANE_DRIFT_ENV ].forEach( (env) => env.launch() );
			
		if( !plane.active )
		{	runtime.activePlanes.push( plane );
			plane.active = true;
		}
		return;
	},
	deactivatePlanes( finished )
	{	for(const i of finished.reverse())
		{	runtime.activePlanes[i].active = false;
			runtime.activePlanes.swapRemoveIndex( i );
		}
	},
	
	startUnit( unit )
	// · initiate plane performances on user input
	// · start envelopes, animations and fades
	{
		const { PLANE_FADE, PLANE_DRIFT_CONST, PLANE_DRIFT_VAR, PLANE_DRIFT_FNC, PLANE_DRIFT_ENV } = defaults;
		
	 // reactivate waitstated Envelopes
		if( unit.mode == 'bump' )
		// exit if outside of unit-range
		{	history.pushEvent( 'bump' );
			Envelope.unfreezeAll();
			return;
		}

		history.pushEvent( unit.mode );
		Envelope.unfreeze( unit.mode );

	// launch planes
		switch( unit.mode )
		{
		  case 'image':
			if( !unit.planes )
				console.error("runtime unit 'image' needs a plane!");
	
			{	const plane = unit.planes[0];

				if( plane.changes )
				{// update performances in actual visible background
				 // a quite special feature
					console.log("image change", {...plane});
					const actual = runtime.actualImage;
					const perf = actual.performances;
					const update = plane.performances;
					
					if( update[ PLANE_FADE ] )
						perf[ PLANE_FADE ].launch();

					for( type of [ PLANE_DRIFT_CONST, PLANE_DRIFT_VAR, PLANE_DRIFT_FNC ] )
					{	if( update[ type ] )
						{	for( drift of update[ type ] )
							{	const entry = perf[ type ].find(
									([_v, assignment]) => assignment == drift[1] );
								if( entry )
									entry[0] = drift[0];
								else
									perf[ type ].push( drift );
					}	}	}

					if( update[ PLANE_DRIFT_ENV ] )
					{	for( drift of update[ PLANE_DRIFT_ENV ] )
						{	const entry = perf[ type ].find(
								([_v, assignment]) => assignment == drift[1] );
							if( entry )
								entry[1].launch({ ...drift[0] });
							else
								perf[ PLANE_DRIFT_ENV ].push( new Envelope({ ...drift[0], target: actual.mesh }));
				}	}	}
				else
				{// start new background but keep fades from previous Image if not given
					runtime.launchPlane( plane );
					runtime.actualImage = plane;

					Envelope.unfreeze( 'image' );
					history.pushEvent( 'image' );
				}
			}
			break;
			
		  case 'word':
			unit.planes.forEach( (plane) =>
			{	
				runtime.launchPlane( plane );
			} );
			break;
		}
	},

	forwardUntil( condition )
	{// step forward
		let unit;
		do
		{	unit = runtime.unitIterator.next();
			runtime.startUnit( unit );
			if(unit.mode=='bump') return;
		} while( !condition( unit ) );
	},
	backwardUntil( condition )
	{// step forward
		let unit;
		do
		{	unit = runtime.unitIterator.prev();
			runtime.startUnit( unit );
			if(unit.mode=='bump') return;
		} while( !condition( unit ) );
	},

	unitIterGenerator( units )
	{	let index = -1;
		const iterator =
		{	next()
			{	if(index<units.length) index++;
				return units[index] || { mode: 'bump' };
			},
			prev()
			{	if(index>=0) index--;
				return units[index] || { mode: 'bump' };
			},
		};
		return iterator;
	},
};
