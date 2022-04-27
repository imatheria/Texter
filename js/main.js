'use strict';

import * as defaults from './constants.js';

import { resources } from './resources.js';
import { builder } from './builder.js';
import { painter } from './painter.js';
import { runtime } from './runtime.js';
import { history } from './history.js';
import { screen } from './screen.js';
import { hud } from './hud.js';

import { fetchTextfile, fetchImagefile, fontLoader, imageLoader } from './loaders.js';
import { removePath, fileType } from './tools.js';

import { vessel } from './lineblender.js';
import { stars, matrix } from './stars.js';

import { tests } from './tests.js';

export const start = () => { document.addEventListener("DOMContentLoaded", events.onLoad) };

export const events =
{	ctrlKey: false,
	shiftKey: false,
	resizeEvent: undefined,
	keyDownEvent: undefined,
	keyUpEvent: undefined,

	dontResize: false,
	
	onLoad()
	{// check requirements
		let errors = [];

	 // we need WebGL
		try
		{	const canvas = document.createElement( 'canvas' );
			if(!(window.WebGLRenderingContext&&(canvas.getContext( 'webgl' ))))
				errors.push("· WebGL not supported.");
		}
		catch ( e )
		{	errors.push("· WebGL not supported.");	}

	 // we need workers
		if ( !("Worker" in window) )
		{	errors.push("· Workers not supported.");	}

	 // we need to load fonts via javascript
		if ( !("fonts" in document) )
		{	errors.push("· Font loading not supported in javascript.");	}

	 // we need performance.now
		if ("performance" in window == false)
		{	errors.push("· performance.now() not supported.");	}

	 // stop if requirements not met
		if( errors.length )
		{	hud.logError( "Errors:\n" + errors.join("\n") );
			hud.logInfo( "\nTry another browser with ES6 support!" );
			return;	}

		screen.cmpx = document.querySelector(".measure-cm").offsetHeight;
		hud.log( `measured cm per px: ${screen.cmpx}` );
		screen.inpx = document.querySelector(".measure-in").offsetHeight;
		hud.log( `measured in per px: ${screen.inpx}` );
		
	 // initialize hud · resource div fields · logs
		hud.init();

 	 // load DEV notes
		fetchTextfile( defaults.DEV_NOTES )
		  .then( ( content ) =>
			{	const contentHtml = content
				 .replace( /(?:\r\n|\r|\n)/g, '<br>')
				 .replace( /(?:\t)/g, '&nbsp;  &nbsp;');

				hud.changeText( ".stats", "[DEVNOTES]<br>"+contentHtml );
				hud.log( "devnotes loaded!" );
			},
			( error ) => console.error( error )	);

	 // init js canvas rendering contexts - used to check font availibility
		builder.init();

	 // accept paste-event's - a shortcut for loading and starting scripts pasted into browserwindow
		document.addEventListener( 'paste', events.onPaste );
		hud.log( "paste listener activated!" );

	 // accept file drop into browserwindow
		document.addEventListener( 'drop', events.onDrop );
		document.addEventListener( 'dragenter', events.onDragEnter );
		document.addEventListener( 'dragexit', events.onDragExit );
		hud.log( "drop listener activated!" );

		['dragover', 'dragleave', 'dragenter', 'dragexit', 'drop', 'paste']
			.forEach( (eventName) =>
				document.addEventListener(eventName, events.preventDefaults, false) );

	 // activate keyboard events
		events.applyHudKeyEvents();
			 
	 // handle browserwindow resize events
		events.resizeEvent = window.addEventListener( 'resize', (e) => events.onScreenResize(e), false );

	 // init start button
		document.querySelector('.start').addEventListener( 'click', events.onStartButtonClick );
	 
	 // initalize THREEjs
		screen.initThreeRenderer();

	 // show stars
		stars.init();
		stars.show();

	 // check url string for scripts to load
		const urlScripts = (location || document.location || window.location).href.split('?')[1];
		if( !!urlScripts )
		{	hud.info( 'loading files...' );
			resources.asyncAutoLoad( urlScripts.split('&') );
		}
		else
			hud.info( 'drag & drop texter-files, images and fonts in here' );
	},

	applyHudKeyEvents()
	{
		document.removeEventListener( 'keydown', events.onKeyDownRuntime );
		document.removeEventListener( 'keyup', events.onKeyUpRuntime );
		document.removeEventListener( 'keydown', events.onKeyDownTesting );
		document.removeEventListener( 'keyup', events.onKeyUpTesting );
		document.addEventListener( 'keydown', events.onKeyDownHud );
		document.addEventListener( 'keyup', events.onKeyUpHud );
	},
	applyRuntimeKeyEvents()
	{
		document.removeEventListener( 'keydown', events.onKeyDownHud );
		document.removeEventListener( 'keyup', events.onKeyUpHud );
		document.removeEventListener( 'keydown', events.onKeyDownTesting );
		document.removeEventListener( 'keyup', events.onKeyUpTesting );
		document.addEventListener( 'keydown', events.onKeyDownRuntime );
		document.addEventListener( 'keyup', events.onKeyUpRuntime );
	},
	applyTestingKeyEvents()
	{
		hud.logSpecial( "Testing Mode" );
		document.removeEventListener( 'keydown', events.onKeyDownRuntime );
		document.removeEventListener( 'keyup', events.onKeyUpRuntime );
		document.removeEventListener( 'keydown', events.onKeyDownHud );
		document.removeEventListener( 'keyup', events.onKeyUpHud );
		document.addEventListener( 'keydown', events.onKeyDownTesting );
		document.addEventListener( 'keyup', events.onKeyUpTesting );
	},
	
	onScreenResize(e)
	{// adapt all the different elements to resized browser window
		if(!!screen.renderer) screen.resizeRendererToDisplaySize();
		hud.hudResize();
	},

	onKeyUpRuntime(event)
	{//
		if( event.key == 'Control' ) events.ctrlKey = false;
		if( event.key == 'Shift' ) events.shiftKey = false;
	},
	onKeyDownRuntime(event)
	{//
		if(event.repeat) return;

		switch( event.key )
		{ case 'Control':
			events.ctrlKey = true;
			return;

		  case 'Shift':
			events.shiftKey = true;
			return;
		};
		
		switch( event.code )
		{
		  case 'KeyC': // clear hud
			hud.hideHud();
			break;

		  case 'KeyF': // display framerate
			if( events.ctrlKey || events.ctrlKey )
			{	hud.toggle( '.framerate' );
				runtime.displayFpS = !runtime.displayFpS;
			}
			break;
			
		  case 'KeyH': // 
			console.log( [...history.events.concat] );
			break;
			
		  case 'KeyL': // show logs
			if( events.ctrlKey )
				hud.show( '.logs' );
			hud.log( runtime.time );
			break;
			
		  case 'KeyT': // go in testing mode
			if( events.shiftKey || events.ctrlKey )
			{
				hud.show( '.logs' );
				events.applyTestingKeyEvents();
				runtime.STOPP = true;
			 // show all phrases on scene
				resources.runtimeUnits.forEach( (unit) => 
				{	if( unit.planes ) unit.planes.forEach( (plane) =>
						plane.mesh.material.opacity = 1. )
				} );
				setTimeout( tests.run, 1000 );
			}
			break;
			
		  case 'ArrowRight':
		 // step forward
			history.pushCommand( 'word', 'forward' );
			runtime.forwardUntil( (unit) => unit.mode == 'word' );
			break;
			
		  case 'ArrowLeft':
		 // step backward
			history.pushCommand( 'word', 'back' );
			runtime.backwardUntil( (unit) => unit.mode == 'word' );
			break;
			
		  case 'ArrowUp':
		// step backward until previous "line"
			history.pushCommand( 'line', 'back' );
			runtime.backwardUntil( (unit) => unit.mode == 'word' );
			runtime.backwardUntil( (unit) => unit.mode == 'line' );
			break;
			
  		  case 'ArrowDown':
		// step forward until next "line"
			history.pushCommand( 'line', 'forward' );	
			runtime.forwardUntil( (unit) => unit.mode == 'word' );
			runtime.forwardUntil( (unit) => unit.mode == 'line' );
			break;

		  case 'Enter':			
  		  case 'Space':
		// step forward until next "line"
			history.pushCommand( 'visible', 'forward' );	
			runtime.forwardUntil( (unit) => (unit.mode == 'word')||(unit.mode == 'image') );
			break;
			
		  case 'PageUp':
		 // step backward until next "page"
			history.pushCommand( 'page', 'back' );
			runtime.backwardUntil( (unit) => unit.mode == 'page' );
			break;
			
  		  case 'PageDown':
		 // step forward until next "page"
			history.pushCommand( 'page', 'forward' );
			runtime.forwardUntil( (unit) => unit.mode == 'page' );
			break;

		  default:
			hud.log("KEYDOWN "+event.key+" "+event.code+" unused");
		}
	},
	onKeyUpHud(event)
	{//	
		if( event.key == 'Control' ) events.ctrlKey = false;
		if( event.key == 'Shift' ) events.shiftKey = false;
	},
	onKeyDownHud(event)
	{//	
		if(event.repeat) return;

		switch( event.key )
		{ case 'Control':
			events.ctrlKey = true;
			return;

		  case 'Shift':
			events.shiftKey = true;
			return;
		};

		switch( event.code )
		{ case 'Enter':
			hud.show( '.hints' );
			launchRenderer();
			break;
		
		  case 'Delete' :
		 // remove a script if hovered
			hod.logSpecial( 'KeyD - remove a script if hovered // will work soon' );
			break;
			
		  case 'KeyC':
			hud.hideHud();
			break;

		  case 'KeyD':
			hud.toggle( '.stats' );
			break;
				
		  case 'KeyH':
			hud.toggle( '.hints' );
			break;
				
		  case 'KeyL':
			hud.toggle( '.logs' );
			break;
			
		  case 'KeyS':
			if( stars.running )
				stars.hide();
			else
				stars.show();
			break;
			
		  case 'KeyT':
			hud.show( '.logs' );
			if( events.shiftKey || events.ctrlKey )
			{
				events.applyTestingKeyEvents();
				tests.run();
			}
			break;

		 // special features 'N eastereggs
		  case 'KeyI': // do some canvas testing with first loaded image
			{
				const i = [...resources.images.values()];
				const ctx = painter.textCanvasCtx;
				ctx.fillStyle = "#888888";
				ctx.fillRect( 50,50,100,100 );
				ctx.fillRect( 200,50,100,100 );

				ctx.globalCompositeOperation = "source-over";
				ctx.drawImage( i[0], 0,0,100,100, 50,50,100,100 );
				ctx.globalCompositeOperation = "lighter";
				ctx.drawImage( i[0], 0,0,100,100, 200,50,100,100 );
				hud.toggle( '.textcanvas' );
			}

			break;

		  case 'KeyW': // shader test
			vessel.shaderTexture();
			break;

		  case 'KeyK': // another way of displaying key hints
			break; // not finished
			hud.clearHints();
			hud.displayKeyHint( "&rarr;", "&larr;", "next / previous word" );
			hud.displayKeyHint( "&uarr;", "&darr;", "next / previous line" );
			hud.displayKeyHint( "PgUp", "PgDn", "next / previous page" );
			hud.displayKeyHint( "space", null, "next visible (phrase or image)" );
			break;

		  case 'KeyF': // just go fullscreen
			if(!document.fullscreenElement)
				screen.toFullscreen(
					() => hud.logSuccess( "Fullscreen mode" ),
					() => hud.logError( "Fullscreenmode FAILS in this browser!" ),
				);
			else
				screen.exitFullscreen();
			break;

		  case 'KeyM': // another shader test -> the matrix eye
			hud.hideHud();
			hud.hide( '.title' );
			stars.show();
			matrix.show();
			break;

		  case 'KeyR': // log required files (for debugging)
			hud.logSpecial(`resources.requiredFiles:`);
			resources.requiredFiles.forEach( (v,script) =>
				v.forEach( (src) => hud.log(`${script}: ${src}`) ) );
			break;
			
		  default:
			hud.log(event.code+" unused");
		}
	},
	onKeyUpTesting(event)
	{//
		hud.log(`KEY UP ${event.key} ${event.code}`);
		if( event.key == 'Control' ) events.ctrlKey = false;
		if( event.key == 'Shift' ) events.shiftKey = false;
	},
	onKeyDownTesting(event)
	{//
		if(event.repeat) return;
		hud.log(`KEY DOWN ${event.key} ${event.code}`);

		switch( event.key )
		{ case 'Control':
			events.ctrlKey = true;
			return;
		  case 'Shift':
			events.shiftKey = true;
			return;
		};
		
		switch( event.code )
		{
		  case 'KeyB': // show blur rendering canvas
			hud.toggle( '.blurcanvas' );
			break;

		  case 'KeyC':
			hud.hideHud();
			break;

		  case 'KeyD':
			hud.toggle( '.stats' );
			break;
				
		  case 'KeyE': // log out key-Events
			console.log("event-history:");
			console.table( history.events );
			break;

		  case 'KeyF':
			console.log("Font Measure Display", [...resources.fonts.values()]);
			{
				let y = 100;
				resources.fonts.forEach( (family, name) => 
				{	
					const ctx = painter.textCanvasCtx;

					ctx.font = painter.setFont( family, 100 );

					ctx.globalAlpha = 1.;

					const textbaseline = (text, base, x, y) =>
					{
						const measure = ctx.measureText( name );
						console.log("Font", ctx.font, "| boundary ascent,decent", [measure.actualBoundingBoxAscent, measure.actualBoundingBoxDescent] );
						
						ctx.strokeStyle = "#F44";
						ctx.beginPath();
						ctx.moveTo(x-100,y+measure.actualBoundingBoxAscent);
						ctx.lineTo(x+100,y+measure.actualBoundingBoxAscent);
						ctx.stroke();
						
						ctx.strokeStyle = "#4F4";
						ctx.beginPath();
						ctx.moveTo(x-100,y+measure.actualBoundingBoxDescent);
						ctx.lineTo(x+100,y+measure.actualBoundingBoxDescent);
						ctx.stroke();
						
						ctx.strokeStyle = "#FFF";
						ctx.beginPath();
						ctx.moveTo(x-100,y);
						ctx.lineTo(x+100,y);
						ctx.stroke();
						
						ctx.textBaseline = base;
						ctx.strokeText( text.substring(0,10), x, y );
					}
					
					textbaseline( name, "top", 400, y );
					textbaseline( name, "hanging", 1000, y );
					textbaseline( name, "middle", 1600, y );
					textbaseline( name, "alphabetic", 2200, y );
					textbaseline( name, "idiographic", 2800, y );
					textbaseline( name, "bottom", 3400, y );
					y += 300;
				} );
				
			}
			hud.hideHud();
			hud.show( '.textcanvas' );
			break;

		  case 'KeyH':
			hud.toggle( '.hints' );
			break;
				
		  case 'KeyI': // log loaded images and applied seamless textures
			hud.logSpecial(`resources.images:`);
			resources.images.forEach( (v,k) => hud.log(`${k}: ${v} [${v.width}:${v.height}]`) );
			hud.logSpecial(`resources.cnvSeamless:`);
			resources.cnvImageSeamless.forEach( (v,k) => hud.log(`${k}: ${typeof(v)} [${v.width}:${v.height}]`) );

			hud.toggle( '.imagecanvas' );
			break;
		 
		  case 'KeyL':
			hud.toggle( '.logs' );
			break;
			
		  case 'KeyP': // show phrase rendering canvas
			hud.toggle( '.textcanvas' );
			break;

		  case 'KeyR':
			console.log("REPLAY:");
			console.table( history.commands );
			break;
			
		  case 'KeyS':
			hud.displayScreensizes();
			if( stars.running )
				stars.hide();
			else
				stars.show();
			break;
			
		  case 'KeyT': // display a test plane
			hud.logSpecial("Test-Texture - check pixel alignment!");

			screen.testPlane();
			break;			
			
		  default:
			hud.log(event.code+" unused");
		}
	},
	
	onPaste(event)
	{	hud.log("events.onPaste");

	 // Stop data actually being pasted into div
		event.stopPropagation();

	 // Get pasted data from clipboard
		const clipboardData = event.clipboardData || window.clipboardData;
		const script = clipboardData.getData('Text');

		hud.log(`pasted text [${script.length} chars] '${script.substring(0,20)} ...'`);

		if(script.trim() == "") return;
		resources.stageScript( script, "&lt;pasted&gt;" );
	},
	
	onDrop( e )
	{	hud.log("events.onDrop()");

	 // handle dropped folders ?
		hud.unHighlightScreen();

	 // try to find dropped files in all corners 
		let filesToLoad = [];
		let items = e.dataTransfer.items;
		let files = e.dataTransfer.files;

		if(files) for( let file of files )
		{
			hud.log(`dropped file '${file.name}'`);
			filesToLoad.push( file );
		}
		// maybe unnecessary - look for files dropped as items
		if(items) for( let item of items )
		{	if(item.kind === 'file')
			{	let file = item.getAsFile();
				hud.log(`dropped file '${file.name}'`);
				if(!filesToLoad.includes(file))
					filesToLoad.push( file );
			}
			if(item.kind === 'string')
			{	item.getAsString( (s) =>
				{	if( s.trim() != '' )
					{	hud.log(`dropped script`);
						resources.stageScript( s, "&lt;dropped&gt;" );
					}
				} );
		}	}

	 // get data either as font, as image, as script or not at all
	 // · always reload stuff on drop
		filesToLoad.forEach( (file) =>
		{//
			const type = fileType( file.name );

			if(resources.acceptedImageFileTypes.includes( type ))
			{
				if( !resources.images.has( file.name ) )
					imageLoader.stageFile( file );
				return;
			}
			
			if(resources.acceptedFontFileTypes.includes( type ))
			{
				if( !resources.images.has( file.name ) )
				{	fontLoader.stageFile( file );
					setTimeout( () =>
					{// show font sample if successfully loaded 
						const font = resources.fonts.get( removePath(file.name) );
						if( font ) hud.infoFontDisplay( font );
					}, 500);
				}
				return;
			}
			
			if( file.size < defaults.SCRIPT_FILE_MAX )
				resources.stageScriptFromFile( file );
		} );
	},
	
	preventDefaults( event )
	{// prevent Browser' standard behaviour (don't open the file)
		event.preventDefault();
		event.stopPropagation();
	},
	
	onDragEnter: () => hud.highlightScreen(),
	onDragExit: () => hud.unHighlightScreen(),
	
	onStartButtonClick: () => 
	{	hud.show( '.hints' );
		launchRenderer();
	},
}

function launchRenderer()
{
	hud.info( 'rendering ...' );

	builder.launchCanvasRenderer()
	  .then( () =>
		{
			hud.info( 'READY' );
			stars.hide();

		 // hud -> runtime mode
			hud.hideAll();
			events.applyRuntimeKeyEvents();

		 // start runtime
			screen.applyOrthographicCamera();
			hud.logSpecial("runtime start");
			runtime.start( resources.runtimeUnits );
		} )
	  .catch( (error) => 
		{
			console.error( "Text Renderer Failure!", error );
		} );
}

