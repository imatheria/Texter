// format
// have a number converted to a String with a bunch of format options
//
export function format( 
  value, 
  precision = 2, 
  separator = ",", 
  thousands = ".", 
  round = true )
{    
  let v = parseFloat( value )
  if( isNaN( v ) )
    return "0,00";
 
  // round/cap to precision and convert to string
  const e = Math.pow(10,precision);
  v = round 
    ? Math.round( v*e ) / e
    : Math.floor( v*e ) / e;
  v = v.toString();
  
  // apply floating-point and thousands separators
  v = v.split(".");
  if( thousands )
  {
    const sep = [];
    let i=v[0].length - 3;
    while( i>0 ) 
    {
      sep.push( v[0].slice( i , i+3 ) );
      i-=3;
    }
    sep.push( v[0].slice( 0 , i+3 ) );
    
    v[0] = sep.reverse().join( thousands );
  }
  
  // append zeroes and end to match precision
  if( v[1].length < precision )
    v[1] += '0'.repeat( precision - v[1].length );
    
  return v.join( separator || '.' );
}
