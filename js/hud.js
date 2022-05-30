'use strict';

import { screen } from './screen.js';

export const hud =
{	fieldFontSize: 0,

	init()
	{// initialize hud and throw it on screen 
		hud.changeText( ".script-field-area", "" );
		hud.changeText( ".resource-field-area", "" );
		hud.changeText( ".info", "READY" );
		hud.logClear();
		hud.show( '.title' );
		hud.hide( '.stats' );
		hud.show( '.info' );
		hud.hide( '.hints' );
		hud.hide( '.stats' );
		
		hud.hide( '.start' );
	},

 //
	hide: ( div ) => document.querySelector( div ).style.visibility = "hidden",
	show: ( div ) => document.querySelector( div ).style.visibility = "visible",	
	toggle: ( div ) =>
	{	const tag = document.querySelector( div );
		if(tag.style.visibility == "visible") tag.style.visibility = "hidden";
		else tag.style.visibility = "visible";
	},
	
 // 
	changeText( sel, str )
	// change text in div block label
	{	const div = document.querySelector( sel )
		div.innerHTML = str;	},
	
 //
	logDebug( msg )
	{	document.querySelector(".logs").innerHTML += "<br><span style='color: #aaa'>"
			+(performance.now() |0)+" "+msg+"</span>"	
	},
	log( msg )
	{	console.log("HUD", msg);
		document.querySelector(".logs").innerHTML += "<br>"+msg;
	},
	logError( msg )
	{	document.querySelector(".logs").innerHTML += "<br><span style='color: red'>"+msg+"</span>";
		console.error(msg);
		document.querySelector(".info").innerHTML = "<br><span style='color: red'>"+msg+"</span>";
	},
	logBPF( msg )
	{	document.querySelector(".logs").innerHTML += "<br><span style='color: red'>BPF -&gt; "+msg+"</span>";
		console.error(msg);
	},
	logInfo( msg )
	{	document.querySelector(".logs").innerHTML += "<br><span style='color: #dfd'>"+msg+"</span>";
		document.querySelector(".info").innerHTML = msg;
	},
	logSuccess( msg )
	{	document.querySelector(".logs").innerHTML += "<br><span style='color: green'>"+msg+"</span>";},
	logSpecial( msg )
	{	document.querySelector(".logs").innerHTML += "<br><span style='color: #b4f'>"+msg+"</span>";	},
	logClear( msg )
	{	document.querySelector(".logs").innerHTML = "";	},

	info( msg )
	{	document.querySelector(".info").innerHTML = msg;	},

	infoFontDisplay( fontName )
	{
		document.querySelector(".info").innerHTML = `
		<span style="font-family: '${fontName}'; font-size: 32px">
		${fontName}<br>AaBbCcDdEeFfGghHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ0123456789
		</span>`;
	},

	displayScreensizes()
	// gives screen sizes in log panel
	{	const canvas = screen.renderer.domElement;

		[ `RENDERER * ${canvas.width} x ${canvas.height}`, 
		  `WINDOW * ${window.width} x ${window.height}`, 
		  `DOCBODY * ${document.body.width} x ${document.body.height}`, 
		  `DOCBODY offset* ${document.body.offsetWidth} x ${document.body.offsetHeight}`, 
		  `DOCBODY scroll* ${document.body.scrollWidth} x ${document.body.scrollHeight}`, 
		  `DOCBODY client* ${document.body.clientWidth} x ${document.body.clientHeight}`, 
		  `screen ${screen.width} x ${screen.height}` ].forEach( (s) => 
		  	hud.logSpecial( s ) );
		 hud.show( '.logs' );
	},
	
	clearHints()
	{	const hints = document.querySelector( '.hints' );
		while( hints.firstChild ) 
			hints.removeChild( hints.firstChild );
	},
	
	displayKeyHint( key1, key2, description )
	{
		const hints = document.querySelector( '.hints' );
	
		if( key2 )
		{// display two keys	
			const div1 = document.createElement( 'div' );
			const div2 = document.createElement( 'div' );
			div1.className = 'key single';
			div2.className = 'key single';
			div1.innerHTML = key1;
			div2.innerHTML = key2;
			hints.appendChild( div1 );
			hints.appendChild( div2 );
		}
		else
		{// display one key
			const div1 = document.createElement( 'div' );
			div1.className = 'key double';
			div1.innerHTML = key1;
			hints.appendChild( div1 );
		}

		const div = document.createElement( 'div' );
		div.className = 'description';
		div.innerHTML = description;
		hints.appendChild( div );
	},			
			
	scriptField( name )
	{// return an already existing div
		const buttons = Array.from(
			document.querySelector(".script-field-area").children
		);
		const div = buttons.find( div => div.name == name )
	 // or a new
		return div || hud.newScriptField( name );
	},
	
	newScriptField( name )
	{	let divField = document.createElement("div");
		divField.className = "field";
		divField.name = name;
		let divProgress = document.createElement("div");
		divProgress.className = "progress";
		let divTouch = document.createElement("div");
		divTouch.className = "touch outstanding";
		divTouch.innerHTML = name;
			
		divField.appendChild( divTouch );
		divField.appendChild( divProgress );
		document.querySelector(".script-field-area").appendChild( divField );
		
	 // lower font size if text too big
		hud.fitBoxText( divTouch );
		return divField;
	},
	resourceField( name )
	{// look for an already existing div
		const fields = Array.from(
			document.querySelector(".resource-field-area").children
		);
		const div = fields.find( div => div.name == name );
		
	 // or make a new
		return div || hud.newResourceField( name );
	},
	newResourceField( name )
	{// create new resource div field
		let divField = document.createElement("div");
		divField.name = name;
		divField.className = "field";
		let divProgress = document.createElement("div");
		divProgress.className = "progress";
		divProgress.style.width = "0%";
		let divTouch = document.createElement("div");
		divTouch.className = "touch outstanding";
		divTouch.innerHTML = name;

		divField.appendChild( divTouch );
		divField.appendChild( divProgress );
		document.querySelector(".resource-field-area").appendChild( divField );

	 // lower font size if text too big
		hud.fitBoxText( divTouch );

	 // return div for fast access
		return divField;
	},
	setFieldProgress( div, progress )
	{	div.children[1].style.width = progress;	},

	setFieldState( div, state )
	{	div.children[0].classList = "touch "+state;	},

	removeField( div )
	{	hud.setFieldState( div, "fading" );
		div.children[1].remove();
		window.setTimeout( () => { div.remove(); }, 1777);
	},
	
	fitBoxText( div )
	{// get font style properties
		const style = getComputedStyle( div );

		if(!style["font-size"].endsWith("px"))
		{	console.error("hud.fitBoxText() can only handle px fonsizes!");
			return;	}
		if(!hud.fieldFontSize) hud.fieldFontSize = parseFloat(style["font-size"]);

		if(!style["width"].endsWith("px"))
		{	console.error("hud.fitBoxText() requires css width in px!");
			return;	}

	 // use css definition to measure text width in canvas
		let font = style["font-family"];
		let size = hud.fieldFontSize ;
		let text = div.innerText;
		let maxWidth = parseFloat(style["width"]);

	 // shrink textsize if necessary
		let measureTextWidth = ( font, size, text ) =>
		{// get font style properties
			const ctx = document.querySelector('.measuretext').getContext("2d");
			
			ctx.font = ""+ parseFloat(size) +"px "+ font;
			return ctx.measureText( text ).width;
		};
		
		let textWidth = measureTextWidth( font, size, text );
		if(textWidth < maxWidth) return;
		while(textWidth > maxWidth)
		{	size--;
			textWidth = measureTextWidth( font, size, text );	}
		div.style.fontSize = size;
		//console.log("shrinked font size to "+size);
	},
	highlightScreen(q)
	{	document.querySelector('div.screen').className = "screen highlight";	},
	unHighlightScreen()
	{	document.querySelector('div.screen').className = "screen";	},

	hudResize()
	{	for( const div of document.querySelector('.resource-field-area').children )
		{	hud.fitBoxText( div );	}
		for( const div of document.querySelector('.script-field-area').children )
		{	hud.fitBoxText( div );	}
	},
	hideHud()
	{	hud.hide( 'div.screen' );
		hud.hide( '.info' );
		hud.hide( '.stats' );
		hud.hide( '.framerate' );
		hud.hide( '.logs' );
		hud.hide( '.hints' );
	},

	hideAll()
	{	hud.hide( 'div.screen' );
		hud.hide( '.title' );
		hud.hide( '.resource-field-area' );
		hud.hide( '.script-field-area' );
		hud.hide( '.info' );
		hud.hide( '.stats' );
		hud.hide( '.framerate' );
		hud.hide( '.logs' );
		hud.hide( '.hints' );
		hud.hide( '.start');
	},

	resetHud()
	{
		hud.hideHud();

		hud.show( 'div.screen' );
		hud.show( '.title' );
		hud.show( '.resource-field-area' );
		hud.show( '.script-field-area' );
		hud.show( '.info' );

		hud.hide( '.framerate' );

		if( resoruces.requirementsMet() )
			hud.show('start');
		else
			hud.hide('start');
	},

	showTexturesCanvas( n )
	{	let div = document.querySelector('.imagecanvas');
		if (div.firstChild) div.removeChild( div.firstChild );
		
	 // just display the first one
		div.addChild( Object.entries(resources.cnvImageSeamless)[n||0][1] );
		hud.show( '.imagecanvas' );
	},

	showInsideImageDiv( element )
	{	let div = document.querySelector('.imagecanvas');
		while (div.firstChild) div.removeChild( div.lastChild );
		div.appendChild( element );
		hud.logSpecial( "showing imagecanvas with ", element );
	},

	openResourceSlot: ( name ) => hud.setFieldState( hud.resourceField( name ), "outstanding" ),
	resolveResourceSlot: ( name ) => hud.setFieldState( hud.resourceField( name ), "ready" ),
	removeResourceSlot: ( name ) => hud.removeField( hud.resourceField( name ) ),
	openScriptSlot: ( name ) => hud.setFieldState( hud.scriptField( name ), "outstanding" ),
	resolveScriptSlot: ( name ) => hud.setFieldState( hud.scriptField( name ), "ready" ),
	removeScriptSlot: ( name ) => hud.removeField( hud.scriptField( name ) ),
};
