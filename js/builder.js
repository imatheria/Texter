'use strict';

import * as defaults from './constants.js';

import { hud } from './hud.js';
import { resources } from './resources.js';
import { painter } from './painter.js';
import { Envelope } from './envelope.js';
import { runtime } from './runtime.js';
import { screen } from './screen.js';

import { removePath, sleep } from './tools.js';

import { splitMeasurement, splitTypes } from './tools.js';

export const builder =
{	
	init()
	{
		painter.init();
	},
	
 // phrase rendering elements
	defaultLayer: (id) =>
	({	id: id,
		operations: [], // [ {type, id, ...data} ]
		drifts: [],
		offset: [0.0,0.0],
		alpha: 1.,
	}),

	defaultTexture: (id) =>
	({	op: 'texture',
		id: id,
		canvas: undefined,
		alpha: 1,
	}),
	defaultBlur: (id) =>
	({	op: 'blur',
		id: id,
		color: painter.context.colorDefault,
		alpha: painter.context.alphaDefault,
		sizeX: 7,
		sizeY: 7,
		type: 'css',
		offset: [0.0,0.0],
	}),
	defaultStroke: (id) =>
	({	op: 'stroke',
		id: id,
		color: painter.context.colorDefault,
		alpha: painter.context.alphaDefault,
		thickness: 1,
		offset: [0.0,0.0],
	}),
	defaultFill: (id) =>
	({	op: 'fill',
		id: id,
		color: painter.context.colorDefault,
		alpha: painter.context.alphaDefault,
		thickness: 1,
		offset: [0.0,0.0],
	}),

	defaultShader: () =>
	({
		type: 'texture',
		speed: 1.0,
	}),

 // 
	launchCanvasRenderer: () =>
		new Promise( (resolve,reject) => setTimeout( resolve, 100))
		.then( () => 
		{	
		 // check prerequisites
			if(!resources.scripts.size)
				throw "a script needs to be loaded first.";

			if(!resources.requirementsMet())
			{// show short info whats missing
				console.log( "resources.requiredFiles", new Map( resources.requiredFiles) );
				throw "required files needs to be loaded<BR>OR<BR>a file isn't accepted by this browser.";
			}
			
		 // fixate ThreeJS canvas size in browserwindow
			//window.removeEventListener( 'resize', events.resizeEvent );

			return sleep(100);
		} )
		.then( () => 
		{// go fullscreen
			hud.log("switch to Fullscreen...");
			return screen.toFullscreen();
		} )
		.then( () => 
		{
			return sleep(100);
		} )
		.then( () => 
		{
		 // align display, renderer & canvas sizes
			screen.resizeRendererToDisplaySize();
			console.log("screen resize applied.");

		 // collect complete script from hud arrangement
			const scriptNames = Array.from( document.querySelector('.script-field-area').children )
			  .map( div => div.name );
			  
			const parseds = scriptNames.map( (name) => 
				resources.parsed.get( name ) );

			console.log("scriptNames", scriptNames);

		 // prepare parsed data for rendering process
		 // · scaling and font size calculation
			const expandeds = parseds.map( (parsed) => builder.expandParsedData( parsed ) );
			 
			if(!expandeds[0].expanded)
				throw "script expandParsedData FAILED!";

			const renderData = expandeds.map( (e) => e.expanded ).flat();
			const charCount = expandeds.reduce( (a, e) => a + e.charCount, 0 );

		 // render - (re)fill runtime units
			return builder.asyncRender( renderData, charCount );
		} )
		.catch( (error) =>
		{
			hud.logError( `${error}` );
			console.error( `-> ${error.fileName ? error.fileName : ""} ${error.lineNumber ? "line "+error.lineNumber : ""}` );
			throw error;
		} ),

	syncRender: ( renderData, charCount ) =>
		new Promise( (resolve) =>
		{
		 // (re)fill runtime units
			resources.runtimeUnits = [];

		 // highlight start field
			const div = document.querySelector( 'div.start' );
			const prog = document.querySelector( 'div.start .button-text' );

		 // time-consuming js canvas rendering
			for(const progress of builder.renderIter( renderData, charCount ))
			{	hud.setFieldProgress( div, progress );
				prog.innerHTML = `<p>${progress}</p>`;
			}
			
			resolve(); 
		} ),
		
	asyncRender: async ( renderData, charCount ) =>
	{
	 // (re)fill runtime units
		resources.runtimeUnits = [];

	 // highlight start field
		const div = document.querySelector( 'div.start' );
		const prog = document.querySelector( 'div.start .button-text' );

	 // time-consuming js canvas rendering
		for(const progress of builder.renderIter( renderData, charCount ))
		{
			hud.setFieldProgress( div, progress );
			prog.innerHTML = `<p>${progress}</p>`;
			await sleep( 50 );
		}
	},

 // convert sizes to pixels
	empx: ( value, fontSize=painter.context.fontSize ) => value * painter.textCanvasCtx.measureText( 'M' ).width,
	expx: ( value, fontSize=painter.context.fontSize ) => value * painter.textCanvasCtx.measureText( 'X' ).width,

	resolveUnit : ( value, defaultUnit ) =>
	{	const [num,mes] = splitMeasurement( value );
		console.log( "resolveUnit", [num, mes], defaultUnit );
		switch( mes || defaultUnit || 'px')
		{ 	case 'px': 	return num;
		 	case 'pt': 	return num * 1.3333;
			case 'in': 	return num * screen.inpx;
			case 'cm': 	return num * screen.cmpx;
			case 'mm': 	return num * screen.cmpx / 10;
			case 'ex':  return builder.expx( num );
			case 'em': 	return builder.empx( num );
			case '%': 	return num * screen.height / 100;
			case 'vh': 	return num * screen.height / 100;
			case 'vw': 	return num * screen.width / 100;
			case 'vmin':
				return num * (screen.height < screen.width ? screen.height : screen.width) / 100;
			case 'vmax':
				return num * (screen.height > screen.width ? screen.height : screen.width) / 100;
		}
		return num;
	},

	resolveVelocity : ( value ) => builder.resolveUnit( value, 'vmin' ),
	resolveSize : ( value ) => builder.resolveUnit( value, 'em' ),
	resolveBlurSize : ( value ) => builder.blurSizeLimit( builder.resolveUnit( value, 'em' ) ),
	resolveBackgroundSize : ( value ) => builder.resolveUnit( value, 'vmin' ),
	resolveThickness : ( value ) => builder.thicknessLimit( builder.resolveUnit( value, 'pt' ) ),
	resolveOffset: ( ra, defaultUnit ) => ra.map( (value) => builder.resolveUnit( value, defaultUnit ) ),
			
	resolveBackgroundScale: ( value, scaleBase ) =>
	{	const [num,mes] = splitMeasurement( value );
		console.log( "resolveBackgroundScale", [num, mes] );
		switch( mes )
		{ 	case 'abs':	return num;
			case 'vw': 	return num * screen.width / 100;
			case 'vh': 	return num * screen.height / 100;
			case '%':	return num * scaleBase / 100;
			default:	return num * scaleBase;
		}
	},

 // size limitations to prevent hangups while rendering
	thicknessLimit: ( value ) => Math.min( value, builder.empx(1) ),
	blurSizeLimit: ( value ) => Math.min( value, screen.width + screen.height),

 // resolve user input values
	resolveMarginValue( value )
	{	if(	value == undefined || isNaN(value) ) return NaN;
		return value>1 ? value/100 : value;
	},

	resolveMargin( value, unitResolve=parseFloat )
	{
		const resolveValue = builder.resolveMarginValue;
		
		let margin = [NaN,NaN,NaN,NaN];

		const resolveArray = ( ra ) =>
		{	switch( ra.length )
			{ case 1:
				margin[0] = margin[1] = margin[2] = margin[3] = resolveValue( ra[0] );
				break;

			  case 2:
				margin[3] = resolveValue( ra[0] );
				margin[1] = resolveValue( ra[1] );
				break;

			  case 4:
				margin = ra.map( (e) => resolveValue(e) );
				break;
			}

			if( margin[3] + margin[1] > 1. )
			{	margin[3] = 1 - margin[1];
				margin[1] = 1 - margin[3];
			}
			
			if( 1 - margin[3] - margin[1] == 0 )
				margin[3] = margin[1] = NaN;
		};

		if(parseFloat( value ))
			margin[0] = margin[1] = margin[2] = margin[3] = resolveValue( unitResolve(value) );

		if( value instanceof Array ) resolveArray( value.map((v) => unitResolve(v)) );

		return margin;
	},		

	isEnvelope( value )
	{// check for value being a 2-dim Array with Envelope values
		if(value instanceof Array)
			if( value.find( (e) => 
			{	if( e instanceof Array )
					return !isNaN(parseFloat(e[0]));
				else 
					return false;
			} ) )
				return true;
		return false;
	},

	resolveEnvElement( elem, resolveValue=parseFloat )
	{// resolve Element of parsed envelope
		if( elem instanceof Array )
		{	const {strings, numbers} = splitTypes( elem );
			numbers[0] = resolveValue( numbers[0] );
			return numbers.concat( strings.map( (s) => s.toLowerCase() ) );
		}

		if( !isNaN( parseFloat(elem) ) ) return [0.0,resolveValue( elem )];
		if( typeof(elem) == "string" ) return [elem];
		
	},

	resolveFade( value, defaultWait = 'word', unitResolve=parseFloat )
	{// · returns envelope [[value, timespan, mode (sin|linear|sin2)],...]
		const envData = (env) => ({	startValue: 0.,
									envelope: env, 
									onValue: runtime.planeOpacity	});
									
	 // if envelope ...
		if( builder.isEnvelope( value ) )
		 // resolve as 2-dim array
			return envData( value.map( (elem) => builder.resolveEnvElement( elem, unitResolve ) ) );

		if(value instanceof Array)
		{// short definition
			let { strings, numbers } = splitTypes( value );
			numbers = numbers.map( (n) => unitResolve( n ) );
			const wait = strings[0] ? strings[0].toLowerCase() : undefined;
			switch(numbers.length)
			{ case 1:
				return envData( [	[1.0, numbers[0]],
									[wait || defaultWait],
									[0.0, numbers[0]],	] );

			  case 2: // Attack Release
				return envData( [	[1.0, numbers[0]],
									[wait || defaultWait],
									[0.0, numbers[1]],	] );
							
			  case 3: // Attack Hold Release
				return envData( [	[1.0, numbers[0]],
									[1.0, numbers[1]],
									[wait || defaultWait],
									[0.0, numbers[2]],	] );
			  case 4: // Decay Attack Hold Release
				return envData( [	[0.0, numbers[0]],
									[1.0, numbers[1]],
									[wait || defaultWait],
									[1.0, numbers[2]],
									[0.0, numbers[3]],	] );
			  default:
				const n = unitResolve(numbers[0]);
				if(n) return envData( [	[1.0, n],
										[wait || defaultWait],
										[0.0, n],	] );
		}	}

		const v = unitResolve( value );
		return envData( [	[1.0, v],
							[defaultWait],
							[0.0, v],	] );
	},

	resolveDrift( plane, value, assignment, assignmentDelta, resolveSize=parseFloat, resolveVelocity=parseFloat )
	{// resolve drift value, return a plane.performances[] entry for runtime
		const { PLANE_DRIFT_CONST, PLANE_DRIFT_VAR, PLANE_DRIFT_FNC, PLANE_DRIFT_ENV } = defaults;

		if(!plane.drifts) plane.drifts = new Array( 5 );
		
		const driftPush = ( type, e ) =>
		{
			if( plane.drifts[ type ] )
				plane.drifts[ type ].push(e);
			else
				plane.drifts[ type ] = [e];
		};
		
	// if envelope ...
		if( builder.isEnvelope( value ) )
		 // resolve as 2-dim array
			driftPush( PLANE_DRIFT_ENV,
				{	startValue: 0.,
					envelope: value.map( (elem) => builder.resolveEnvElement( elem, resolveSize ) ),
					onValue: assignment
				} );

		if(value instanceof Array)
		{// resolve shorter envelope definition
			const { strings, numbers } = splitTypes( value );
			if( !strings ) return undefined;

			switch( strings[0] )
			{ case 'sin':
				{
					const freq = parseFloat( numbers[0] ) || 1.; // Hz
					const alt = resolveSize( numbers[1] ) || painter.empx(1);
					driftPush( PLANE_DRIFT_VAR, [
						() => Math.sin( runtime.timeSeconds * freq * Math.PI ) * alt, assignment ] );
				}
				break;
			  case 'cos':
				{
					const freq = parseFloat( numbers[0] ) || 1.; // Hz
					const alt = resolveSize( numbers[1] ) || painter.empx(1);
					driftPush( PLANE_DRIFT_VAR, [
						() => Math.cos( runtime.timeSeconds * freq * Math.PI ) * alt, assignment ] );
				}
				break;
			  case 'saw':
				{
					const freq = parseFloat( numbers[0] ) || 1.;
					const alt = resolveSize( numbers[1] ) || painter.empx(1);
					driftPush( PLANE_DRIFT_VAR, [
						() => ((runtime.time * freq % 1000)/500-1.) * alt, assignment ] );
				}
				break;
			  case 'tri':
				{
					const freq = parseFloat( numbers[0] ) || 1.;
					const alt = resolveSize( numbers[1] ) || painter.empx(1);
					driftPush( PLANE_DRIFT_VAR, [
						() => alt * (Math.abs((runtime.time * freq % 1000)/250-2.)-1.), assignment ] );
				}
				break;
			  case 'random':
			  case 'rand':
			  case 'rnd':
				{
					const max = resolveSize( numbers[0] ) || painter.empx(1);
					driftPush( PLANE_DRIFT_VAR, [
						() => 2*max*Math.random()-max, assignment ] );
				}
				break;
			  case 'exp':
				{
					const pow = parseFloat( numbers[0] ) || 2;
					const base = resolveSize( numbers[1] ) || 0;
					driftPush( PLANE_DRIFT_FNC, [
						[ 0, (time) => base + Math.exp( (runtime.time - time) * pow / 1000 ) - 1. ], assignment ] );
				}
				break;
			  case 'pow':
				{
					const pow = parseFloat( numbers[0] ) || 2;
					const base = resolveSize( numbers[1] ) || 0;
					driftPush( PLANE_DRIFT_FNC, [
						[ 0, (time) => base + Math.pow( (runtime.time - time) / 1000, pow )], assignment ] );
				}
				break;
			}
			return;
		}

	 // resolve constant drift
		if( parseFloat(value) )
			driftPush( PLANE_DRIFT_CONST, [ resolveVelocity( value ), assignmentDelta ] );
	},

 // 
	expandParsedData( parsed )
	{
		const { resolveSize, resolveScale } = builder;
		const contentSpan = ( marginLeft, marginRight ) => screen.width * (1.0 - marginLeft - marginRight);

	 // count phrases for rendering progress bar
		let charCount = 0;

	 // STEP 0
	 // · expand flattened parsed data into a more useful form to work with
	 // · escape positionals, scales and fonts for further processing
		const enriched = parsed.map( (e) =>
		{
		 // look for specific key in command block 
			const onEntry = ( key, resolve ) =>
			{	const entry = e.find( ([k,v]) => k == key );
				if(entry) resolve( entry );
			};

		 // translate 
			let item = {};

			if( e instanceof Array ) // command blocks (style, image, array)
			{// throw error on empty blocks
				if(!e.length)
				{	hud.logError("BPF! Empty Command Array in parsed data");
					return;
				}

			 // type always first entry
				const type = e[0][1];

				switch( type )
				{ case 'array':
					if( e[1][0] != 'array' )
					{	hud.logError("BPF! array block without Array in parsed data");
						return;
					}

					item.type = 'array';
					item.array = e[1][1];

				 // escape stuff needed for phrase positioning
					{	const { strings, numbers } = splitTypes( item.array );
						
						if( numbers.length == 1 )
							item.scale = parseFloat( numbers[0] ) || 1.;
						if( numbers.length == 2 )
						{	item.offsetX = numbers[0] || 0.;
							item.offsetY = numbers[1] || 0.;
						}
						
						strings.forEach( (e) =>
						{	const attr = e.toLowerCase();
							if( ['left', 'right'].includes( attr ) )
								item.alignX = attr;
							if( ['top', 'bottom'].includes( attr ) )
								item.alignY = attr;
						} );

						if( strings[0]=='center' )
							item.alignX = 'center';
						if( strings[1]=='center' )
							item.alignY = 'center';
					}
					
					break;
					
				  case 'style':
					item.type = 'style';
					item.commands = e.slice(1);

				 // escape name entry
					onEntry( 'name', ( [key,value] ) =>
						item.name = value );

				 // escape entries needed for phrase placement
					onEntry( 'font', ( [key,value] ) => item.font = removePath( value ) );
						
					onEntry( 'offset', ( [key,value] ) =>
					{	if( value.length == 2 )
						{	item.offsetX = value[0] || 0.;
							item.offsetY = value[1] || 0.;
					}	});

				 // escape scale entry
					onEntry( 'scale', ( [key,value] ) => item.scale = parseFloat( value ) || 1. );
					
					onEntry( 'alignx', ( [key,value] ) =>
					{	if( ['left', 'right'].includes( v ) )
							item.alignX = v;
					} );
					onEntry( 'aligny', ( [key,value] ) => 
					{	if( ['top', 'bottom'].includes( v ) )
							item.alignY = v;
					} );
					onEntry( 'align', ( [key,value] ) =>
					{	const a = ( v ) =>
						{	if( ['left', 'right'].includes( v ) )
								item.alignX = v;
							if( ['top', 'bottom'].includes( v ) )
								item.alignY = v;
						};

						if( value instanceof Array )
						{	if( value[0] == 'center' )
								item.alignX = 'center';
							if( value[1] == 'center' )
								item.alignY = 'center';
							value.forEach( e => a(e) );
						}
						else
						{	if( value == 'center' )
								item.alignY = item.alignX = 'center';
							a( value );
						}
					} );

				 // escape margins
					onEntry( 'margin', ( [key,value] ) =>
					{	const margin = builder.resolveMargin( value );
						if( !isNaN(margin[0]) ) item.marginTop 		= margin[0];
						if( !isNaN(margin[1]) ) item.marginRight 	= margin[1];
						if( !isNaN(margin[2]) ) item.marginBottom 	= margin[2];
						if( !isNaN(margin[3]) ) item.marginLeft 	= margin[3];
					} );

					onEntry( 'margintop', ( [key,value] ) =>
						item.marginTop = builder.resolveMarginValue( value ) );
					onEntry( 'marginright', ( [key,value] ) =>
						item.marginRight = builder.resolveMarginValue( value ) );
					onEntry( 'marginbottom', ( [key,value] ) =>
						item.marginBottom = builder.resolveMarginValue( value ) );
					onEntry( 'marginleft', ( [key,value] ) =>
						item.marginLeft = builder.resolveMarginValue( value ) );

				 // escape linespacing
					onEntry( 'linespacing', ( [key,value] ) => item.lineSpacing = parseInt( value ) || 0 );

					break;

				  case 'image':
					item.type = 'image';
					item.commands = e.slice(1);
					break;
				}
				return item;
			}

		 // e typeof string
			switch (true)
			{ case e == "$<LF>": // linefeed
				item.type = 'linefeed';
				item.skip = false;
				break;
				
			  case e == "$<NPS>": // newpage with font size
				item.type = 'newpage';
				item.height = 0;
				item.fontSize = defaults.FONT_SIZE;
				break;
				
			  case e == "$<NP>": // newpage
				item.type = 'newpage';
				item.height = 0;
				break;
				
			  case e.startsWith("$<SPACE>"):
				item.type = 'space';
				item.text = e.substring(8);
				break;
				
			  case e == "$<TAB>":
				item.type = 'space';
				item.text = "    ";
				break;
				
			  case e == "$<CUT>": // key separator without space
				item.type = 'cut';
				break;
				
			  default:
			 // phrase
				item.type = 'phrase';
				item.text = e
					.replace( /(?:\\\[)/g, '[')
					.replace( /(?:\\\])/g, ']')
					.replace( /(?:\\\{)/g, '{')
					.replace( /(?:\\\})/g, '}')
					.replace( /(?:\\\<)/g, '<')
					.replace( /(?:\\\>)/g, '>');
				charCount += item.text.length;
				break;			
			}
			return item;
		});
	
	 // update data in steps
		let step1, step2, step3, expanded;

	 // STEP 1
	 // · font size scale on newpage and style
	 // · line width and height calculation
	 // · mark linefeeds after command blocks to ignore
		{
			let fontFamily = defaults.FONT;
			let fontSize = defaults.FONT_SIZE;

			const ctx = painter.textCanvasCtx;
			ctx.font = painter.setFont( fontFamily, fontSize );

		 // append a newpage at script start
			const startPage =
			{	type: 'newpage',
				height: 0,
				fontSize: defaults.FONT_SIZE, // font width measurement done on a huge size at start
				scriptStart: true,
			};

			let actualLine =
			{	type: 'linefeed',
				width: 0,
				height: 0,
				//ignore: false,
				skip: true,
			};

			let names = new Map();
			
			step1 = [startPage, actualLine, ...enriched].map( (e) =>
			{	
				switch( e.type )
				{ case 'style':
				  case 'array':
					if( e.font )
					{
						if( resources.fonts.get( e.font ) )
							e.font = fontFamily = resources.fonts.get( e.font );
						else
						{	hud.logError(`BPF font ${e.font} not loaded!`);
							return;
						}

						if( e.name )
							names.set( e.name, [e.font, e.scale] );
					}
					if( e.name )
						if( names.has( e.name ) )
						{	const [font, scale] = names.get( e.name );
							fontFamily = font;
							if( scale )
								e.fontSize = fontSize = defaults.FONT_SIZE * scale;
						}

					if( e.scale )
						e.fontSize = fontSize = defaults.FONT_SIZE * e.scale;

					painter.setFont( fontFamily, fontSize );
					return e;

				  case 'linefeed':
					if( !actualLine.height )
					 // give empty lines a height so they have a positional effect
						actualLine.height = fontSize;
					
					actualLine = e;
					e.width = 0;
					e.height = 0;
					return e;

				  case 'phrase':
				  case 'space':
					{	
						const measure = ctx.measureText( e.text );//.width;
						e.width = measure.width;
						e.heightAscent = measure.emHeightAscend;
						e.heightDescent = measure.emHeightDescend;
					}
					actualLine.width += e.width;
					actualLine.height = fontSize>actualLine.height ? fontSize : actualLine.height;
					return e;
					
				  default:
					return e;		
			}	} )
			.map( (e,i,a) =>
			{	
				if(['style', 'image', 'array', 'newpage'].includes(e.type))
					if( a[i+1] )
						if( a[i+1].type == 'linefeed' ) a[i+1].skip = true;
				return e;
			} );

		}
		console.log("STEP1 #", [...step1] );
		
	 // STEP 2
	 // · content width per line / maximum line width
	 // · calculate page height's for newpages
		{
			let contentWidth = contentSpan( defaults.MARGIN, defaults.MARGIN );
			let actualScale;
			
			step2 = step1.map( (e) =>
			{
				switch( e.type )
				{
				  case 'style':
					if( e.marginLeft )
						contentWidth = contentSpan( e.marginLeft, e.marginRight );
					return e;
					
				  case 'linefeed':
					if( e.width>0 )
					{	const div = contentWidth / e.width;
						actualScale.sizeDiv = div<actualScale.sizeDiv ? div : actualScale.sizeDiv;
					}
					return e;
//have style.margin behave as NPS					
				  case 'newpage':
					if( e.fontSize ) // <NPS> newpage with font rescale to fit screen
					{	e.sizeDiv = 2.;
						actualScale = e;
					}
					return e;
					
				  default:
					return e;
			}	} );
		}		
		console.log("STEP2 #", [...step2] );
		
	 // STEP 3
	 // · font Size fit screen accoding to margins and scales
	 // · measure block height's - newpage and alignY changes mark blocks
	 // · phrase positioning
		{
			let sizeDiv = 1.;
			let actualBlock;
			let lineSpacing = 0;

			step3 = step2.map( (e) =>
			{	if( e.sizeDiv ) sizeDiv = e.sizeDiv;

				if( e.fontSize ) e.fontSize = e.fontSize * sizeDiv | 0;
				if( e.width ) e.width = e.width * sizeDiv | 0;
				if( e.height ) e.height = e.height * sizeDiv | 0;
				if( e.lineSpacing ) lineSpacing = e.lineSpacing;

				if( e.alignY )
					actualBlock = e;
				
				switch( e.type )
				{
				  case 'newpage':
					actualBlock = e;
					return e;

				  case 'linefeed':
					if( !e.skip )
					{
						if(actualBlock.textSpan === undefined)
							actualBlock.textSpan = 0;
						else
							actualBlock.textSpan += e.height + lineSpacing;
	
					}
					return e;

				  default:
					return e;
			}	} );
		}
		console.log("STEP3 #", step3.concat() );
		
	 // STEP 4
	 // · phrase positioning
		{	
			let
				px = 0.0,
				py = 0.0,
				ls = 0,
				fs = 384,
				font = defaults.FONT,
				lh = 0,
				ax = 'center',
				ay = 'center',
				ox = 0,
				oy = 0,
				mTop = defaults.MARGIN,
				mRight = defaults.MARGIN,
				mBottom = defaults.MARGIN,
				mLeft = defaults.MARGIN;

		 // tools
			const
				contentLeft =   () => (-screen.width/2  * (1.0 - mLeft*2)   )|0,
				contentRight =  () => (screen.width/2   * (1.0 - mRight*2)  )|0,
				contentTop =    () => (-screen.height/2 * (1.0 - mTop*2)    )|0,
				contentBottom = () => (screen.height/2  * (1.0 - mBottom*2) )|0;

			expanded = step3.map( (e) =>
			{
				ls = e.lineSpacing || ls;
				fs = e.fontSize    || fs;
				font = e.font      || font;
					
				if(e.font || e.fontSize)
					painter.setFont( font, fs );

				ax = e.alignX || ax;
				ay = e.alignY || ay;

				if( e.offsetX ) ox = resolveSize( e.offsetX );
				if( e.offsetY ) oy = resolveSize( e.offsetY );

				mTop	= e.marginTop    || mTop;
				mRight	= e.marginRight  || mRight;
				mBottom = e.marginBottom || mBottom;
				mLeft 	= e.marginLeft   || mLeft;

				switch( e.type )
				{
				  case 'style':
				  case 'array':
				  case 'newpage':
					if( e.textSpan !== undefined )
					{	switch( ay )
						{ case 'top':
							py = contentTop() + lh/2 |0;
							 break;
							
						  case 'bottom':
							py = contentBottom() - e.textSpan - lh/2 |0;
							break;

						  case 'center':
							py = -e.textSpan/2 |0;
							break;
						}
					}
					return e;
				  
				  case 'linefeed':
					lh = e.height || lh;
					
					if( !e.skip )
					{	
						py += lh + ls;
					}
					
					if( e.width )
					{	switch( ax )
						{ case 'left':
							px = contentLeft();
							break;

						  case 'right':
							px = contentRight() - e.width;
							break;
							
						  default:
							px = -e.width / 2 |0;
							break;
						}
					}
					return e;

				  case 'phrase':
					e.phraseX = px + ox + e.width/2 |0;
					e.phraseY = -py - oy;// + lh/2 |0;
				  case 'space':
					px += e.width;
				  default:
					return e;
				}
			} );
		}
				
		return { expanded: expanded, charCount: charCount };
	},

	renderIter: function*( expanded, charCount )
	// render enriched parsed data on canvas
	// prepare phrases & images as Planes in THREEjs
	// yield back progress
	{// extract phrase count for progress-bar
		if( (parseInt(charCount) == NaN) || (!expanded) )
		{	hud.logError(`script rendering data missing!`)
			console.error(`renderIter( ${charCount}`, expanded );
			throw `BPF script rendering data missing!`;
		}

		let progressCount = 0;
		let progress = "0%";

		yield progress;

		let con = painter.context;
			
	 // iterate through the parsed script
		for(const e of expanded)
		{
			if( e.scriptStart )
			{	painter.resetContext();
				con = painter.context;
			}
			
			if( e.font )
				con.fontFamily = e.font;	
				
			if( e.fontSize )
				con.fontSize = e.fontSize;

		 //
			switch( e.type )
			{ case 'style': // {} block
				builder.applyStyleDefinitions( e.commands );
				continue;
				
			  case 'image':	// <> block
				builder.applyBackgroundDefinitions( e.commands );
				continue;
				
			  case 'array': // [] block
				if(!e.array) hud.logError("BPF array doesn't contain [] block!");
				continue;

			  case 'linefeed':
				if( !e.skip )
					resources.runtimeUnits.push( { mode: 'line' } );
				continue;
				
			  case 'newpage':
				resources.runtimeUnits.push( { mode: 'page' } );
				continue;
								
			  case 'phrase':
			 // paint mesh texture on canvas, the time consuming part
				hud.log(`rendering phrase "${e.text}"`);
				painter.renderPhrase( e );
				
			 // update progress
				progressCount += e.text.length;
				progress = ""+Math.round( progressCount/charCount * 100 )+"%";
				yield progress;
				continue;
			}
		}
	 // end runtime
		return "100%";
	},
	
	applyStyleDefinitions( def )
	{// execute style definitions
		painter.context.idCounter = {};
		def.forEach( painter.defStyleRender ); // updateStyles ?
	},
	
	applyBackgroundDefinitions( def )
	{
		const { PLANE_DRIFT_CONST, PLANE_DRIFT_VAR, PLANE_DRIFT_FNC, PLANE_DRIFT_ENV } = defaults;
		const con = painter.context;
	
		const newImage = def.some( ([k,v]) => ['image', 'src', 'file'].includes( k ) );
		const change = def.some( ([k,v]) => ['lighten', 'cta', 'dim'].includes( k ) );

		if( newImage )
		 // a new is displayed image instead of the actual one changed.
			painter.resetBackground();
		
	 // collect definitions
		def.forEach( painter.defBackgroundRender );
		
	 // position & scale plane
		const back = con.background;

		if( newImage || change )
		{// apply effects
			painter.renderImageAsCanvas( back );

		 // build mesh
			const { scaleBase, offset, dim, canvas, shader, blending } = back;
			const id = canvas.getContext('2d')
				.getImageData( 0, 0, canvas.width, canvas.height );

			let mesh;
			if( shader )
				mesh = screen.asShaderPlane( id, shader );
			else 
				mesh = screen.asPlane( id );

			mesh = screen.asPlane( canvas );
			mesh.material.opacity = 0.;

			back.x = offset ? offset[0] : 0.;
			back.y = offset ? offset[1] : 0.;
			mesh.position.set( back.x, back.y, -1. );
			
			if( !back.scale ) back.scale = scaleBase;
			mesh.scale.set( back.scale, back.scale, 1. );

			if( blending )
			{
				mesh.material.blending = blending.blending;
				if( blending.blendEquation )
				{	mesh.material.blendEquation = blending.blendEquation;
					mesh.material.blendSrc = blending.blendSrc;
					mesh.material.blendDst = blending.blendDst;
				}
			}	
			
			back.mesh = mesh;
			screen.scene.add( back.mesh );			
		}
		else
			back.change = true;

	 // add background as plane into runtime
	 // · sometimes add an already running plane, inducing some changes to it in runtime.startUnit
		resources.runtimeUnits.push( { mode: 'image', planes: [ builder.asRuntimePlane( back ) ] } );

	 // keep data
		con.background = back;
	},

	asRuntimePlane( data )
	{// place an objects .fade an .drifts into an .performances array for runtime use
		const { PLANE_FADE, PLANE_DRIFT_CONST, PLANE_DRIFT_VAR, PLANE_DRIFT_FNC, PLANE_DRIFT_ENV } = defaults;
		const perf = [];

	 // fade as Envelope
		perf[ PLANE_FADE ] = new Envelope({ ...data.fade, target: data });

	 // drifts prepared as different ways of calculation
		if( data.drifts )
		{	
			if( data.drifts[ PLANE_DRIFT_CONST ] )
				perf[ PLANE_DRIFT_CONST ] = [...data.drifts[ PLANE_DRIFT_CONST ]];
			if( data.drifts[ PLANE_DRIFT_VAR ] )
				perf[ PLANE_DRIFT_VAR ]   = [...data.drifts[ PLANE_DRIFT_VAR ]];
			if( data.drifts[ PLANE_DRIFT_FNC ] )
				perf[ PLANE_DRIFT_FNC ]   = [...data.drifts[ PLANE_DRIFT_FNC ]];
			if( data.drifts[ PLANE_DRIFT_ENV ] )
				perf[ PLANE_DRIFT_ENV ] = data.drifts[ PLANE_DRIFT_ENV ]
					.map( (env) => new Envelope({ ...env, target: data }) );
		}

		return { ...data,
			performances: perf,
			alpha: data.alpha || 1.,
			scale: 1.,
		};
	},
};

