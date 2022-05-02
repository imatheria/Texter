importScripts('./jisonParser.js');

onmessage = function(e)
{
    console.log("jison starts parsing ...");
/* console.log probably triggers twice in here      
 *  console.debug( e );
 *  so code is either executed twice in parallel OR its just console.log trigger twice? o_0 
 */
    const script = e.data;

 // this jison thing needs to be pampered a bit
    const pampered = " "+script // have a space at start enabling initialization inside jison parser - jison really needs a lot of help to function properly
     .replace( /\r/g, '' ) // remove these ugly Windows CRLF linefeeds

    let parserIterCounter = 0;

    let result = parser.parse( pampered, function( _ )
    {   //if(parserIterCounter%16 == 0) console.log("parser progress: "+parserIterCounter);
        parserIterCounter++;
        if(parserIterCounter > 16384)
            postMessage( "terminate" );
    } );
    console.log("jison finished parsing.", result);

    postMessage( result );
}
