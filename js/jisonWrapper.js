'use strict';

import { hud } from './hud.js';

export const jison =
{   worker: new Worker('./js/jisonWorker.js'),

    parse: ( script, name ) =>
        new Promise((resolve,reject) =>
        {   jison.worker.onmessage = (response) => 
            {   if(response.data == "terminate")
                {   hud.logError("parser hangup -> terminate!");
                    jison.worker.parser.terminate();
                    reject( response );
                }
                else
                {   console.log("parser finished!");
                 // initiate loading of needed resources (fonts and images)
                    const parsed = jison.wipe( response.data );
                    resolve( parsed );
                }
            };
            jison.worker.onerror = (error) =>
            {   if(!!error.message)
                {   if(error.message.includes( "this._input is undefined" ))
                        hud.logError("script is not parseable!");
                    else
                        hud.logError(error.message.split('\n').slice(0,2).join(" "));
                }
                console.log("parser ERROR!", error);
            };
            
         // catch other possible responses
            jison.worker.onmessageerror = function(e)
            {   console.log("parser FAILED!", e);   };
            jison.worker.onrejectionhandled = function(e)
            {   console.log("parser script REJECTED!", e);  };
            jison.worker.onunhandledrejection = function(e)
            {   console.log("parser script REJECTED unhandled!", e);    };
            
            jison.worker.postMessage( script );
            hud.log("script "+name+" jison worker start");
        }),

    wipe( parsed )
    {// · catch and wipe human-input   
        const cleanKeys = (entries) => 
        {   let ret = [[ '_type', entries[0][1] ]];
            //let id;
            for( let [k,v] of entries.slice(1) )
            {// conform keys
                k = k.toLowerCase()
                    .replaceAll("_","")
                    .replaceAll("-","")
                    .replaceAll(" ",""); // really???

             // look for filenames stored as arrays
                if( ['font', 'image', 'file'].find( (f) => k.includes(f) ) )
                    if( v instanceof Array )
                     // store them as strings
                        v = v.join(" ");
                    
                ret.push( [k,v] );
            }
            return ret;
        };

        return parsed.map( e => (e instanceof Array) ? cleanKeys( e ) : e );
    },
};
