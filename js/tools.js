'use strict';

// timeout
export const sleep = (ms) => new Promise((resolve) => setTimeout( resolve, ms));

// filename & path operations
export const removePath = ( filename ) => filename.substring(filename.lastIndexOf('/')+1);
export const fileType =( filename ) => filename.substring(filename.lastIndexOf('.')).toLowerCase();
export const fontNameFromFilename = ( url ) => url.substring( url.lastIndexOf("/")+1, url.lastIndexOf(".") );

export const splitMeasurement = (number) =>
{// split '80px' into 80 and 'px'
    if( typeof(number) == 'number' )
        return [ number, '' ];

    const num = parseFloat( number );
    const mes = number.substring( num.toString().length );

    return [ num, mes ];
};


export const splitTypes = ( stuff ) =>
{// returns [[strings], [numbers], [arrays]]
    const ret = { strings: [], numbers: [], arrays: [] }

    if( stuff instanceof Array )
    {   return stuff.reduce( (a, e) =>
        {
            if( e instanceof Array )
            {   a.arrays.push( e );
                return a;
            }
            if( !isNaN( parseFloat(e) ) )
            {   a.numbers.push( e );
                return a;
            }
            if( typeof(e) === 'string' )
            {   a.strings.push( e );
                return a;
            }
        }, ret );
    }
    
    if( !isNaN( parseFloat(stuff) ) )
    {   const [ number, measurement ] = builder.splitMeasurement( stuff )
        return { ...ret, numbers: [number] };
    }
    
    if( typeof(stuff) === 'string' )
        return { ...ret, strings: [stuff] };

    return ret;
};

