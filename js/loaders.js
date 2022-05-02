'use strict';

import { hud } from './hud.js';
import { resources } from './resources.js';
import { removePath, fontNameFromFilename } from './tools.js';

function openHudResource( fileName )
{
    hud.setFieldState( hud.resourceField( fileName ), "outstanding" );
}

function resolveHudResource( fileName )
{   
    resources.solveRequired( fileName );
    hud.setFieldState( hud.resourceField( fileName ), "ready" );
}

function removeHudResource( fileName )
{
    if(!resources.isRequired(fileName))
    {
        if( !resources.images.has( fileName ) )
            if( !resources.fonts.has( fileName ) )
                hud.removeField( hud.resourceField( fileName ) );
    }
}

export const fontLoader =
{   
    fontAvailable( fontFamily )
    {
        const cnv = document.createElement('canvas');
        const ctx = cnv.getContext('2d');
        ctx.font = `12px ${fontFamily}`;
        if(ctx.font == `12px ${fontFamily}`)
            if( ctx.measureText( "asdf" ).width > 0 )
                return true;

        return false;
    },

    stageArrayBuffer( fontName, fileName, buffer )
    {
        const font = new FontFace( fontName, buffer );

        if(font.status == "error")
        {   removeHudResource( fileName );
            console.error("font loading error state ", font);
            hud.logError( `font "${fileName}" loading error state!` );
        }

        document.fonts.add( font );

        if(!fontLoader.fontAvailable( font.family ))
        {   removeHudResource( fileName );
            hud.logError( `font "${fileName}" canvas usage failure!` );
            return;
        }
        
        resources.fonts.set( fileName, font.family );
        resolveHudResource( fileName );
        hud.logSuccess(`font "${fileName}" loaded.`);
    },
    
    stageUrl( src )
    {// loads a url as font into resources.fonts
        const fontName = fontNameFromFilename( src );
        const fileName = removePath( src );

     // check if src already exists as font
        if( fontLoader.fontAvailable( src ) )
        {   resources.fonts.set( fileName, src );
            resolveHudResource( fileName );
            return;
        }
        
     // else load file into FontFace
        openHudResource( fileName );

        const fontFace = new FontFace( fontName, `url('${src}')`, {} )
        .load()
        .then( font => 
        {   document.fonts.add( font );

            if(!fontLoader.fontAvailable( font.family ))
            {   removeHudResource( fileName );
                throw `font "${fileName}" canvas usage failure!`;
            }
            
            hud.log(`font ${font.family} loaded.`);
            resources.fonts.set( fileName, font.family );
            resolveHudResource( fileName );
        } )
        .catch( (error) =>
        {// fallback: Try to load url with fetch
            fetch(src)
              .then( (response) =>
                {   if(!response.ok)
                    {   removeHudResource( fileName );
                        throw "Network fail loading "+src;
                    }
                    return response.blob();
                } )
              .then( (blob) => blob.arrayBuffer() )
              .then( (buffer) => fontLoader.stageArrayBuffer( fontName, fileName, buffer ) )
              .catch( (error) => hud.logError( error ) );
        } );
    },

    stageFile( file )
    {// loads a File object as font into resources.fonts
        const fontName = fontNameFromFilename( file.name );
        const fileName = removePath( file.name );

        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = () => fontLoader.stageArrayBuffer( fontName, fileName, reader.result );
        reader.onerror = () => hud.logError("unable to load font "+file.name);
    },
}

export const imageLoader =
{
    stageUrl( src )
    {// loads a url as image into resources.images
        const filename = removePath( src );
        openHudResource( filename );
        
        const img = new Image();
        img.src = src;
        img.decode().then( () =>
        {   hud.log(`image ${src} loaded.`);
            resources.images.set( filename, img );
            resources.solveRequired( filename );
            resolveHudResource( filename );
        } )
        .catch( (error) =>
        {//
            removeHudResource( src );
            hud.log( "Network fail loading "+src );
        } );
    },

    stageFile( file )
    {// load file contents
        const filename = removePath( file.name );

        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () =>
        {   //console.log("onloadend:\nfile.name "+file.name+"\nreader.result "+reader.result);
            hud.logSuccess("image "+file.name+" loaded.");
            const img = new Image();
            img.src = reader.result;
            img.onloadend = () => 
            {   hud.log(`image ${file.name} loaded.`);
                resources.images.set( filename, img );
                resources.solveRequired( filename );
                resolveHudResource( filename );
            };
            img.onerror = (error) => 
            {//
                removeHudResource( src );
                throw "invalid file content "+src;
            };

        };
        reader.onerror = function()
        {   hudError("unable to load image "+file.name);
            removeHudResource( filename );
        };
    },
}

export const fetchTextfile = ( src ) =>
{   const utf8Decoder = new TextDecoder('utf-8');

    return fetch(src)
      .then( (response) =>
        {   if(!response.ok)
            {   removeHudResource( src );
                throw `Network fail loading '${src}'`;
            }
            return response.blob();         
        } )
      .then( (blob) => blob.arrayBuffer() )
      .then( (buffer) => utf8Decoder.decode( buffer ) )
};

export const fetchImagefile = ( src ) => new Promise((resolve,reject) =>
{   let img = new Image();
    img.addEventListener('load', () => resolve( img ));
    img.addEventListener('error', (err) => reject( err ));
    img.src = src;
} );
