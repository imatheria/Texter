(function()
{// Arrays shall swapRemove
    Array.prototype.swapRemoveIndex = function( i )
    {   this[i] = this[this.length-1];
        this.length--;
        return;
    };
    Array.prototype.swapRemove = function( e )
    {   for(let i=0; i<this.length; i++)
        {   if(this[i] == e)
            {   this[i] = this[this.length-1];
                this.length--;
                return;
    }   }   };
    Array.prototype.last = function()
    {   return this[this.length-1]  };

 // clone nested arrays and strings, to level 2 only
    Array.prototype.lvl2Clone = function()
    {   return this.map( (e) => e.length ? e.concat() : e );    }

})();
