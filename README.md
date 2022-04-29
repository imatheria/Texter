

![TEXTER](https://github.com/imatheria/Texter/blob/main/images/texter_inv.jpg)


This application enables anyone to perform or to screen capture live-performed text display on background pictures. Especially the ones knowing how to work with layered images, blending and seamless textures will create decent looking performances - as long as they can handle adding some JSON-like style-definitions to their desired texts. On my machine, Texter renders on a 4k screen.

The only requirement is a browser supporting ES6 and WebGL, as most of actual browsers do. Texter is able to work completely serverless. All required script-files, fonts and textures may be dropped into the browser window.

I use this in Firefox and sometimes Chrome, and as for now, Firefox performs best for this.

Texter comes with **minimal dependencies.** Except for THREE.js and a jison parser, it requires **nothing** else. This makes it a bit challenging for me finding the right open-source-license for it. All of it is hand made, and it reached a quite stable state recently.


### Try it here on Github

Get a first glance of Texter here -> https://imatheria.github.io/Texter/texter.html?examples/sheets/imagine.txt. It auto-loads a small example given by the url. Press \[Enter\] to start rendering, then use arrow keys to display the words or lines. It works forward and backward.

If you want to try dropping your own scripts together with images and fonts, just call https://imatheria.github.io/Texter/texter.html

Another way of running it would be on your own machine via localhost. Just download the files and make them available on a static webserver on your machine. If you are on Windows, [HFS](http://www.rejetto.com/hfs/) does this job quite well. Then open the texter.html in your browser.


### Development progress

Unfortunately, there is a little chance that we still encounter things that don't work poperly. There may be unexpected browser-hangups or unexpected behaviour. There may be collisions between the Texter-Routines and the ones from Github-Pages. I am not able to test this software in all available browsers, i just go with Chromium and Firefox. And yes, there may still be some bugs in Texter. Let me know about any hassle with this. But for now, **just assume everythings works fine and give it a try.** :-)

Right now, i am tracking an issue of dropped layers if style changes multiple times in a script.

Should i package this inside npm? Not sure. No time right now.


## stuff to pop up here in near future

* some more working examples
* A short tutorial, followed by a little documentation.


---

regards & have a little patience

Kristian
