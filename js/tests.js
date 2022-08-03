'use strict';

import * as THREE from '../three.js-master/build/three.module.js';

import * as defaults from './constants.js';

import { resources } from './resources.js';
import { events } from './main.js';
import { builder } from './builder.js';
import { painter } from './painter.js';
import { runtime } from './runtime.js';
import { history } from './history.js';
import { hud } from './hud.js';

import { fetchTextfile, fetchImagefile } from './loaders.js';
import { jison } from './jisonWrapper.js';

import './protos.js';
import { Envelope } from './envelope.js';

/* 
 * 
 * kleine Aufgabe für die Spaßkasse
 * 
 */

import { format } from './sfp/format.js';

const assert = {
  equal: (a, b) => 
  { if( a!==b ) throw `Assertion failure: ${a} !== ${b}`; },
};

/*
 * 
 * 
 * 
 */
 
export const tests =
{
    async run()
    {
        hud.logSpecial(`running Tests...`);

        let passed = 0,
            failed = 0;
        
        const testNames = Object.keys( tests ).filter( (test) => typeof( tests[test] ) === 'function' );
        testNames.swapRemove( 'run' );

     // run test 1 by 1
        for( const name of testNames )
        {
            const test = new Promise( (res, rej) =>
            {
                setTimeout( () =>
                {   try
                    {
                        return tests[ name ](res,rej);
                    }
                    catch( error )
                    {   failed++;
                        hud.logError(`Test ${name} BPF -> ${error} ${error.fileName ? error.fileName : ""} ${error.lineNumber ? "line "+error.lineNumber : ""}`);
                        hud.logError(`Tests Aborted! ${failed} failed`);
                    }
                }, 200 );
            });
            await test
              .then(
                ( resolve ) => 
                {   passed++;
                    hud.logSuccess(`Test ${name} passed`);
                },
              ( reject ) =>
                {   failed++;
                    hud.logError(`Test ${name} failed -> ${reject}`);
                } )
              .catch( (error) =>
                {   failed++;
                    hud.logError(`Test ${name} error -> ${error}`);
                } );
        }

     // finish
        hud.logSpecial("Test finished");
        hud.logSuccess(`${passed} passed`);
        if( failed )
            hud.logError(`${failed} failed`);
        else
            hud.logSuccess(`${failed} failed`);

    },
    
/* 
 * 
 * kleine Aufgabe für die Spaßkasse
 * 
 */

    formatSFP( success, failure )
    {
      assert.equal("0,00", format(undefined));
      assert.equal("2,56", format(2.555));
      assert.equal("10.000,556", format(10000.5555, 3));
      assert.equal("100.000,28", format(100000.28374, 2, ",", "."));
      assert.equal("100,000.6", format(100000.55555, 1, ".", ","));
      assert.equal("1,5550000000", format(1.555, 10, ",", "."));
      assert.equal("-1,5555", format(-1.55555, 4));
      assert.equal("-1,5555", format("-1.55555", 4));
      assert.equal("1,555", format(1.55555, 3, ",", ".", false));
      assert.equal("1,56", format("1.5555", 2));
      
      return success();
    },

/*
 * 
 * 
 * 
 */
 
    resolveColor( success, failure )
    {
        if( JSON.stringify( painter.resolveColor("#112233") )
         != JSON.stringify( { css: "#112233", r: 17, g: 34, b: 51, a: 255 } ) )
            return failure( "painter.resolveColor(#112233)" );
            
        if( JSON.stringify( painter.resolveColor("#456") )
         != JSON.stringify( { css: "#456", r: 68, g: 85, b: 102, a: 255 } ) )
            return failure( "painter.resolveColor(#456)" );
            
        if( JSON.stringify( painter.resolveColor("#7890") )
         != JSON.stringify( { css: "#7890", r: 119, g: 136, b: 153, a: 0 } ) )
            return failure( "painter.resolveColor(#7890)" );
            
        if( JSON.stringify( painter.resolveColor("#87654321") )
         != JSON.stringify( { css: "#87654321", r: 135, g: 101, b: 67, a: 33 } ) )
            return failure( "painter.resolveColor(#87654321)" );
            
        if( JSON.stringify( painter.resolveColor("rgb(254,253,252)") )
         != JSON.stringify( { css: "rgb(254,253,252)", r: 254, g: 253, b: 252, a: 255 } ) )
            return failure( "painter.resolveColor(rgb(254,253,252))" );
            
        if( JSON.stringify( painter.resolveColor("rgba( 1 , 2,3,4)") )
         != JSON.stringify( { css: "rgba(1,2,3,4)", r: 1, g: 2, b: 3, a: 4 } ) )
            return failure( "painter.resolveColor(rgba( 1 , 2,3,4))" );
            
        if( JSON.stringify( painter.resolveColor("rgba#01234567") )
         != JSON.stringify( { css: "#01234567", r: 1, g: 35, b: 69, a: 103 } ) )
            return failure( "painter.resolveColor(rgba#01234567)" );
            
        if( JSON.stringify( painter.resolveColor("rgba#ABCD") )
         != JSON.stringify( { css: "#ABCD", r: 170, g: 187, b: 204, a: 221 } ) )
            return failure( "painter.resolveColor(rgba#ABCD)" );

        if( JSON.stringify( painter.resolveColor("rgb#ABC") )
         != JSON.stringify( { css: "#ABC", r: 170, g: 187, b: 204, a: 255 } ) )
            return failure( "painter.resolveColor(rgb#ABC)" );

        if( JSON.stringify( painter.resolveColor("rgb#4080C0") )
         != JSON.stringify( { css: "#4080C0", r: 64, g: 128, b: 192, a: 255 } ) )
            return failure( "painter.resolveColor(rgb#4080C0)" );

        if( painter.resolveColor("aglärgks") )
            return failure( "painter.resolveColor(aglärgks) must return undefined" );
        
        return success()
    },

    driftIteration( success, failure )
    {//
        const { PLANE_DRIFT_CONST, PLANE_DRIFT_VAR, PLANE_DRIFT_FNC, PLANE_DRIFT_ENV } = defaults;

        const round2 = (value) => Math.round( value*100 ) / 100;

        const plane = {};

        const resultsConst = [];
        const resultsSin = [];
        const resultsSaw = [];
        const resultsExp = [];
        const resultsPow = [];
        const resultsEnv = [];

     // resolveDrift( plane, value, assignment ) fills plane.drift
        builder.resolveDrift( plane, 5, undefined, 
            (_mesh, value) => resultsConst.push( value ) );
        
        builder.resolveDrift( plane, [1, "sin", 1],
            (_mesh, value) => resultsSin.push( value ) );

        builder.resolveDrift( plane, [.4, "saw", 2],
            (_mesh, value) => resultsSaw.push( value ) );

        builder.resolveDrift( plane, ["exp", 1, 5],
            (_mesh, value) => resultsExp.push( value ) );

        builder.resolveDrift( plane, ["pow", 2, 0],
            (_mesh, value) => resultsPow.push( value ) );

        builder.resolveDrift( plane, [[ 0., .5,"sin"], [1., 1.5], [1., .25], [0.,.5], [2.5, 1.]],
            (_mesh, value) => resultsEnv.push( value ) );

        if( [1,2,3,4].map( (i) => plane.drifts[i].length ).join('') != "1221" )
            return failure("builder.resolveDrift[ key-assignment-error ]");

        const pConst = plane.drifts[ PLANE_DRIFT_CONST ];
        const pVar = plane.drifts[ PLANE_DRIFT_VAR ];
        const pFnc = plane.drifts[ PLANE_DRIFT_FNC ];
        const pEnv = plane.drifts[ PLANE_DRIFT_ENV ].map( (e) => new Envelope( e ) );

     // linit Envelope
        runtime.time = 0;
        pEnv.forEach( (e) => e.launch({target: {uuid: '-'.repeat(24)+'TEST_ENV'}}) );
        
        while( runtime.time<=4000 )
        {
            runtime.timeSeconds = runtime.time / 1000;

            pConst.forEach( (e) => e[1]( undefined, e[0] ) );
            pFnc.forEach( (e) => e[1]( undefined, e[0][1](e[0][0]) ) );
            pVar.forEach( (e) => e[1]( undefined, e[0]() ) );
            pEnv.forEach( (e) => e.next() );

            runtime.time += 100;
        }

     //
        if( !resultsConst.every( (value) => value==5 ) )
            return failure( "PLANE_DRIFT_CONST failure!" );

        if( ![
  0,
  0.31,
  0.59,
  0.81,
  0.95,
  1,
  0.95,
  0.81,
  0.59,
  0.31,
  0,
  -0.31,
  -0.59,
  -0.81,
  -0.95,
  -1,
  -0.95,
  -0.81,
  -0.59,
  -0.31,
  0,
  0.31,
  0.59,
  0.81,
  0.95,
  1,
  0.95,
  0.81,
  0.59,
  0.31,
  0,
  -0.31,
  -0.59,
  -0.81,
  -0.95,
  -1,
  -0.95,
  -0.81,
  -0.59,
  -0.31
        ].every( (value,i) => value==round2(resultsSin[i]) ) )
            return failure( "PLANE_DRIFT_VAR sin failure!" );

        if( ![
  5,
  5.11,
  5.22,
  5.35,
  5.49,
  5.65,
  5.82,
  6.01,
  6.23,
  6.46,
  6.72,
  7,
  7.32,
  7.67,
  8.06,
  8.48,
  8.95,
  9.47,
  10.05,
  10.69,
  11.39,
  12.17,
  13.03,
  13.97,
  15.02,
  16.18,
  17.46,
  18.88,
  20.44,
  22.17,
  24.09,
  26.2,
  28.53,
  31.11,
  33.96,
  37.12,
  40.6,
  44.45,
  48.7,
  53.4,
  58.6
        ].every( (value,i) => value==round2(resultsExp[i]) ) )
            return failure( "PLANE_DRIFT_FNC exp failure!" );

        if( ![
  0,
  0.01,
  0.04,
  0.09,
  0.16,
  0.25,
  0.36,
  0.49,
  0.64,
  0.81,
  1,
  1.21,
  1.44,
  1.69,
  1.96,
  2.25,
  2.56,
  2.89,
  3.24,
  3.61,
  4,
  4.41,
  4.84,
  5.29,
  5.76,
  6.25,
  6.76,
  7.29,
  7.84,
  8.41,
  9,
  9.61,
  10.24,
  10.89,
  11.56,
  12.25,
  12.96,
  13.69,
  14.44,
  15.21,
  16
].every( (value,i) => value==round2(resultsPow[i]) ) )
            return failure( "PLANE_DRIFT_FNC pow failure!" );
[
  1,
  1.01,
  1.04,
  1.09,
  1.16,
  1.25,
  1.36,
  1.49,
  1.64,
  1.81,
  2,
  2.21,
  2.44,
  2.69,
  2.96,
  3.25,
  3.56,
  3.89,
  4.24,
  4.61,
  5,
  5.41,
  5.84,
  6.29,
  6.76,
  7.25,
  7.76,
  8.29,
  8.84,
  9.41,
  10,
  10.61,
  11.24,
  11.89,
  12.56,
  13.25,
  13.96,
  14.69,
  15.44,
  16.21,
  17
]

        if( ![
  0,
  0,
  0,
  0,
  0,
  0,
  0.07,
  0.13,
  0.2,
  0.27,
  0.33,
  0.4,
  0.47,
  0.53,
  0.6,
  0.67,
  0.73,
  0.8,
  0.87,
  0.93,
  1,
  1,
  1,
  0.9,
  0.7,
  0.5,
  0.3,
  0.1,
  0.13,
  0.38,
  0.63,
  0.88,
  1.13,
  1.38,
  1.63,
  1.88,
  2.13,
  2.38,
  2.5
].every( (value,i) => value==round2(resultsEnv[i]) ) )
            return failure( "PLANE_DRIFT_ENV envelope failure!" );

        success();
    },

 // jison parser testing
    scriptChaos: `
{
    font: ${defaults.FONT},
    color: #44FF44,
    margin: 10% ,
    layer:
{   
        write: { type: blur , color: #000000, density: 1 , thickness: 14 }
        fade: { attack:.707, hold: 3, release:5 }
        texture: { src: textures/blue_fiber.png, alpha: 50% }
        write: { type: fill , color: #443322, density: 1 , alpha: .14 }
}
layer: {
write(blur  50% .2 3)
texture( textures/TexturesCom_Crackles0069_3_seamless_S.png, .5)
fade( 1,2,3,4 ),
}

layerY:
{   write: {type: fill , color: #FFFFFF, alpha: .1 , thickness: 1}
    fade: 1 2 3 4
}
}

ɑ|Ω
{}
---alpha
< src: pexel/pexels-elina-sazonova-1838556.jpg, scale: 1, drift: 7 0 4 0, fade: 7 >

imagine a child
living in a dark place
being accused of 
being a failure

{
fade1(ease 2 3 4)
    fade1b(1, 2, 3, 4)
    fade2: ease 1 2 3
    fade3: [1 2 3 4]
    fade3b: [ease,2,3,4]
    size: 10}
blup
{   float1: 1.23, float2: .23, float3: 1.   }
three floats please
{   float1: -1.23, float2: -.23, float3: -1.    }
---
imagine a child
living in a dark place
being accused of 
being a failure
----
{try: [[1 0], [4 3]]    }
{try_again: [[[1 0], [4 3]], [1 2 3]]   }
hicks
---
< src: pexel/pexels-elina-sazonova-1838556.jpg, scale: 1, drift: 7 0 4 0, fade: 7 >
{ font:Arial, size:172, color: #44FF44
text_layer: 0, type: blur , color: #000000, density: 1 , blur: 14
text_layer: 1, type: blur , color: #FFFFFF, density: 3 , blur: 14, texture_file: textures/TexturesCom_Crackles0069_3_seamless_S.png
text_layer: 2, type: fill , alpha:.66 , color: #7777BB, texture_file: textures/TexturesCom_Crackles0069_3_seamless_S.png, texture_alpha: .5
text_layer: 3, type: stroke , thickness: 1.5, alpha:1 , color: #FFFFCC, texture_file: textures/Leather0071_3_L_texture.jpg
fade: opacity, layer:0 , attack:.707, hold: 3, release:5
fade: opacity, layer:1 , attack:.707, hold: 3, release:5
fade: opacity, layer:2 , attack: 1.414, hold: 0, release:7
fade: opacity, layer:3 , attack: .4, hold: 3, release:.33}
ɑ Ω
---
< image_file: pexel\empty-damaged-room-with-mattress-1853951.jpg, scale: 1, drift: 7 0 4 0, fade: 7 >
imagine a child
living in a dark place
being accused of 
being a failure
---
< src: pexel/blue-universe-956981d.jpg, scale: 1, drift: 7 0 4 0, fade: 7 >
{   font: ${defaults.FONT}, color: #ABC
    linespacing: 210
    margin: 33% left 5 top
    layer: { 
        write( stroke, #F88, 1, 7 )
        texture: { file: textures/pexels-innermost-limits-3894157.jPG, alpha: 0.8   }
        write( blur, #fff, 0.707, 24,12 )
        texture: { file: textures/TexturesCom_ConcreteMossy0090_7_seamless_S.png, alpha: 1  }
        write( stroke, #530, 0.5, 3 )
}   }ruach {    layer: { 
        write( blur, #57f, 1, 24,12 )
        write( blur, #4f4, 1, 18,16 )
        write( blur, #f54, 1, 12,20 )
        texture: { file: textures/TexturesCom_Crackles0069_3_seamless_S.png, alpha: 0.8, operation: subtract    }
    }
    layer: {
        write( stroke, #f99, 0.25, 1 )
        blur: { type: star, size:6 }
        write( blur, #fff, 0.25, 12,1 )
        texture: { src: textures/matrix_eye_3.png, alpha: 1, operation: subtract    }
}   }ruach {    layer:
    {   write( stroke, #fff, 1, 1 )
        blur: { type: star, size:42 }
        texture: { file: textures/icestructures_sl.png, alpha: 1    }
    }
    layer:
    {   write( stroke, #FFF, 0.5, 4 )
        texture: { file: textures/pexels-innermost-limits-3894157.jPG, alpha: .9, operation: subtract}
        write( fill, #448, 0.4 )
        write( stroke, #FFF, 0.25, 1 )
}   }ruach
{   font: Px437_IBM_ISO8.ttf, color: #44FF44
    margin: 20%
    layer:
    {   write( stroke, #FFF, 1,1 )
        write( fill, #AAF, 0.25 )
        texture: { src: textures/matrix_eye_3.png, alpha: 0.5, operation: subtract  }
}

layer:
{   texture("textures/matrix _eye_3.png" 1 .25)
    texture2: {}
    texture3()
    write: {}   }
}   
Wit|ness my re|birth

it's loneliness
that makes the loudest noise`,

    parsedChaos: `[[["_type","style"],["font","Px437_IBM_ISO8"],["color","rgb#44FF44"],["margin","10%"],["layer",""],["layer.write",""],["layer.write.type","blur"],["layer.write.color","rgb#000000"],["layer.write.density","1"],["layer.write.thickness","14"],["layer.fade",""],["layer.fade.attack",".707"],["layer.fade.hold","3"],["layer.fade.release","5"],["layer.texture",""],["layer.texture.src","textures/blue_fiber.png"],["layer.texture.alpha","50%"],["layer.write",""],["layer.write.type","fill"],["layer.write.color","rgb#443322"],["layer.write.density","1"],["layer.write.alpha",".14"],["layer",""],["layer.write",["blur","50%",".2","3"]],["layer.texture",["textures/TexturesCom_Crackles0069_3_seamless_S.png",".5"]],["layer.fade",["1","2","3","4"]],["layerY",""],["layerY.write",""],["layerY.write.type","fill"],["layerY.write.color","rgb#FFFFFF"],["layerY.write.alpha",".1"],["layerY.write.thickness","1"],["layerY.fade",["1","2","3","4"]]],"$<LF>","$<LF>","ɑ","$<CUT>","Ω","$<LF>",[["_type","style"]],"$<LF>","$<NP>","alpha","$<LF>",[["_type","image"],["src","pexel/pexels-elina-sazonova-1838556.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>","$<LF>","imagine","$<SPACE> ","a","$<SPACE> ","child","$<LF>","living","$<SPACE> ","in","$<SPACE> ","a","$<SPACE> ","dark","$<SPACE> ","place","$<LF>","being","$<SPACE> ","accused","$<SPACE> ","of","$<SPACE> ","$<LF>","being","$<SPACE> ","a","$<SPACE> ","failure","$<LF>","$<LF>",[["_type","style"],["fade1",["ease","2","3","4"]],["fade1b",["1","2","3","4"]],["fade2",["ease","1","2","3"]],["fade3",["1","2","3","4"]],["fade3b",["ease","2","3","4"]],["size","10"]],"$<LF>","blup","$<LF>",[["_type","style"],["float1","1.23"],["float2",".23"],["float3","1."]],"$<LF>","three","$<SPACE> ","floats","$<SPACE> ","please","$<LF>",[["_type","style"],["float1","-1.23"],["float2","-.23"],["float3","-1."]],"$<LF>","$<NP>","$<LF>","imagine","$<SPACE> ","a","$<SPACE> ","child","$<LF>","living","$<SPACE> ","in","$<SPACE> ","a","$<SPACE> ","dark","$<SPACE> ","place","$<LF>","being","$<SPACE> ","accused","$<SPACE> ","of","$<SPACE> ","$<LF>","being","$<SPACE> ","a","$<SPACE> ","failure","$<LF>","$<NPS>","$<LF>",[["_type","style"],["try",[["1","0"],["4","3"]]]],"$<LF>",[["_type","style"],["try_again",[[["1","0"],["4","3"]],["1","2","3"]]]],"$<LF>","hicks","$<LF>","$<NP>","$<LF>",[["_type","image"],["src","pexel/pexels-elina-sazonova-1838556.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>",[["_type","style"],["font","Arial"],["size","172"],["color","rgb#44FF44"],["text_layer","0"],["type","blur"],["color","rgb#000000"],["density","1"],["blur","14"],["text_layer","1"],["type","blur"],["color","rgb#FFFFFF"],["density","3"],["blur","14"],["texture_file","textures/TexturesCom_Crackles0069_3_seamless_S.png"],["text_layer","2"],["type","fill"],["alpha",".66"],["color","rgb#7777BB"],["texture_file","textures/TexturesCom_Crackles0069_3_seamless_S.png"],["texture_alpha",".5"],["text_layer","3"],["type","stroke"],["thickness","1.5"],["alpha","1"],["color","rgb#FFFFCC"],["texture_file","textures/Leather0071_3_L_texture.jpg"],["fade","opacity"],["layer","0"],["attack",".707"],["hold","3"],["release","5"],["fade","opacity"],["layer","1"],["attack",".707"],["hold","3"],["release","5"],["fade","opacity"],["layer","2"],["attack","1.414"],["hold","0"],["release","7"],["fade","opacity"],["layer","3"],["attack",".4"],["hold","3"],["release",".33"]],"$<LF>","ɑ","$<SPACE> ","Ω","$<LF>","$<NP>","$<LF>",[["_type","image"],["image_file","pexelempty-damaged-room-with-mattress-1853951.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>","imagine","$<SPACE> ","a","$<SPACE> ","child","$<LF>","living","$<SPACE> ","in","$<SPACE> ","a","$<SPACE> ","dark","$<SPACE> ","place","$<LF>","being","$<SPACE> ","accused","$<SPACE> ","of","$<SPACE> ","$<LF>","being","$<SPACE> ","a","$<SPACE> ","failure","$<LF>","$<NP>","$<LF>",[["_type","image"],["src","pexel/blue-universe-956981d.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>",[["_type","style"],["font","Px437_IBM_ISO8"],["color","rgb#ABC"],["linespacing","210"],["margin",["33%","left","5","top"]],["layer",""],["layer.write",["stroke","rgb#F88","1","7"]],["layer.texture",""],["layer.texture.file","textures/pexels-innermost-limits-3894157.jPG"],["layer.texture.alpha","0.8"],["layer.write",["blur","rgb#fff","0.707","24","12"]],["layer.texture",""],["layer.texture.file","textures/TexturesCom_ConcreteMossy0090_7_seamless_S.png"],["layer.texture.alpha","1"],["layer.write",["stroke","rgb#530","0.5","3"]]],"ruach","$<SPACE> ",[["_type","style"],["layer",""],["layer.write",["blur","rgb#57f","1","24","12"]],["layer.write",["blur","rgb#4f4","1","18","16"]],["layer.write",["blur","rgb#f54","1","12","20"]],["layer.texture",""],["layer.texture.file","textures/TexturesCom_Crackles0069_3_seamless_S.png"],["layer.texture.alpha","0.8"],["layer.texture.operation","subtract"],["layer",""],["layer.write",["stroke","rgb#f99","0.25","1"]],["layer.blur",""],["layer.blur.type","star"],["layer.blur.size","6"],["layer.write",["blur","rgb#fff","0.25","12","1"]],["layer.texture",""],["layer.texture.src","textures/matrix_eye_3.png"],["layer.texture.alpha","1"],["layer.texture.operation","subtract"]],"ruach","$<SPACE> ",[["_type","style"],["layer",""],["layer.write",["stroke","rgb#fff","1","1"]],["layer.blur",""],["layer.blur.type","star"],["layer.blur.size","42"],["layer.texture",""],["layer.texture.file","textures/icestructures_sl.png"],["layer.texture.alpha","1"],["layer",""],["layer.write",["stroke","rgb#FFF","0.5","4"]],["layer.texture",""],["layer.texture.file","textures/pexels-innermost-limits-3894157.jPG"],["layer.texture.alpha",".9"],["layer.texture.operation","subtract"],["layer.write",["fill","rgb#448","0.4"]],["layer.write",["stroke","rgb#FFF","0.25","1"]]],"ruach","$<LF>",[["_type","style"],["font","Px437_IBM_ISO8.ttf"],["color","rgb#44FF44"],["margin","20%"],["layer",""],["layer.write",["stroke","rgb#FFF","1","1"]],["layer.write",["fill","rgb#AAF","0.25"]],["layer.texture",""],["layer.texture.src","textures/matrix_eye_3.png"],["layer.texture.alpha","0.5"],["layer.texture.operation","subtract"],["layer",""],["layer.texture",["textures/matrix _eye_3.png","1",".25"]],["layer.texture2",""],["layer.texture3",[]],["layer.write",""]],"$<SPACE>   ","$<LF>","Wit","$<CUT>","ness","$<SPACE> ","my","$<SPACE> ","re","$<CUT>","birth","$<LF>","$<LF>","it's","$<SPACE> ","loneliness","$<LF>","that","$<SPACE> ","makes","$<SPACE> ","the","$<SPACE> ","loudest","$<SPACE> ","noise"]`,
    wipedChaos: `[[["_type","style"],["font","Px437_IBM_ISO8"],["color","rgb#44FF44"],["margin","10%"],["layer",""],["layer.write",""],["layer.write.type","blur"],["layer.write.color","rgb#000000"],["layer.write.density","1"],["layer.write.thickness","14"],["layer.fade",""],["layer.fade.attack",".707"],["layer.fade.hold","3"],["layer.fade.release","5"],["layer.texture",""],["layer.texture.src","textures/blue_fiber.png"],["layer.texture.alpha","50%"],["layer.write",""],["layer.write.type","fill"],["layer.write.color","rgb#443322"],["layer.write.density","1"],["layer.write.alpha",".14"],["layer",""],["layer.write",["blur","50%",".2","3"]],["layer.texture",["textures/TexturesCom_Crackles0069_3_seamless_S.png",".5"]],["layer.fade",["1","2","3","4"]],["layery",""],["layery.write",""],["layery.write.type","fill"],["layery.write.color","rgb#FFFFFF"],["layery.write.alpha",".1"],["layery.write.thickness","1"],["layery.fade",["1","2","3","4"]]],"$<LF>","$<LF>","ɑ","$<CUT>","Ω","$<LF>",[["_type","style"]],"$<LF>","$<NP>","alpha","$<LF>",[["_type","image"],["src","pexel/pexels-elina-sazonova-1838556.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>","$<LF>","imagine","$<SPACE> ","a","$<SPACE> ","child","$<LF>","living","$<SPACE> ","in","$<SPACE> ","a","$<SPACE> ","dark","$<SPACE> ","place","$<LF>","being","$<SPACE> ","accused","$<SPACE> ","of","$<SPACE> ","$<LF>","being","$<SPACE> ","a","$<SPACE> ","failure","$<LF>","$<LF>",[["_type","style"],["fade1",["ease","2","3","4"]],["fade1b",["1","2","3","4"]],["fade2",["ease","1","2","3"]],["fade3",["1","2","3","4"]],["fade3b",["ease","2","3","4"]],["size","10"]],"$<LF>","blup","$<LF>",[["_type","style"],["float1","1.23"],["float2",".23"],["float3","1."]],"$<LF>","three","$<SPACE> ","floats","$<SPACE> ","please","$<LF>",[["_type","style"],["float1","-1.23"],["float2","-.23"],["float3","-1."]],"$<LF>","$<NP>","$<LF>","imagine","$<SPACE> ","a","$<SPACE> ","child","$<LF>","living","$<SPACE> ","in","$<SPACE> ","a","$<SPACE> ","dark","$<SPACE> ","place","$<LF>","being","$<SPACE> ","accused","$<SPACE> ","of","$<SPACE> ","$<LF>","being","$<SPACE> ","a","$<SPACE> ","failure","$<LF>","$<NPS>","$<LF>",[["_type","style"],["try",[["1","0"],["4","3"]]]],"$<LF>",[["_type","style"],["tryagain",[[["1","0"],["4","3"]],["1","2","3"]]]],"$<LF>","hicks","$<LF>","$<NP>","$<LF>",[["_type","image"],["src","pexel/pexels-elina-sazonova-1838556.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>",[["_type","style"],["font","Arial"],["size","172"],["color","rgb#44FF44"],["textlayer","0"],["type","blur"],["color","rgb#000000"],["density","1"],["blur","14"],["textlayer","1"],["type","blur"],["color","rgb#FFFFFF"],["density","3"],["blur","14"],["texturefile","textures/TexturesCom_Crackles0069_3_seamless_S.png"],["textlayer","2"],["type","fill"],["alpha",".66"],["color","rgb#7777BB"],["texturefile","textures/TexturesCom_Crackles0069_3_seamless_S.png"],["texturealpha",".5"],["textlayer","3"],["type","stroke"],["thickness","1.5"],["alpha","1"],["color","rgb#FFFFCC"],["texturefile","textures/Leather0071_3_L_texture.jpg"],["fade","opacity"],["layer","0"],["attack",".707"],["hold","3"],["release","5"],["fade","opacity"],["layer","1"],["attack",".707"],["hold","3"],["release","5"],["fade","opacity"],["layer","2"],["attack","1.414"],["hold","0"],["release","7"],["fade","opacity"],["layer","3"],["attack",".4"],["hold","3"],["release",".33"]],"$<LF>","ɑ","$<SPACE> ","Ω","$<LF>","$<NP>","$<LF>",[["_type","image"],["imagefile","pexelempty-damaged-room-with-mattress-1853951.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>","imagine","$<SPACE> ","a","$<SPACE> ","child","$<LF>","living","$<SPACE> ","in","$<SPACE> ","a","$<SPACE> ","dark","$<SPACE> ","place","$<LF>","being","$<SPACE> ","accused","$<SPACE> ","of","$<SPACE> ","$<LF>","being","$<SPACE> ","a","$<SPACE> ","failure","$<LF>","$<NP>","$<LF>",[["_type","image"],["src","pexel/blue-universe-956981d.jpg"],["scale","1"],["drift",["7","0","4","0"]],["fade","7"]],"$<LF>",[["_type","style"],["font","Px437_IBM_ISO8"],["color","rgb#ABC"],["linespacing","210"],["margin",["33%","left","5","top"]],["layer",""],["layer.write",["stroke","rgb#F88","1","7"]],["layer.texture",""],["layer.texture.file","textures/pexels-innermost-limits-3894157.jPG"],["layer.texture.alpha","0.8"],["layer.write",["blur","rgb#fff","0.707","24","12"]],["layer.texture",""],["layer.texture.file","textures/TexturesCom_ConcreteMossy0090_7_seamless_S.png"],["layer.texture.alpha","1"],["layer.write",["stroke","rgb#530","0.5","3"]]],"ruach","$<SPACE> ",[["_type","style"],["layer",""],["layer.write",["blur","rgb#57f","1","24","12"]],["layer.write",["blur","rgb#4f4","1","18","16"]],["layer.write",["blur","rgb#f54","1","12","20"]],["layer.texture",""],["layer.texture.file","textures/TexturesCom_Crackles0069_3_seamless_S.png"],["layer.texture.alpha","0.8"],["layer.texture.operation","subtract"],["layer",""],["layer.write",["stroke","rgb#f99","0.25","1"]],["layer.blur",""],["layer.blur.type","star"],["layer.blur.size","6"],["layer.write",["blur","rgb#fff","0.25","12","1"]],["layer.texture",""],["layer.texture.src","textures/matrix_eye_3.png"],["layer.texture.alpha","1"],["layer.texture.operation","subtract"]],"ruach","$<SPACE> ",[["_type","style"],["layer",""],["layer.write",["stroke","rgb#fff","1","1"]],["layer.blur",""],["layer.blur.type","star"],["layer.blur.size","42"],["layer.texture",""],["layer.texture.file","textures/icestructures_sl.png"],["layer.texture.alpha","1"],["layer",""],["layer.write",["stroke","rgb#FFF","0.5","4"]],["layer.texture",""],["layer.texture.file","textures/pexels-innermost-limits-3894157.jPG"],["layer.texture.alpha",".9"],["layer.texture.operation","subtract"],["layer.write",["fill","rgb#448","0.4"]],["layer.write",["stroke","rgb#FFF","0.25","1"]]],"ruach","$<LF>",[["_type","style"],["font","Px437_IBM_ISO8.ttf"],["color","rgb#44FF44"],["margin","20%"],["layer",""],["layer.write",["stroke","rgb#FFF","1","1"]],["layer.write",["fill","rgb#AAF","0.25"]],["layer.texture",""],["layer.texture.src","textures/matrix_eye_3.png"],["layer.texture.alpha","0.5"],["layer.texture.operation","subtract"],["layer",""],["layer.texture",["textures/matrix _eye_3.png","1",".25"]],["layer.texture2",""],["layer.texture3",[]],["layer.write",""]],"$<SPACE>   ","$<LF>","Wit","$<CUT>","ness","$<SPACE> ","my","$<SPACE> ","re","$<CUT>","birth","$<LF>","$<LF>","it's","$<SPACE> ","loneliness","$<LF>","that","$<SPACE> ","makes","$<SPACE> ","the","$<SPACE> ","loudest","$<SPACE> ","noise"]`,

    jisonParseChaos( success, failure )
    {// check chaotic script input 
//      const wiped = await jison.parse( tests.scriptChaos );
    
        const prom = new Promise((resolve,reject) =>
        {   jison.worker.onmessage = (response) => 
            {   if(response.data == "terminate")
                {   hud.logError("parser hangup -> terminated!");
                    jison.worker.parser.terminate();
                    reject( response );
                }
                else
                {   console.log("parser success!");
                 // initiate loading of needed resources (fonts and images)
                    resolve( response.data );
                }
            };
            jison.worker.onerror = (error) =>
            {   if(!!error.message)
                {   if(error.message.includes( "this._input is undefined" ))
                        hud.logError("script is not parseable!");
                    else
                        hud.logError(error.message.split('\n').slice(0,2).join(" "));
                }
            };
            
         // catch other possible responses
            jison.worker.onmessageerror = function(e)
            {   hud.logError("parser FAILED!" + JSON.stringify(e)); };
            jison.worker.onrejectionhandled = function(e)
            {   hud.logError("parser script REJECTED!" + JSON.stringify(e));    };
            jison.worker.onunhandledrejection = function(e)
            {   hud.logError("parser script REJECTED unhandled!" + JSON.stringify(e));  };

            jison.worker.postMessage( tests.scriptChaos );
        });

        prom.then( (result) =>
        {
            if( JSON.stringify( result ) != tests.parsedChaos )
            {console.log( "BLUP", JSON.stringify( result ) );
                return failure( "jison parsing failure!" );
            }
            const wiped = jison.wipe( result );
            if( JSON.stringify( wiped ) != tests.wipedChaos )
            {console.log( "BLUP", JSON.stringify( wiped ) );
                return failure( "jison.wipe() failure!" );
}
            return success();
        } )
        .catch( (fail) => failure( "jison parser crashed!" ) );
    },
    

    
/*  async jisonParse( success, failure )
    {
        const parsed = jison.parse( tests.script );
        
        if( JSON.stringify(parsed) != tests.scriptParsed )
            return failure( "jison.parse() failure!" );

        if( commands.find( e => e[0][0] != '_type' ) )
// Test a complete script parse and render into runtimeUnits
            return failure( "jison.parse() missing '_type' entry in output!" );
    },
    
    expandParse( success, failure )
    {
        const expanded = builder.expandParsedData( tests.scriptParsed );
console.log( "expanded", expanded );
    },

    runtimeBuilder( success, failure )
    {
        fontloader.stageUrl( defaults.FONT );
        
tests.wiped2 = "still needed";
        const expanded = builder.expandParsedData( JSON.parse(tests.wiped2) );

        if( JSON.stringify( expanded ) != `` )
        {   console.log( JSON.stringify( expanded ) );
            return failure( "builder.expandParsedData failure" );
        }

        const temp = resources.runtimeUnits;
        resources.runtimeUnits = [];
        
     // start canvas-rendering in painter   
        for(const progress of builder.renderIter( expanded, name ))
            console.log( progress );

console.table(resources.runtimeUnits);

console.log("runtimeBuilder() failure", failure);
        resources.runtimeUnits = temp;
        
        return failure();
    },*/

    envelopeIteration( success, failure )
    {
     // check isEnvelope
        if( !builder.isEnvelope( ["blob", [0,0], "blup", [1,1],[0,2]] ) )
            return failure( "builder.isEnvelope FAIL 1" );
        if( !builder.isEnvelope( [["133ms","2em"], "blup", [1,1],[0,2]] ) )
            return failure( "builder.isEnvelope FAIL 2" );
        if( builder.isEnvelope( 2 ) )
            return failure( "builder.isEnvelope FAIL 3" );
        if( builder.isEnvelope( "blup" ) )
            return failure( "builder.isEnvelope FAIL 4" );
        if( builder.isEnvelope( ["blup", "blob!"] ) )
            return failure( "builder.isEnvelope FAIL 5" );

     // check iteration output
        const output = [];
        const env = new Envelope(
        {   envelope: [[ 0., .5], [1., 1.5], [1., .25], [0.,.5], [2.5, 1.]],
            startValue: 20.0,
            onValue: (_mesh,v) => output.push( "VALUE"+(v?parseFloat(v.toFixed(2)):v)),
            onWait: (v) => output.push( "WAIT"+v ),
            onFinish: () => output.push( "FINISH" ),
            target: {uuid: '-'.repeat(24)+'TEST_ENV'},
        });

        
        for( runtime.time = 0, env.launch(); runtime.time<4000; runtime.time += 100 )
            env.next();

        if( `["VALUE20","VALUE16","VALUE12","VALUE8","VALUE4","VALUE0","VALUE0.07","VALUE0.13","VALUE0.2","VALUE0.27","VALUE0.33","VALUE0.4","VALUE0.47","VALUE0.53","VALUE0.6","VALUE0.67","VALUE0.73","VALUE0.8","VALUE0.87","VALUE0.93","VALUE1","VALUE1","VALUE1","VALUE0.9","VALUE0.7","VALUE0.5","VALUE0.3","VALUE0.1","VALUE0.13","VALUE0.38","VALUE0.63","VALUE0.88","VALUE1.13","VALUE1.38","VALUE1.63","VALUE1.88","VALUE2.13","VALUE2.38","VALUE2.5","FINISH"]` != JSON.stringify(output))
            failure( "envelopeIteration values failure!" );


        const temp = history.events;
        history.events = [];
        output.length = 0;
        
        env.launch( { envelope: [[1,.7], ["word"], [2,.4], ["page"], [3,1], ["line"], [0,.4]] } );

        for( runtime.time = 0; runtime.time<500; runtime.time += 100 )
            env.next();

        history.pushEvent( 'line' );
        Envelope.unfreeze( 'line' );
        
        for( ; runtime.time<1000; runtime.time += 100 )
            env.next();


        history.pushEvent( 'word' );
        Envelope.unfreeze( 'word' );
        
        for( ; runtime.time<2000; runtime.time += 100 )
            env.next();

        history.pushEvent( 'page' );
        Envelope.unfreeze( 'page' );

        for( ; runtime.time<3000; runtime.time += 100 )
            env.next();

        history.pushEvent( 'line' );
        Envelope.unfreeze( 'line' );

        for( ; runtime.time<4000; runtime.time += 100 )
            env.next();

        if( JSON.stringify( output ) != JSON.stringify(
            [ "VALUE0",
              "VALUE0.14",
              "VALUE0.29",
              "VALUE0.43",
              "VALUE0.57",
              "VALUE0.71",
              "VALUE0.86",
              "WAITword","VALUE1","VALUE1","VALUE1.25","VALUE1.5","VALUE1.75","WAITpage","VALUE2","VALUE2","VALUE2.1","VALUE2.2","VALUE2.3","VALUE2.4","VALUE2.5","VALUE2.6","VALUE2.7","VALUE2.8","VALUE2.9","VALUE3","VALUE2.25","VALUE1.5","VALUE0.75","VALUE0","FINISH"
            ]) )
            return failure("waitstated values failure");


        history.events = [];
        output.length = 0;
        
        env.launch( { envelope: [   [1.0, .8],
                                    [.4, .4],
                                    ["image"],
                                    [0.0, 1] ] } );

        for( runtime.time = 0; runtime.time<1500; runtime.time += 100 )
            env.next();

        history.pushEvent( 'image' );
        Envelope.unfreeze( 'image' );
        
        for( ; runtime.time<3000; runtime.time += 100 )
            env.next();

        if( JSON.stringify( output ) != JSON.stringify(
            [ "VALUE0",
              "VALUE0.13",
              "VALUE0.25",
              "VALUE0.38",
              "VALUE0.5",
              "VALUE0.63",
              "VALUE0.75",
              "VALUE0.88",
              "VALUE1",
              "VALUE0.85",
              "VALUE0.7",
              "VALUE0.55",
              "WAITimage",
              "VALUE0.4",
              "VALUE0.4",
              "VALUE0.36",
              "VALUE0.32",
              "VALUE0.28",
              "VALUE0.24",
              "VALUE0.2",
              "VALUE0.16",
              "VALUE0.12",
              "VALUE0.08",
              "VALUE0.04",
              "VALUE0",
              "FINISH"
            ]) )
            return failure("smooth fade values failure");

        history.events = temp;              
        success()
    },

};

