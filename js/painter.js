'use strict';

import * as defaults from './constants.js';

import * as THREE from '../three.js-master/build/three.module.js';

import { hud } from './hud.js';
import { resources } from './resources.js';
import { builder } from './builder.js';
import { runtime } from './runtime.js';
import { history } from './history.js';
import { screen } from './screen.js';

import { removePath } from './tools.js';

import { splitTypes } from './tools.js';

export const painter =
{	textCanvas: undefined,
	textCanvasCtx: undefined,
	textCanvasMaxSize: defaults.TEXT_CANVAS_MAX,
	
	blurCanvas: undefined,
	blurCanvasCtx: undefined,
	
 // canvas rendering adjustments
	defaultFont: defaults.FONT, // needs to be already loaded
	defaultFontSize: defaults.FONT_SIZE,

 // internal
	context: {},
	
	init() // : new Promise((resolve,reject) => 
	{// canvas for text rendering
		painter.textCanvas = document.createElement('canvas');
		painter.textCanvas.width	= painter.textCanvasMaxSize[0];
		painter.textCanvas.height	= painter.textCanvasMaxSize[1];

		painter.textCanvasCtx = painter.textCanvas.getContext('2d');
		document.querySelector('.textcanvas').appendChild( painter.textCanvas );

	 // canvas for blur rendering
		painter.blurCanvas = document.createElement('canvas');
		painter.blurCanvas.width	= painter.textCanvasMaxSize[0];
		painter.blurCanvas.height	= painter.textCanvasMaxSize[1];

		painter.blurCanvasCtx = painter.blurCanvas.getContext('2d');
		document.querySelector('.blurcanvas').appendChild( painter.blurCanvas );

	 // initialize canvas context
		const ctxText = painter.textCanvasCtx;
		ctxText.globalCompositeOperation = "source-over";
		ctxText.globalAlpha = 1;
		ctxText.filter = "none";
		ctxText.lineWidth = 1;
		ctxText.font = "12px Arial";
		ctxText.fillStyle = "#ffffff";
		ctxText.strokeStyle = "#ffffff";
		ctxText.textAlign = "center";
		ctxText.textBaseline = "middle";
	
		ctxText.shadowBlur = 0;
		ctxText.shadowColor = "rgba(0, 0, 0, 0)";
		ctxText.shadowOffsetX = 0;
		ctxText.shadowOffsetY = 0;

		const ctxBlur = painter.blurCanvasCtx;
		ctxBlur.globalCompositeOperation = "source-over";
		ctxBlur.globalAlpha = 1;
		ctxBlur.filter = "none";
		ctxBlur.lineWidth = 1;
		ctxBlur.font = "12px Arial";
		ctxBlur.fillStyle = "#ffffff";
		ctxBlur.strokeStyle = "#ffffff";
		ctxBlur.textAlign = "center";
		ctxBlur.textBaseline = "middle";
	},
	
 // resolve commands regarding canvas rendering
	resolveColor( value )
	{
		if( typeof(value) !== 'string' )
			return undefined;

		const parseHex = ( v ) => parseInt( '0x'+v );

		const c = value	.replace( /(?:\s)/g, '')
		if( c.startsWith( 'rgba(' ) )
		{	const rgba = c.slice( 5,-1 ).split(',');
			return { 	css: c,
						r: parseInt( rgba[0] ),
						g: parseInt( rgba[1] ),
						b: parseInt( rgba[2] ),
						a: parseInt( rgba[3] )	};
		}
		
		if( c.startsWith( 'rgb(' ) )
		{	const rgb = c.slice( 4,-1 ).split(',');
			return { 	css: c,
						r: parseInt( rgb[0] ),
						g: parseInt( rgb[1] ),
						b: parseInt( rgb[2] ),
						a: 255	};
		}
		if( c.startsWith( 'rgba#' ) )
			if( c.length > 9 )
				return { 	css: c.substring(4),
							r: parseHex( c.slice( 5,7 ) ),
							g: parseHex( c.slice( 7,9 ) ),
							b: parseHex( c.slice( 9,11 ) ),
							a: parseHex( c.slice( 11,13 ) )	};
			else
				return { 	css: c.substring(4),
							r: parseHex( c.slice( 5,6 ) ) * 17,
							g: parseHex( c.slice( 6,7 ) ) * 17,
							b: parseHex( c.slice( 7,8 ) ) * 17,
							a: parseHex( c.slice( 8,9 ) ) * 17	};
		if( c.startsWith( 'rgb#' ) )
			if( c.length > 7 )
				return { 	css: c.substring(3),
							r: parseHex( c.slice( 4,6 ) ),
							g: parseHex( c.slice( 6,8 ) ),
							b: parseHex( c.slice( 8,10 ) ),
							a: 255	};
			else
				return { 	css: c.substring(3),
							r: parseHex( c.slice( 4,5 ) ) * 17,
							g: parseHex( c.slice( 5,6 ) ) * 17,
							b: parseHex( c.slice( 6,7 ) ) * 17,
							a: 255 	};

		if( c.startsWith( '#' ) )
			if( c.length > 5 )
			{	const a = parseHex( c.slice( 7,9 ) );
				return { 	css: c,
							r: parseHex( c.slice( 1,3 ) ),
							g: parseHex( c.slice( 3,5 ) ),
							b: parseHex( c.slice( 5,7 ) ),
							a: isNaN(a) ? 255 : a	};
			}
			else
			{	const a = parseHex( c.slice( 4,5 ) );				
				return { 	css: c,
							r: parseHex( c.slice( 1,2 ) ) * 17,
							g: parseHex( c.slice( 2,3 ) ) * 17,
							b: parseHex( c.slice( 3,4 ) ) * 17,
							a: isNaN(a) ? 255 : a	};
			}

		return undefined;
	},

	resolveBlendingTHREE( value )
	{
		switch( value )
		{ case 'add':
		  case 'addition':
		  case 'additive':
			return { blending: THREE.AdditiveBlending };

		  case 'sub':
		  case 'subtract':
		  case 'subtractive':
			return { blending: THREE.SubtractiveBlending };

		  case 'mul':
		  case 'multiply':
		  case 'multiplicative':
			hud.error( "blending mode 'darken-only' ignores alpha. Use with caution!" );
			return { blending: THREE.MultiplyBlending };// ignores alpha!

		  case 'lightenonly':
			return {	blending: THREE.CustomBlending,
						blendSrc: THREE.OneFactor,
						blendDst: THREE.OneFactor,
						blendEquation: THREE.MaxEquation,
						premultiplyAlpha: true,
			};
		  case 'darkenonly':
			hud.error( "blending mode 'darken-only' ignores alpha. Use with caution!" );
			return {	blending: THREE.CustomBlending,
						blendSrc: THREE.OneFactor,
						blendDst: THREE.OneFactor,
						blendEquation: THREE.MinEquation,
						premultiplyAlpha: true,
			};
		  case 'normal':
			return { blending: THREE.NormalBlending };

		  default:
			return undefined;
		}
	},
	
	resolveBlending: ( value ) => value=='-' ? undefined : value,

	resolveShader( type )
	{	const layer = painter.context.focus.layer;
		switch( type )
		{ case 'drift': // simple test case
			layer.shader.vertex = shader.vertex.base;
			layer.shader.fragment = shader.fragment.texture_drift;
			layer.shader.type = type;

		  case 'cross': // simple test case
		  case 'crossdrift': // simple test case
			layer.shader.vertex = shader.vertex.base;
			layer.shader.fragment = shader.fragment.texture_crossdrift;
			layer.shader.type = type;

		  case 'quad': // simple test case
		  case 'quaddrift': // simple test case
			layer.shader.vertex = shader.vertex.base;
			layer.shader.fragment = shader.fragment.texture_quaddrift;
			layer.shader.type = type;

// change default to something without texture
		  default: // case 'texture': // simple test case
			layer.shader.vertex = shader.vertex.base;
			layer.shader.fragment = shader.fragment.texture_test;
			layer.shader.type = 'texture';
			break;
		}
	},

 //
	canvasImage( img )
	{
		const cnv = document.createElement('canvas');
		cnv.width = img.width;
		cnv.height = img.height;
		
		cnv.getContext('2d').drawImage( img, 0, 0 );

		return cnv;
	},
	
	imageKey: ( struct ) =>
	// hands out a unique key for images combined with lighten / cta effects
		[ struct.src,
		  struct.cta ? 'cta'+struct.cta.r+struct.cta.g+struct.cta.b : '',
		  struct.lighten ? 'lgt'+struct.lighten : ''
		].join(''),

	renderImageAsCanvas( struct )
	{
		const key = painter.imageKey( struct );

		if( resources.cnvImages.has( key ) )
		{	struct.canvas = resources.cnvImages.get( key );
			return;
		}

		if( !resources.images.has( struct.src ) )
			throw `BPF action.src is "${action.src}"!`

	 // finish image on Canvas
		struct.image = resources.images.get( struct.src );
		const cnv = painter.canvasImage( struct.image );

		if( struct.cta )
			painter.colorToAlpha( cnv, struct.cta );

		if( struct.lighten )
			painter.lighten( cnv, struct.lighten );

		if( struct.dim )
			painter.dim( cnv, struct.dim );

		resources.cnvImages.set( key, cnv );
		struct.canvas = cnv;
	},
		
 //
	renderImageAsSeamlessCanvas( action )
	{// return src image repeated on a canvas

	 // generate key from operation attributes
		const key = painter.imageKey( action );
	 
		if(resources.cnvImageSeamless.get( key ))
		{	action.canvas = resources.cnvImageSeamless.get( key );
			return;
		}
		
	 // have action.canvas defined:
		painter.renderImageAsCanvas( action );

		const img = action.canvas || action.image;
		
	 // make seamless if its small enough
		let nx = Math.trunc( defaults.IMAGE_CANVAS_MAX[0] / img.width );
		let ny = Math.trunc( defaults.IMAGE_CANVAS_MAX[1] / img.height );
		nx = nx ? nx : 1;
		ny = ny ? ny : 1;
		
	 // create new canvas with size of image, new context and new ImageData entry
		let cnv = document.createElement('canvas');
		cnv.width = nx*img.width;
		cnv.height = ny*img.height;
		
		let ctx = cnv.getContext('2d');
	
	 // fill canvas with (seamless) Texture
		for(let tx=0; tx<nx; tx++)
			for(let ty=0; ty<ny; ty++)
				ctx.drawImage(img, tx*img.width, ty*img.height, img.width, img.height );

		resources.cnvImageSeamless.set( key, cnv );
		action.canvas = cnv;
	},

	setFont( family, size )
	{	const isize = size | 0;
		painter.textCanvasCtx.font = `${isize}px ${family}`;
		if( painter.textCanvasCtx.font != `${isize}px ${family}` )
			hud.logError(`Font not accepted by css '${isize}px ${family}'`);
	},
		
 //
	blurMatrix: new Map(
	[
		[ 'blur-thin', ( sizeX, sizeY ) =>
			{	const intensity = [];
				for( let y=-sizeY; y<=sizeY; y++ )
					for( let x=-sizeX; x<=sizeX; x++ )
					{	const dx = x / (sizeX+1);
						const dy = y / (sizeY+1);
						let d = Math.pow((dx*dx + dy*dy)/2, 1./7) * 1.1111 - .1111;
						d = d<0 ? 0 : d;
						if(d<=1)
							intensity.push([x,y,1-d]);
					}
				return intensity;
			} ],
			
		[ 'blur-linear', ( sizeX, sizeY ) =>
			{	const intensity = [];
				for( let y=-sizeY; y<=sizeY; y++ )
					for( let x=-sizeX; x<=sizeX; x++ )
					{	const dx = x / (sizeX+1);
						const dy = y / (sizeY+1);
						const d = Math.pow(dx*dx + dy*dy, .5);
						if(d<=1)
							intensity.push([x,y,1-d]);
					}
				return intensity;
			} ],
			
		[ 'blur-bold', ( sizeX, sizeY ) =>
			{	const intensity = [];
				for( let y=-sizeY; y<=sizeY; y++ )
					for( let x=-sizeX; x<=sizeX; x++ )
					{	const dx = x / (sizeX+1);
						const dy = y / (sizeY+1);
						const d = Math.pow(dx*dx + dy*dy - .01,1.2)*1.33;
						if(d<1)
							intensity.push([x,y,1-d]);
					}
				return intensity;
			} ],
			
		[ 'blur-star', ( sizeX, sizeY ) =>
			{	const intensity = [];
				for( let x=1; x<=sizeX; x++ )
				{	intensity.push([x,0,1-x/sizeX]);
					intensity.push([-x,0,1-x/sizeX]);
				}
				for( let y=1; y<=sizeY; y++ )
				{	intensity.push([0,y,1-y/sizeY]);
					intensity.push([0,-y,1-y/sizeY]);
				}
				return intensity;
			} ]
	] ),
	
	getBlurMatrix: ( type, sizeX, sizeY, rotation ) =>
	{	const intensity = painter.blurMatrix.get( type ) || painter.blurMatrix.get( 'blur-'+type );
		return intensity( sizeX, sizeY, rotation );
	},

	blurDefined: ( type ) => painter.blurMatrix.has( type ) || painter.blurMatrix.has( 'blur-'+type ) || type == 'css',
	
	blurText( mode, phrase, op, posX, posY, intensity )
	{//
		const ctxBlur = painter.blurCanvasCtx;
		const ctxText = painter.textCanvasCtx;

		const centerX = painter.textCanvasMaxSize[0] / 2;
		const centerY = painter.textCanvasMaxSize[1] / 2;

	 // stroke phrase on separate canvas
		ctxBlur.font = ctxText.font;
		ctxBlur.strokeStyle = op.color.css;
		ctxBlur.lineWidth = op.thickness || 1.0;
		
		ctxBlur.clearRect( 0, 0, painter.textCanvasMaxSize[0], painter.textCanvasMaxSize[1] );

		const intensityMatrix = painter.getBlurMatrix( op.type, op.sizeX, op.sizeY, op.rotation );
		const len = intensityMatrix.length;

		if( mode == 'fill' )
			for(let k = 0; k<len; k++)
			{	const alpha = intensityMatrix[k][2] * intensity;
				if(!alpha) continue;
				
				ctxBlur.globalAlpha = alpha>1 ? 1. : alpha;
				ctxBlur.fillText( phrase, posX + intensityMatrix[k][0], posY + intensityMatrix[k][1] );
			} 
		else
			for(let k = 0; k<len; k++)
			{	const alpha = intensityMatrix[k][2] * intensity;
				if(!alpha) continue;
				
				ctxBlur.globalAlpha = alpha>1 ? 1. : alpha;
				ctxBlur.strokeText( phrase, posX + intensityMatrix[k][0], posY + intensityMatrix[k][1] );
			}

	 // ...or do it manually
		const textId = ctxText.getImageData( 0, 0, painter.textCanvasMaxSize[0], painter.textCanvasMaxSize[1] );
		const blurId = ctxBlur.getImageData( 0, 0, painter.textCanvasMaxSize[0], painter.textCanvasMaxSize[1] );
		const textPixel = textId.data;
		const blurPixel = blurId.data;

		painter.blend( textPixel, blurPixel, op.blending, op.alpha );
 
	 // write back
		ctxText.putImageData( textId, 0,0);//centerX-width/2, centerY-height/2 );
	},

	blurTextCSS( mode, phrase, op, posX, posY, intensity )
	{
		const con = painter.context;
		const ctx = painter.textCanvasCtx;
		ctx.strokeStyle = "#FF00FF";
		ctx.globalAlpha = 1.;
		ctx.shadowColor = op.color.css;
		ctx.shadowBlur = op.sizeX;
		ctx.lineWidth = (op.thickness || 1.0) + 2 + op.sizeX/10;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = con.fontSize*3;

		switch( op.blending )
		{ case 'addition':
		  case 'add':
			ctx.globalCompositeOperation = "lighter";
			break;
		  
		  case 'subtract':
		  case 'sub':
			hud.logError("blending: subtract not supported on CSS mode! Define another blur.type !");
			ctx.globalCompositeOperation = "source-over";
			break;

		  case 'multiply':
		  case 'mul':
			ctx.globalCompositeOperation = "multiply";
			break;

		  default /*"normal"*/:
			ctx.globalCompositeOperation = op.blending;
		}

		const dense = op.density ? op.density : 1;
		if( mode == 'stroke' )
			for(let _i=0; _i<=dense; _i++)
				ctx.strokeText( phrase, posX, posY-con.fontSize*3 );
		else /* fill */
			for(let _i=0; _i<dense; _i++)
				ctx.fillText( phrase, posX, posY-con.fontSize*3 );
		
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;						
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.shadowBlur = 0;
	},
	
	canvasBlur( action, phraseWidth, phraseHeight )
	// unused !
	// · apply blur on whole canvas - SLOW AS WHATEVER!
	{// get Pixeldata from main canvas
		const ctx = painter.textCanvasCtx;
		const centerX = painter.textCanvasMaxSize[0] / 2;
		const centerY = painter.textCanvasMaxSize[1] / 2;
		const sizeX = action.sizeX;
		const sizeY = action.sizeY;
		const width = phraseWidth + sizeX * 2;
		const height = phraseHeight + sizeY * 2;
		const dense = action.density || sizeX+sizeY/7;

		const textId = ctx.getImageData(
			Math.trunc(centerX-width/2-sizeX),
			Math.trunc(centerY-height/2-sizeY),
			width, height );
		const textPixel = textId.data;

		const targetPixel = new Uint8ClampedArray( textPixel.length );
		const sx = width * 4; 

	 // get intensity distribution
		const intensity = painter.getBlurMatrix( action.type, sizeX, sizeY, action.rotation );

	 // get maximum alpha in result image for normalizing transparency
		let maxAlpha = 0.0; // necessary??

	 // split result up in 2 TypedArray's
		let matrixOffset = new Int32Array( intensity.length );
		let matrixIntensity = new Float32Array( intensity.length );
		for(let k = 0; k<intensity.length; k++)
		{	matrixOffset[k] = intensity[k][0]*sx+intensity[k][1]*4;
			matrixIntensity[k] = intensity[k][2]*dense;
		}

		console.time("blur");
	 // find first and last pixel where blur that will affect
		let begin, last;
		for(begin=0; !textPixel[begin+3]; begin+=4);
		for(last=textPixel.length-4; !textPixel[last+3]; last-=4);
		begin -= sizeY*sx + sizeX*4; 
		last += sizeY*sx + sizeX*4; 

	 // if this gets slow as hell its because some textPixel indizes are out of boundary!-> REFAC
		const rgb = new Uint32Array(3);
		for( let i=begin; i<last; i+=4)
		{
		// · just sum up all colors. but reduce every color by its alpha * intensity
		// · count added colors _and_ sum up alpha-intensities
			rgb[0] = 0;
			rgb[1] = 0;
			rgb[2] = 0;
			let sumIntAlpha = 0.0;

			const len = matrixOffset.length;
			for(let k = 0; k<len; k++)
			{	const j = i+matrixOffset[k];
				const alpha = matrixIntensity[k] * textPixel[j+3];//(textPixel[j+3]/255);

				rgb[0] += textPixel[ j ] * alpha, 
				rgb[1] += textPixel[j+1] * alpha, 
				rgb[2] += textPixel[j+2] * alpha, 

				sumIntAlpha += alpha;
			}
			targetPixel[ i ] = rgb[0] / sumIntAlpha;
			targetPixel[i+1] = rgb[1] / sumIntAlpha;
			targetPixel[i+2] = rgb[2] / sumIntAlpha;
			targetPixel[i+3] = sumIntAlpha / intensity.length;// * 255;

			maxAlpha = maxAlpha>targetPixel[i+3] ? maxAlpha:targetPixel[i+3];
		}
		console.timeEnd("blur");

	 // write back
		ctx.putImageData( new ImageData( targetPixel, width ),
			Math.trunc(centerX-width/2-sizeX),
			Math.trunc(centerY-height/2-sizeY) );
	},

	colorToAlpha( cnv, color, tolerance )
	{
		const width = cnv.width;
		const height = cnv.height;
	
		const ctx = cnv.getContext('2d');
		const id = ctx.getImageData( 0, 0, width, height );
		const pixel = id.data;

		const maxDif = (tolerance||1) * 255;

	 // apply alpha
		for( let i=0; i<pixel.length; i += 4)
		{
			const factor = Math.min( Math.abs(pixel[ i ] - color.r), maxDif )
						 + Math.min( Math.abs(pixel[i+1] - color.g), maxDif )
				         + Math.min( Math.abs(pixel[i+2] - color.b), maxDif );
			const alpha = factor / (maxDif*3);
			
			pixel[i+3] = pixel[i+3] * alpha;
		}

	 // write back
		ctx.putImageData( id, 0, 0 );
	},

	lighten( cnv, value ) // negative value darkens
	{
		const width = cnv.width;
		const height = cnv.height;
	
		const ctx = cnv.getContext('2d');
		const id = ctx.getImageData( 0, 0, width, height );
		const pixel = id.data;

	 // apply alpha
		for( let i=0; i<pixel.length; i += 4)
		{
			const med = (pixel[ i ] + pixel[i+1] + pixel[i+2]) / 768;
			const dif = value * Math.sin( Math.PI * med );

			pixel[ i ] += dif;
			pixel[i+1] += dif;
			pixel[i+2] += dif;
		}
	 // write back
		ctx.putImageData( id, 0, 0 );
	},

	dim( cnv, value ) // negative value ligbhtens
	{
		const width = cnv.width;
		const height = cnv.height;
	
		const ctx = cnv.getContext('2d');
		const id = ctx.getImageData( 0, 0, width, height );
		const pixel = id.data;

	 // apply dimming
		for( let i=0; i<pixel.length; i += 4)
		{
			pixel[ i ] *= value;
			pixel[i+1] *= value;
			pixel[i+2] *= value;
		}

	 // write back
		ctx.putImageData( id, 0, 0 );
	},

	canvasTexture( action, width, height )
	{// prepare image canvas
		painter.renderImageAsSeamlessCanvas( action );
console.log("canvasTexture", action);
		const ctx = painter.textCanvasCtx;
		const centerX = painter.textCanvasMaxSize[0] / 2;
		const centerY = painter.textCanvasMaxSize[1] / 2;

	 // don't paint outside canvas borders
		const textWidth = Math.min( width, painter.textCanvasMaxSize[0] );
		const textHeight = Math.min( height, painter.textCanvasMaxSize[1] );

	 // get random area from seamless texture	 
		const grabX = Math.trunc( (action.canvas.width -  width)  * Math.random() );
		const grabY = Math.trunc( (action.canvas.height - height) * Math.random() );
		
	 // get Pixeldata from main canvas
		const textId = ctx.getImageData( centerX-textWidth/2, centerY-textHeight/2, textWidth, textHeight );
		const textPixel = textId.data;
		const textureCtx = action.canvas.getContext('2d');
		const textureId = textureCtx.getImageData( grabX, grabY, textWidth, textHeight );
		const texturePixel = textureId.data;

		painter.blendIn( textPixel, texturePixel, action.blending, action.alpha );

	 // write back
		ctx.putImageData( textId, centerX-textWidth/2, centerY-textHeight/2 );
	},

	blendIn( srcPixel, destPixel, blending, alpha = 1. )
	{// iterate over ervery pixel and apply blending operation
		switch( blending )
		{ case 'addition':
		  case 'add':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] += destPixel[ i ]*a;
				srcPixel[i+1] += destPixel[i+1]*a;
				srcPixel[i+2] += destPixel[i+2]*a;
			}
			break;
		  case 'subtract':
		  case 'sub':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] -= destPixel[ i ]*a;
				srcPixel[i+1] -= destPixel[i+1]*a;
				srcPixel[i+2] -= destPixel[i+2]*a;
			}
			break;
		  case 'multiply':
		  case 'mul':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] = srcPixel[ i ]*(1-a) + (srcPixel[ i ] / 255.0) * destPixel[ i ] * a;
				srcPixel[i+1] = srcPixel[ i ]*(1-a) + (srcPixel[i+1] / 255.0) * destPixel[i+1] * a;
				srcPixel[i+2] = srcPixel[ i ]*(1-a) + (srcPixel[i+2] / 255.0) * destPixel[i+2] * a;
			}
			break;
		  case 'screen':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] = srcPixel[ i ]*(1-a) + (255 - ((255-srcPixel[ i ]) / 255.0) * (255-destPixel[ i ])) * a;
				srcPixel[i+1] = srcPixel[ i ]*(1-a) + (255 - ((255-srcPixel[i+1]) / 255.0) * (255-destPixel[i+1])) * a;
				srcPixel[i+2] = srcPixel[ i ]*(1-a) + (255 - ((255-srcPixel[i+2]) / 255.0) * (255-destPixel[i+2])) * a;
			}
			break;
		  default: /* "normal" */
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] = Math.trunc(srcPixel[ i ]*(1-a) + destPixel[ i ]*a);
				srcPixel[i+1] = Math.trunc(srcPixel[i+1]*(1-a) + destPixel[i+1]*a);
				srcPixel[i+2] = Math.trunc(srcPixel[i+2]*(1-a) + destPixel[i+2]*a);
			}
			break;
		}

		return srcPixel;
	},

	blend( srcPixel, destPixel, blending, alpha = 1. )
	{// iterate over ervery pixel and apply blending operation
		switch( blending )
		{ case 'addition':
		  case 'add':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] += destPixel[ i ]*a;
				srcPixel[i+1] += destPixel[i+1]*a;
				srcPixel[i+2] += destPixel[i+2]*a;
				srcPixel[i+3] = Math.max(srcPixel[i+3], a*255);
			}
			break;
		  case 'subtract':
		  case 'sub':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] -= destPixel[ i ]*a;
				srcPixel[i+1] -= destPixel[i+1]*a;
				srcPixel[i+2] -= destPixel[i+2]*a;
				srcPixel[i+3] = Math.max(srcPixel[i+3], a*255);
			}
			break;
		  case 'multiply':
		  case 'mul':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] = srcPixel[ i ]*(1-a) + (srcPixel[ i ] / 255.0) * destPixel[ i ] * a;
				srcPixel[i+1] = srcPixel[ i ]*(1-a) + (srcPixel[i+1] / 255.0) * destPixel[i+1] * a;
				srcPixel[i+2] = srcPixel[ i ]*(1-a) + (srcPixel[i+2] / 255.0) * destPixel[i+2] * a;
				srcPixel[i+3] = Math.max(srcPixel[i+3], a*255);
			}
			break;
		  case 'screen':
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] = srcPixel[ i ]*(1-a) + (255 - ((255-srcPixel[ i ]) / 255.0) * (255-destPixel[ i ])) * a;
				srcPixel[i+1] = srcPixel[ i ]*(1-a) + (255 - ((255-srcPixel[i+1]) / 255.0) * (255-destPixel[i+1])) * a;
				srcPixel[i+2] = srcPixel[ i ]*(1-a) + (255 - ((255-srcPixel[i+2]) / 255.0) * (255-destPixel[i+2])) * a;
				srcPixel[i+3] = Math.max(srcPixel[i+3], a*255);
			}
			break;
		  default: /* "normal" */
			for( let i=0; i<srcPixel.length; i += 4)
			{	let a = alpha * destPixel[i+3] / 255;
				srcPixel[ i ] = Math.trunc(srcPixel[ i ]*(1-a) + destPixel[ i ]*a);
				srcPixel[i+1] = Math.trunc(srcPixel[i+1]*(1-a) + destPixel[i+1]*a);
				srcPixel[i+2] = Math.trunc(srcPixel[i+2]*(1-a) + destPixel[i+2]*a);
				srcPixel[i+3] = Math.max(srcPixel[i+3], a*255);
			}
			break;
		}
		return srcPixel;
	},
		
	resetContext()
	{// default values for canvas rendering
		painter.context =
		{	phraseScale: 1.0,
			alphaDefault: 1.0,
			colorDefault: painter.resolveColor( "#ffffff" ),
			fontFamily: defaults.FONT,
			fontSize: defaults.FONT_SIZE,
			
		 // text layer data storage for later phrase rendering
			layers: [],
			focus: {},
			
		 // image layer data storage
			background: {
				fade: builder.resolveFade( defaults.DEFAULT_BACKGROUND_FADE ),
				drifts: [],
				offset: [],
			},

		 // keyword id handing
			idCounter: {},
		};
	},

	resetBackground: () =>
	 // prepare new background instance, keep fade
		painter.context.background = {
			alpha: 1.,
			fade: [ painter.context.background.fade ], // performances[ PLANE_FADE ] kept
			drifts: [],
			offset: [0,0],
		},

	defBackgroundRender( [key,value] )
	{	
		const con = painter.context;
		const plane = painter.context.background;
		
		const { resolveSize, resolveVelocity, resolveFade, resolveDrift } = builder;

		console.log(`background cmd [${key}] ${value}`);
		
	 // everything defined here happens on runtime and threejs 
		switch(key)
		{ case 'image':
		  case 'src':
		  case 'file':
		 // filename (without path)
			const filename = removePath( value );
			const image = resources.images.get( filename );
			if(!image)
			{	hud.logError(`BPF: resource.image '${src}' not properly loaded!`);
				return;
			}

			con.background.src = filename;
			con.background.image = image;
			
		 // auto scale image on screen
			if(!con.background.scaleBase)
			{	const scaleX = screen.width / image.width;
				const scaleY = screen.height / image.height;
				con.background.scaleBase = scaleX > scaleY ? scaleX : scaleY;
			}
			return;

		  case 'blending':
		  case 'blend':
		  case 'operation':
			con.background.blending = painter.resolveBlendingTHREE( value );
			return;
			
		  case 'scale':
			con.background.scale = builder.resolveBackgroundScale( value, con.background.scaleBase );
			return;

		  case 'offset':
			if(value.length > 1)
				con.background.offset = builder.resolveOffset( value, 'vh' );
			return;
			
		  case 'drift':
			if( value instanceof Array )
			{
			 	builder.resolveDrift( plane, value[0], runtime.planeOffsetX, runtime.planeDriftX, builder.resolveBackgroundSize, builder.resolveVelocity );
				builder.resolveDrift( plane, value[1], runtime.planeOffsetY, runtime.planeDriftY, builder.resolveBackgroundSize, builder.resolveVelocity );
				builder.resolveDrift( plane, value[2], runtime.planeOffsetS, runtime.planeDriftS );
				builder.resolveDrift( plane, value[3], runtime.planeOffsetR, runtime.planeDriftR );	//];
			}
			return;
		  case 'drift.up':
		  case 'driftup':
		  case 'up':
			builder.resolveDrift( plane, -value, runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.down':
		  case 'driftdown':
		  case 'drift.y':
		  case 'drifty':
		  case 'down':
			builder.resolveDrift( plane, value, runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.left':
		  case 'driftleft':
		  case 'left':
			builder.resolveDrift( plane, -value, runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.right':
		  case 'driftright':
		  case 'drift.x':
		  case 'driftx':
		  case 'right':
			builder.resolveDrift( plane, value, runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.zoom':
		  case 'driftzoom':
		  case 'zoom':
			builder.resolveDrift( plane, value, runtime.planeOffsetS, runtime.planeDriftS );
			return;
		  case 'drift.rotate':
		  case 'driftrotate':
		  case 'rotate':
		  case 'drift.rot':
		  case 'driftrot':
		  case 'rot':
			builder.resolveDrift( plane, value, runtime.planeOffsetR, runtime.planeDriftR );
			return;
			
		  case 'fade':
			plane.fade = builder.resolveFade( value, 'image' ) || plane.fade;
			return;
			
		  case 'dim':
			con.background.dim = parseInt( value ) || 0;
			return;
		  case 'lighten':
			con.background.lighten = parseInt( value ) || 0;
			return;
		  case 'darken':
			con.background.lighten = -parseInt( value ) || 0;
			return;
		  case 'colortoalpha':
		  case 'cta':
			con.background.cta = painter.resolveColor( value );
			return;
			
		  case 'normalize':
		  default:
		}
		hud.logError(`definition ${key} : ${value} not understood - ignored!`);		
	},
	
	updateFocus( key )
	{// update con.focus, store new id's
		const con = painter.context;
		
		const defaults =
		{	'layer'   : builder.defaultLayer,
			'texture' : builder.defaultTexture,
			'fill'    : builder.defaultFill,
			'stroke'  : builder.defaultStroke,
			'blur'    : builder.defaultBlur,
		};

		const idKeywords = Object.keys( defaults );//[ 'layer', 'write', 'texture', 'stroke', 'fill', 'blur' ];

	 // layer maintenance
		let layer = con.focus[ 'layer' ];
		const setLayer = ( id ) =>
		{	layer = con.layers.find( (e) => e.id == id );
			if(!layer)
			{	layer = builder.defaultLayer( id );
				con.layers.push( layer );
			}
			con.focus[ 'layer' ] = layer;
			console.log("focus layer", id);
		}

	 // operation maintenance
		const layerOperation = ( op, id ) =>
		{	const struct = layer.operations.find( (e) => e.op == op && e.id == id );
			if( struct ) return struct;

			const spawn = defaults[ op ]( id );
			layer.operations.push( spawn );
			return spawn;
		}

		const focusOperation = ( op, id ) => con.focus[ op ] = layerOperation( op, id );
		const getIdCounter = ( op ) => con.idCounter[ op ] || 0;
		const incIdCounter = ( op ) => con.idCounter[ op ] = 1 + con.idCounter[ op ] || 0;

	 //
		const split = key.split('.');
		const last = split.last();

		const lastkey = idKeywords.find( (e) => last.startsWith( e ) )
		if( lastkey )
		{	const k = last.substring( 0, lastkey.length );
			let id = last.substring( lastkey.length );

			if( id === '' )
			{
				incIdCounter( k );
				id = getIdCounter( k );
			}
			
			if( k == 'layer' )
				setLayer( id );
			else
				layerOperation( k, id );
		}

	 // collect id's from command
		return split.map( (part) =>
		{	
			const key = idKeywords.find( (k) => part.startsWith(k) );
			
			if( key === undefined )
				return part;

			const id = part.substring( key.length ) || getIdCounter( key );

			switch( key )
			{ case 'layer':
				setLayer( id );
				return key;

			  default:
				focusOperation( key, id ) ;
				console.log("focus operation", key, id);
				return key;
			}
		} ).join('.');
	},

 //	
	defStyleRender([ key, value ])
	{// apply style definitions from parser on canvas context
		const con = painter.context;
		const { resolveSize, resolveBlurSize, resolveThickness, thicknessLimit } = builder;
		
	 // set focus, collect id's
		const straight = painter.updateFocus( key );
		
		console.log("render",key,"-> ["+straight+", "+value+"]");
	 // 
		switch(straight)
		{
		  case 'font':
		  case 'linespacing':
		  case 'scale':
		  case 'align':
		  case 'margin':
		  case 'offset':
 		 // all these are pre-calculated in builder.expandParsedData()
			return;
			
		  case 'name':
			//builder.applyPreset( value );
			//con = painter.context;
		  // store definition escapedto builder.renderIter
			hud.logSpecial(`[${name}, ${value}] namespaces not supported by now // will work soon`);
			return;

		  case 'color':
			con.colorDefault = painter.resolveColor( value ) || con.colorDefault;
			return;
			
		  case 'alpha':
			if(parseFloat(value) != NaN)
				con.alphaDefault = value || con.alphaDefault;
			return;

		  case 'layer':			
			return;

		 // stroke operation
		  case 'layer.stroke': // only arrays arrive here!
			con.focus.stroke.skip = false;
			if( value instanceof Array )
			{	const { strings, numbers, arrays } = splitTypes( value );
				numbers.forEach( ( e,i ) =>
				{	switch( i )
					{ case 0:	con.focus.stroke.thickness = resolveThickness( e );		
								break;
					  case 1:	con.focus.stroke.alpha = e;		
								break;
					  
				}	} );
						
				strings.forEach( ( e ) =>
				{	const color = painter.resolveColor( e );
					if( color )
						con.focus.stroke.color = color;
					else
						con.focus.stroke.blending = painter.resolveBlending( e );
				} );

				arrays.forEach( ( e ) =>
				{	if( e.length == 2 )
						con.focus.stroke.offset = e.map( (v) => thicknessLimit( resolveSize( v ) ) );
				} );
			}
			else if( value == '-' )
				con.focus.stroke.skip = true;
			return;

		  case 'layer.stroke.blend':
		  case 'layer.stroke.blending':
		  case 'layer.stroke.operation':
  			con.focus.stroke.blending = painter.resolveBlending( value );
			return;

		  case 'layer.stroke.thickness':
  			con.focus.stroke.thickness = resolveThickness( value );
			return;

		  case 'layer.stroke.color':
			con.focus.stroke.color = painter.resolveColor( value ) || con.focus.stroke.color;
			return;

		  case 'layer.stroke.alpha':
			con.focus.stroke.alpha = isNaN(parseFloat( value )) ? con.focus.stroke.alpha : value;
			return;

		 // fill operation
		  case 'layer.fill': // only arrays arrive here!
			con.focus.fill.skip = false;
			if( value instanceof Array )
			{	const { strings, numbers, arrays } = splitTypes( value );
		
				numbers.forEach( ( e,i ) =>
				{	switch( i )
					{ case 0:	con.focus.fill.alpha = e;		break;
				}	} );
						
				strings.forEach( ( e ) =>
				{	const color = painter.resolveColor( e );
					const blending = painter.resolveBlending( e );
					if( color )
						con.focus.fill.color = color;
					else if( blending )
						con.focus.fill.blending = e;
				} );

				arrays.forEach( ( e ) =>
				{	if( e.length == 2 )
						con.focus.fill.offset = e.concat();
				} );
			}
			else if( value == '-' )
				con.focus.fill.skip = true;
			return;
			
		  case 'layer.fill.blend':
		  case 'layer.fill.blending':
		  case 'layer.fill.operation':
  			con.focus.fill.blending = painter.resolveBlending( value );
			return;

		  case 'layer.fill.color':
			con.focus.fill.color = painter.resolveColor( value ) || con.focus.fill.color;
			return;

		  case 'layer.fill.alpha':
			con.focus.fill.alpha = isNaN(parseFloat( value )) ? con.focus.fill.alpha : value;
			return;

	 // blur operation
		  case 'layer.blur': // only arrays arrive here!
			con.focus.blur.skip = false;
			if( value instanceof Array )
			{	const { strings, numbers, arrays } = splitTypes( value );

				numbers.forEach( (v,i) =>
				{	switch( i )
					{ case 0:
						con.focus.blur.sizeX = con.focus.blur.sizeY = resolveBlurSize( v );
						break;
					  case 1:
						con.focus.blur.alpha = v;
						break;
					  case 2:
						con.focus.blur.density = resolveThickness( v );
						break;
					  case 3:
						con.focus.blur.rotation = parseFloat( v );
						break;
				}	} );

				arrays.forEach( (e,i) =>
				{	switch( i )
					{ case 0:
						con.focus.blur.sizeX = resolveBlurSize( e[0] );
						if( e[1] ) con.focus.blur.sizeY = resolveBlurSize( e[1] );
						if( e[2] ) con.focus.blur.rotation = parseFloat( e[2] );
						break;
				}	} );

				strings.forEach( ( e ) =>
				{	const color = painter.resolveColor( e );
					const type = painter.blurDefined( e );
					if( color )
						con.focus.blur.color = color;
					else if( type )
						con.focus.blur.type = e;
					else
						con.focus.blur.blending = e;
				} );
			}
			else if( value == '-' )
				con.focus.blur.skip = true;
			return;

		  case 'layer.blur.type':
		  case 'layer.blur.mode':
			con.focus.blur.type = value.toLowerCase();
			return;
			
		  case 'layer.blur.size':
 			if(value instanceof Array)
			{	con.focus.blur.sizeX = resolveBlurSize( value[0] );
				con.focus.blur.sizeY = resolveBlurSize( value[1] ) || con.focus.blur.sizeX;
				con.focus.blur.rot = parseFloat( value[2] ) != NaN ? parseFloat( value[2] ) : con.focus.blur.rot;
			}
			else
				con.focus.blur.sizeX = con.focus.blur.sizeY = 
					resolveBlurSize( value ) || builder.empx( 1 );
			return;
			
		  case 'layer.blur.sizeX':
			con.focus.blur.sizeX = resolveBlurSize( value );
			return
			
		  case 'layer.blur.sizeY':
			con.focus.blur.sizeY = resolveBlurSize( value );
			return

		  case 'layer.blur.thickness':
		  case 'layer.blur.density':
			con.focus.blur.thickness = resolveThickness( value );
			return;

		  case 'layer.blur.rotation':
		  case 'layer.blur.rot':
  			con.focus.blur.rotation = parseFloat( value ) || con.focus.blur.rot;
			return;
			
		  case 'layer.blur.blending':
		  case 'layer.blur.blend':
		  case 'layer.blur.operation':
  			con.focus.blur.blending = painter.resolveBlending( value );
			return;

		  case 'layer.blur.color':
			con.focus.blur.color = painter.resolveColor( value ) || con.focus.blur.color;
			return;

		  case 'layer.blur.alpha':
			con.focus.blur.alpha = parseFloat( value ) != NaN ? value : con.focus.blur.alpha;
			return;

	 // layer Texture
		  case 'layer.texture':
			con.focus.texture.skip = false;
			if( value instanceof Array )
			{	const { strings, numbers } = splitTypes( value );

				numbers.forEach( (e,i) =>
				{	switch( i )
					{ case 0:	con.focus.texture.alpha = e;		break;
				}	} );

				strings.forEach( ( e ) =>
				{
					const src = removePath( e );
					const image = resources.images.get( src );
					const color = painter.resolveColor( e );
					const blending = painter.resolveBlending( e );

					if( image )
						con.focus.texture.src = src;
					else if( color )
						con.focus.texture.cta = color;
					else if( blending )
						con.focus.texture.blending = e;
				} );
			}
			else if( value == '-' )
				con.focus.texture.skip = true;
			return;
			
		  case 'layer.texture.image':
		  case 'layer.texture.file':
		  case 'layer.texture.src':
			{	const src = removePath( value );
				if(!src)
					hud.logError(`inaccessible image in texture() -> ${value}`);
				else
					con.focus.texture.src = src;
			}
			return;
			
		  case 'layer.texture.alpha':
			if(parseFloat(value) != NaN)
				con.focus.texture.alpha = value;
			return;
		  case 'layer.texture.colortoalpha':
		  case 'layer.texture.cta':
			con.focus.texture.cta = painter.resolveColor( value );
			return;
			
		  case 'layer.texture.lighten':
			con.focus.texture.lighten = parseFloat(value);
			return;
		  case 'layer.texture.darken':
			con.focus.texture.lighten = parseFloat(-value);
			return;
			
		  case 'layer.texture.operation':
		  case 'layer.texture.blending':
		  case 'layer.texture.blend':
			con.focus.texture.blending = value;
			return;
			
		  case 'layer.shader':
			if( value instanceof Array )
			{	if( !con.focus.layer.shader )
					con.focus.layer.shader = builder.defaultShader();

				const { strings, numbers, arrays } = splitTypes( value );
			
				numbers.forEach( (e,i) =>
				{	switch( i )
					{ case 0:	con.focus.layer.shader.speed = e;	break;
					  case 1:	con.focus.layer.shader.scale = e;	break;
				}	} );

				strings.forEach( ( e ) =>
				{	const texture = resources.images.get( removePath( e ) );
					if( texture )
						con.focus.layer.shader.texture = texture;
					else
						painter.resolveShader( e.toLowerCase() );
				} );
			}
			return;

		  case 'layer.shader.type':
			if( !con.focus.layer.shader )
				con.focus.layer.shader = builder.defaultShader();
			painter.resolveShader( value.toLowerCase() );

		  case 'layer.shader.texture':
		  case 'layer.shader.image':
		  case 'layer.shader.src':
			if( !con.focus.layer.shader )
				con.focus.layer.shader = builder.defaultShader();

			con.focus.layer.shader.texture = resources.images.get( removePath( value ) );
			return;

		  case 'layer.blending':
		  case 'layer.blend':
		  case 'layer.operation':
			con.focus.layer.blending = painter.resolveBlendingTHREE( value );
			return;

		  case 'layer.drift':
			if( value instanceof Array )
			{
			 	builder.resolveDrift( con.focus.layer, value[0], runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
				builder.resolveDrift( con.focus.layer, value[1], runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
				builder.resolveDrift( con.focus.layer, value[2], runtime.planeOffsetS, runtime.planeDriftS );
				builder.resolveDrift( con.focus.layer, value[3], runtime.planeOffsetR, runtime.planeDriftR );
			}
			return;		
		  case 'layer.drift.up':
		  case 'layer.driftup':
		  case 'layer.up':
			builder.resolveDrift( con.focus.layer, -value, runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'layer.drift.down':
		  case 'layer.driftdown':
		  case 'layer.drift.y':
		  case 'layer.drifty':
		  case 'layer.down':
			builder.resolveDrift( con.focus.layer, value, runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'layer.drift.left':
		  case 'layer.driftleft':
		  case 'layer.left':
			builder.resolveDrift( con.focus.layer, -value, runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'layer.drift.right':
		  case 'layer.driftright':
		  case 'layer.drift.x':
		  case 'layer.driftx':
		  case 'layer.right':
			builder.resolveDrift( con.focus.layer, value, runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'layer.drift.zoom':
		  case 'layer.driftzoom':
		  case 'layer.zoom':
			builder.resolveDrift( con.focus.layer, value, runtime.planeOffsetS, runtime.planeDriftS );
			return;
		  case 'layer.drift.rotate':
		  case 'layer.driftrotate':
		  case 'layer.rotate':
		  case 'layer.drift.rot':
		  case 'layer.driftrot':
		  case 'layer.rot':
			builder.resolveDrift( con.focus.layer, value, runtime.planeOffsetR, runtime.planeDriftR );
			return;
			
		  case 'layer.fade':
			con.focus.layer.fade = builder.resolveFade( value, 'word' );
			return;

		  case 'layer.offset':
			if(parseFloat(value[0]) || parseFloat(value[1]))
				con.focus.layer.offset = [parseFloat(value[0])||0, parseFloat(value[1])||0];
			return;

		  case 'layer.alpha':
			if(parseFloat(value) != NaN)
				con.focus.layer.alpha = parseFloat(value);
			return;

		  case 'fade':
			con.fade = builder.resolveFade( value, 'word' );
			return;

		  case 'drift':
			if( value instanceof Array )
			{
			 	builder.resolveDrift( con, value[0], runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
				builder.resolveDrift( con, value[1], runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
				builder.resolveDrift( con, value[2], runtime.planeOffsetS, runtime.planeDriftS );
				builder.resolveDrift( con, value[3], runtime.planeOffsetR, runtime.planeDriftR );
			}
			return;		
		  case 'drift.up':
		  case 'driftup':
		  case 'up':
			builder.resolveDrift( con, -value, runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.down':
		  case 'driftdown':
		  case 'drift.y':
		  case 'drifty':
		  case 'down':
			builder.resolveDrift( con, value, runtime.planeOffsetY, runtime.planeDriftY, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.left':
		  case 'driftleft':
		  case 'left':
			builder.resolveDrift( con, -value, runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.right':
		  case 'driftright':
		  case 'drift.x':
		  case 'driftx':
		  case 'right':
			builder.resolveDrift( con, value, runtime.planeOffsetX, runtime.planeDriftX, builder.resolveSize, builder.resolveVelocity );
			return;
		  case 'drift.zoom':
		  case 'driftzoom':
		  case 'zoom':
			builder.resolveDrift( con, value, runtime.planeOffsetS, runtime.planeDriftS );
			return;
		  case 'drift.rotate':
		  case 'driftrotate':
		  case 'rotate':
		  case 'drift.rot':
		  case 'driftrot':
			builder.resolveDrift( con, value, runtime.planeOffsetR, runtime.planeDriftR );
			return;
			
		}
	 // update canvas context for next phrase
		hud.logError(`definition ${key} : ${value} not understood - ignored!`);			 
	},

	renderPhrase( phrase )
	{// clear text canvas
		const cnv = painter.textCanvas;
		const ctx = painter.textCanvasCtx;
		const con = painter.context;

	 // update font in canvas context
		ctx.font = `${con.fontSize}px ${con.fontFamily}`;
		if(ctx.font != `${con.fontSize}px ${con.fontFamily}`)
		{	hud.logError(`Font ${con.fontSize}px ${con.fontFamily} conflict on canvas context while rendering!`);
			throw "canvas font conflict while rendering!";
		}

	 // center on canvas
		const centerX = painter.textCanvasMaxSize[0] / 2;
		const centerY = painter.textCanvasMaxSize[1] / 2;

		const phrWidth  = phrase.width + con.fontSize * (defaults.FONT_BORDER_TOLERANCE-1) |0;
		const phrHeight = con.fontSize * defaults.FONT_BORDER_TOLERANCE |0;

		hud.log(`PHRASE "${phrase.text} [${phrWidth},${phrHeight}]"`);

		let planeZ = 0.0;
		const planes = []; //gather all rendered layers here for runtimeUnit
		
	 // iterate through layers or use defaultLayer
		const layers = con.layers.length ? con.layers : [builder.defaultLayer(0)];

		layers.forEach( (layer) =>
		{//
			let maxExtend = 0;
			planeZ += .1;
			console.log(`rendering layer ${layer.id}`);

		 // paint the stuff
			ctx.clearRect( 0, 0, painter.textCanvasMaxSize[0], painter.textCanvasMaxSize[1] );
			const operations = layer.operations.length ? layer.operations : [builder.defaultStroke(0)]; 
			for( const action of operations )
			{
				if( action.skip )
					continue;
				
				console.log(`rendering operation ${action.op}`);

				maxExtend = Math.max( action.thickness||0, action.sizeX||0, action.sizeY||0, maxExtend||0 );

				ctx.globalCompositeOperation = action.blending || "source-over";

				const posX = centerX + (action.offset ? action.offset[0]||0 : 0);
				const posY = centerY + (action.offset ? action.offset[1]||0 : 0);
				const alpha = action.alpha || 1.0;

				switch(action.op)
				{ case 'stroke':
					ctx.strokeStyle = action.color.css;
					ctx.lineWidth = action.thickness || 1.0;
					ctx.globalAlpha = alpha;
					ctx.strokeText( phrase.text, posX, posY );
					continue; 

				  case 'fill':
					ctx.fillStyle = action.color.css;
					ctx.globalAlpha = alpha
					ctx.fillText( phrase.text, posX, posY );
					continue;

				  case 'blur':
				 // different approach on blur types to reduce rendering time
					switch( action.type )
					{ case 'bold':
					  case 'linear':
					  case 'thin':
						painter.blurText( 'stroke', phrase.text, action, posX, posY, .15 );
						continue;

					  case 'star':
						painter.blurText( 'stroke', phrase.text, action, posX, posY, 1. );
						continue;

					  default: // fastest
						painter.blurTextCSS( 'stroke', phrase.text, action, posX, posY );
						continue;
					}

				  case 'texture':
					if(!action.src)
						hud.logError("BPF! layer.texture without image src in renderPhrase()!");

					painter.canvasTexture( action, phrWidth+maxExtend*2, phrHeight+maxExtend*2 )
					continue;
			}	}

		 //
			if( layer.cta )
				painter.colorToAlpha( cnv, layer.cta )

			if( layer.lighten )
				painter.lighten( cnv, struct.lighten );

			if( layer.dim )
				painter.dim( cnv, struct.dim );
			
		 // plane mesh dimensions, even.
			let intX = Math.min(
				Math.trunc( phrWidth  + maxExtend*2 ),
				 painter.textCanvasMaxSize[0] );
			let intY = Math.min(
				Math.trunc( phrHeight + maxExtend*2 ),
				 painter.textCanvasMaxSize[1] );
			
			intX = intX%2 ? intX+1 : intX;
			intY = intY%2 ? intY+1 : intY;

			if( defaults.DEBUG_BORDER )
			{// DEBUG border
				ctx.lineWidth = 1; // = 0;
				ctx.globalAlpha = 1.0;
				ctx.strokeStyle = "#FFFFFF";
				ctx.strokeRect( centerX - intX/2 +1,
								centerY - intY/2 +1,
								intX -2,
								intY -2	);
			}
			console.log("phrase position",[intX, intY]);			
		 // layer as THREEjs plane mesh
			const idPhrase = ctx.getImageData(
				centerX - intX/2,
				centerY - intY/2,
				intX,
				intY );

			let mesh;
			if( layer.shader )
				mesh = screen.asShaderPlane( idPhrase, layer.shader );
			else 
				mesh = screen.asPlane( idPhrase );


		 // set position and opacity
			console.log("phrase offset", layer.offset);
			mesh.position.set( phrase.phraseX + (layer.offset ? layer.offset[0]||0 : 0),
							   phrase.phraseY + (layer.offset ? layer.offset[1]||0 : 0),
							   planeZ );
			mesh.material.opacity = 0.;

			if( layer.blending )
			{
				mesh.material.blending = layer.blending.blending;
				if( layer.blending.blendEquation )
				{	mesh.material.blendEquation = layer.blending.blendEquation;
					mesh.material.blendSrc = layer.blending.blendSrc;
					mesh.material.blendDst = layer.blending.blendDst;
				}
			}	

			screen.scene.add( mesh );
			planes.push( builder.asRuntimePlane( 
			{	fade: con.fade || builder.resolveFade( defaults.DEFAULT_FADE ), 
				drifts: con.drifts,
				...layer, 
				mesh: mesh, 
				x: phrase.phraseX, 
				y: phrase.phraseY } ) );
		});
		resources.runtimeUnits.push( { mode: 'word', planes: planes } );
	},
};

