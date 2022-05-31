

![TEXTER](https://github.com/imatheria/Texter/blob/main/images/texter_inv.jpg)


This piece of website enables anyone to perform or to screen capture live-performed text display on background pictures. Especially the ones knowing how to work with layered images, blending and seamless textures will create decent looking performances - as long as they can handle adding some JSON-like style-definitions to their desired texts. 

The only requirement is a browser supporting ES6 and WebGL, as most of actual browsers do. Texter is able to work completely serverless. All required script-files, fonts and textures may be dropped into the browser window.

Texter is hand-made and comes with minimal dependencies. Except for THREE.js and a jison parser, it requires nothing else. 


### Try it here on Github

Get a first glance of Texter in the examples<br>
 · [Imagination](https://imatheria.github.io/Texter/texter.html?examples/sheets/imagine.txt)<br>
 · [Matrix](https://imatheria.github.io/Texter/texter.html?examples/sheets/matrix_still.txt)<br>
 · [Loneliness](https://imatheria.github.io/Texter/texter.html?examples/sheets/loneliness.txt)<br>
 · [BPF](https://imatheria.github.io/Texter/texter.html?examples/sheets/bpf.txt)<br>
 
but **first know what happens** when you click the links:<br>
It auto-loads a small example given by the url. 
 - first wait until all requred files got fetched and the start button appears.
 - Press `[Enter]` to start rendering.
It will go FullScreen. Rendering process may take a little while.
 - as soon as the screen turns black, use arrow keys to display words or lines. It works forward and backward.
 - hit `[Esc]` to exit FullScreen.


### Write your own Texter scripts

If you want to try your own scripts together with images and fonts, you can use Texter serverlessly. Call https://imatheria.github.io/Texter/texter.html and drop image-, font- and text-files into the browser-window.

Lets say you want to display a "Hello World" in big red letters on a background image `my_background.jpg` using your own font `my_font.ttf` you have on your harddisk. So you open your desired Text-Editor and type in 
```
< image: my_background.jpg >
{ font: my_font.ttf
  layer: {  fill( #F77 )    }
}
Hello World
```

and save it. Then you drop the file into Texter. You'll see both `my_background.jpg` and `my_font.ttf` appear in dark grey on the right side. Now you drop the 2 required files also, wait until everything gets green and you're ready to go.

More Details will come in the Tutorial and Documentation soon.  

Dropped Text-files are parsed instantly. If parser fails, the file is rejected. If you're unsure if the browser accepts a font, just drop it in Texter and see if it gets green. A test output of the font will be shown on success. I found that firefox accepts more fonts than chrome.


### Have Texter auto-load your stuff

Texter tries to auto-load every required file from server. So if you give a path to the filename, say `< image: examples/images/sand_seamless.jpg >` , it looks for it on the server next to the texter.html file in the specified folder. 

To auto-load a script from server, just place it in the URL behind a `?`, as seen in the examples above.

The fastest way of running Texter and write scripts for now is having it on a statric web server on your own machine. If you are on Windows, [HFS](http://www.rejetto.com/hfs/) does this job quite well. Or using nodejs, npm http-serve does also. Then open the texter.html in your browser and try out 
whatever you want :-)

### Key bindings

In HUD-mode where you can drop files (you see the Texter Logo and the stars), the following Keys are assigned:
<br>· `[D]` : Display dev notes.
<br>· `[H]` : Display key-bindings for performance-mode. (as below)
<br>· `[L]` : Display logs.
<br>· `[S]` : show/hide stars.
<br>· `[Ctrl+T]` : run unit-tests.
<br>· `[C]` : Clear hud, hide HUD-Elements except title and start-button.
<br>· `[F]` : Fullscreen mode on/off.
<br>· `[Esc]` : reset HUD to initial state.
<br>· `[M]` : Matrix Eye. Activate a shader demonstration. Something that may be possible on text display in near future.

In performance-mode (runtime), the following Keys are assigned:
<br>· `[⇐], [⇒]` : show next/previous word.
<br>· `[⇑], [⇓]` : show next/previous line.
<br>· `[pgUp], [pgDn]` : show next/previous page.
<br>· `[Enter]` : Display next visible Emelent (word or image).
<br>· `[Esc]` : Exit Fullscreen.
<br>· `[Ctrl+F]` : display framerate.


### Development progress

Unfortunately, there is a little chance that we still encounter things that don't work poperly. There may be unexpected browser-hangups or unexpected behaviour. There may be collisions between the Texter-Routines and the ones from Github-Pages. I am not able to test this software in all available browsers, i mostly go with Chromium and Firefox. Surely there are some bugs left in Texter. Let me know about any hassle with it. But for now, **just assume everythings works fine and give it a try.** It works on my machines. One of them is running a 4k-screen:blush:.<br>
<br>
· Right now, i am tracking an issue of dropped layers if style changes multiple times in a script.<br>
· Should i package this inside npm? Not sure. Taking care of other stuff right now.<br>


### stuff to pop up here in near future

* even more working examples
* more documentation.


---

regards & keep a little patience

Kristian
