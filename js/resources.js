'use strict';

import { hud } from './hud.js';
import { jison } from './jisonWrapper.js';

import { fontLoader, imageLoader, fetchTextfile } from './loaders.js';
import { removePath, fileType, splitTypes } from './tools.js';

export const resources =
{
    images: new Map(), // stores Image objects
    fonts: new Map(), // stores Font objects
    scripts: new Map(), // stores plain text scripts
    parsed: new Map(), // stores parsed data from scripts

 //
    cnvImages: new Map(), // stores a Canvas for processed images
    cnvImageSeamless: new Map(), // stores a Canvas for processed images as seamless

 // 
    renderData: {}, // temp store expanded parsed data while canvas-rendering
    runtimeUnits: [], // prepared perfromance data for iterating at runtime

    acceptedFontFileTypes: [".ttf", ".woff", ".woff2", ".otf"],
    acceptedImageFileTypes: [".jpg", ".jpeg", ".png"],

 // file requirements handling
    requiredFiles: new Map(), // rendering starts only if this is empty

    addRequired( script, filename )
    {   
        if(!resources.requiredFiles.get(script))
            resources.requiredFiles.set(script, []);
        if(!resources.requiredFiles.get(script).includes( filename ))
            resources.requiredFiles.get(script).push( filename );
    },
    
    isRequired: ( filename, script ) => script ?
        resources.requiredFiles.get(script).includes( filename ) :
        Array.from(resources.requiredFiles.keys())
            .find( (script) => resources.requiredFiles.get(script).includes( filename ) ),
    
    solveRequired( filename, script )
    {
        if( script )
        {   resources.requiredFiles.get(script).swapRemove( filename );
            if( resources.requirementsMet( script ) )
                hud.resolveScriptSlot( script );
        }
        else
        {   resources.requiredFiles.forEach( (value, key) =>
            {
                value.swapRemove( filename )
                if( resources.requirementsMet( key ) )
                    hud.resolveScriptSlot( key );
            } );
        }
    },
    
    requirementsMet: ( script ) =>
    {
        if(script)
        {   const r = resources.requiredFiles.get(script);
            return !r || !r.length;
        }

        return Array.from( resources.requiredFiles.keys() )
        .reduce( (a,s) => a + resources.requiredFiles.get(s).length, 0 ) == 0;
    },

    stageScriptFromFile( file )
    {// load file contents
        let reader = new FileReader()
        reader.onloadend = () => resources.stageScript( reader.result, file.name );
        reader.onerror = (error) =>
        {   hud.logError("cannot read file contents!");
            hud.removeScriptSlot( file.name );
        };
        reader.readAsText(file);
    },

    stageScript( script, name )
    {   const s = script.endsWith("\n") ? script : script+"\n"
        return new Promise( (resolve, reject) =>
        {
            hud.openScriptSlot( name );
            resolve( jison.parse( s ) )
        } )
        .then( (parsed) => 
        {
            resources.scripts.set( name, s );
            resources.parsed.set( name, parsed );
            resources.stageScriptRequirements( parsed, name );
        } )
        .catch( (error) =>
        {
            hud.removeScriptSlot( name );
            throw error;
        } );
    },

    stageScriptRequirements( parsed, scriptName )
    {
        const stageImageFile = ( src ) =>
        {   const key = removePath( src );
            if(!resources.images.has( key ))
            {   imageLoader.stageUrl( src ) ;
                resources.addRequired( scriptName, key );
            }
        };  
        const stageFontFile = ( src ) =>
        {   const key = removePath( src );
            if(!resources.fonts.has( key ))
            {   fontLoader.stageUrl( src );
                resources.addRequired( scriptName, removePath( src ) );
            }
        };

        const commands = parsed.filter( e => e instanceof Array );
        
        const styles = commands.filter( e => e[0][1] == 'style' );
        const images = commands.filter( e => e[0][1] == 'image' );
        const arrays = commands.filter( e => e[0][1] == 'array' );

        styles.forEach( e =>
            e.filter( ([k,v]) =>
                v && ['src', 'image', 'file', 'font'].find( f => k.endsWith( f ) ) )
            .forEach( ([k,v]) =>
            {// in case of spaces in filename its an array
                const filename = (v instanceof Array) ? v.join(" ") : v;

                if( typeof(filename) !== 'string' )
                    return;

             // check if src already exist as font
                if( fontLoader.fontAvailable( filename ) )
                {   resources.fonts.set( filename, filename );
                    resources.solveRequired( filename );
                    hud.setFieldState( hud.resourceField( filename ), "ready" );
                    return;
                }

             // identify resource by filetype
                const type = fileType( filename );
                
                if(resources.acceptedFontFileTypes.includes( type ))
                    stageFontFile( filename );
                if(resources.acceptedImageFileTypes.includes( type ))
                    stageImageFile( filename );
            } ) );

        styles.forEach( e =>
            e.filter( ([k,v]) =>
                v && k.endsWith( 'texture' ) )
            .forEach( ([k,v]) =>
            {// identify texture( <filename> )
                const { strings } = splitTypes( v );
                if( !strings[0] )
                    return;

             // identify resource by filetype
                if(resources.acceptedImageFileTypes.includes( fileType( strings[0] ) ))
                    stageImageFile( strings[0] );
            } ) );
    
        images.forEach( e =>
            e.filter( ([k,v]) =>
                v && ['src', 'image', 'file'].find( f => k.endsWith( f ) ) )
            .forEach( ([k,v]) =>
            {   const filename = (v instanceof Array) ? v.join(" ") : v;

                if( typeof(filename) !== 'string' )
                    return;

                if( resources.acceptedImageFileTypes.includes( fileType( filename ) ) )
                    stageImageFile( filename );
            } ) );
                
        arrays.map( e => e[1][1] ).forEach( e =>
        {// identify resource by filetype
            if(typeof(e) != 'string') return;
            const dot = e.lastIndexOf('.');
            if( dot == -1 ) return;
            
            const type = e.substring( dot ).toLowerCase();

            if(resources.acceptedFontFileTypes.includes( type ))
                stageFontFile( e );
            if(resources.acceptedImageFileTypes.includes( type ))
                stageImageFile( e );
        } );

     // try to resolve script by polling requirements
        const check = () =>
        {
            if( resources.requirementsMet( scriptName ) )
            {
                hud.resolveScriptSlot( scriptName );
                if( resources.requirementsMet() )
                {   hud.show( '.start' );
                    hud.info( 'hit [Enter] to start rendering' );
                }
            }
            else 
                setTimeout( check, 1000 );
        };
        check();
    },

    asyncAutoLoad: async ( filenames ) =>
    {
        for( const filename of filenames )
        {
            const fn = removePath( filename.trim() )
            try
            {
    console.log(" ### await",filename);
                const script = await fetchTextfile( filename.trim() )
    console.log(" ### script",script);
                const staged = await resources.stageScript( script, fn );
    console.log(" ### staged",staged);
            }
            catch (error)
            {   hud.logError(`autoload script ${filename} failed: ${error}`);
                console.error( `-> ${error.fileName ? error.fileName : ""} ${error.lineNumber ? "line "+error.lineNumber : ""}` );
            }
        }
    },  
};
