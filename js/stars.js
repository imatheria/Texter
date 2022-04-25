'use strict';

import * as THREE from '../three.js-master/build/three.module.js';

import {screen} from './screen.js';

export const stars =
{	redPoints: undefined,
	greenPoints: undefined,
	bluePoints: undefined,

	running: false,
	camera: undefined,

 // sine movement base value 
	sx: 0.0,
	sy: 0.0,
	sz: 0.0,
 // camera angle
	ax: 0.0,
	ay: 0.0,
	az: 0.0,

 // size of starfield
	boundary: 0.0,
	
	init()
	{// generate thousands of stars
		const redStars = [];
		const greenStars = [];
		const blueStars = [];
		const violetStars = [];
		const yellowStars = [];

		stars.boundary = (screen.width + screen.height) * 4;
		const place = () => Math.random()*stars.boundary - stars.boundary/2;
		const attributes = {	size: 12,
								//dithering:true,
								//map: something
		};

		for(let t=0;t<2345;t++) redStars.push( place(), place(), place() );
		for(let t=0;t<2345;t++) greenStars.push( place(), place(), place() );
		for(let t=0;t<2345;t++) violetStars.push( place(), place(), place() );
		for(let t=0;t<2345;t++) blueStars.push( place(), place(), place() );
		for(let t=0;t<2345;t++) yellowStars.push( place(), place(), place() );

		const redGeometry = new THREE.BufferGeometry();
		redGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( redStars, 3 ) );
		const redMaterial = new THREE.PointsMaterial({color: 0xff6666, ...attributes});
		stars.redPoints = new THREE.Points( redGeometry, redMaterial );
		
		const greenGeometry = new THREE.BufferGeometry();
		greenGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( greenStars, 3 ) );
		const greenMaterial = new THREE.PointsMaterial({color: 0x77ee77, ...attributes});
		stars.greenPoints = new THREE.Points( greenGeometry, greenMaterial );
		
		const blueGeometry = new THREE.BufferGeometry();
		blueGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( blueStars, 3 ) );
		const blueMaterial = new THREE.PointsMaterial({color: 0x8888ff, ...attributes});
		stars.bluePoints = new THREE.Points( blueGeometry, blueMaterial );
		
		const violetGeometry = new THREE.BufferGeometry();
		violetGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( violetStars, 3 ) );
		const violetMaterial = new THREE.PointsMaterial({color: 0xaa66ff, ...attributes});
		stars.violetPoints = new THREE.Points( violetGeometry, violetMaterial );
		
		const yellowGeometry = new THREE.BufferGeometry();
		yellowGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( yellowStars, 3 ) );
		const yellowMaterial = new THREE.PointsMaterial({color: 0xeebb66, ...attributes});
		stars.yellowPoints = new THREE.Points( yellowGeometry, yellowMaterial );
		
		stars.redPoints.position.set( 0,0,stars.boundary/2 );
		stars.greenPoints.position.set( 0,0,stars.boundary/2 );
		stars.bluePoints.position.set( 0,0,stars.boundary/2 );
		stars.yellowPoints.position.set( 0,0,stars.boundary/2 );
		stars.violetPoints.position.set( 0,0,stars.boundary/2 );
	},
	
	initPlanes()
	{// generate planes of dots
		const redPlane = [];
		const greenPlane = [];
		const bluePlane = [];
		
		stars.boundary = 400;
		
		for(let t=0;t<3200;t++)
		{	
			const x = t/40 |0;
			const z = t%40 |0;
			
			redPlane.push( x*40, 80, z*40 );
			greenPlane.push( x*40, 0, z*40 );
			bluePlane.push( x*40, -80, z*40 );
		}

		const attributes = {	size: 1,
//								dithering:true,
//								transparent: true,
//								map: cross
		};

		const redGeometry = new THREE.BufferGeometry();
		redGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( redPlane, 3 ) );
		const redMaterial = new THREE.PointsMaterial({color: 0xff6666, ...attributes});
		stars.redPoints = new THREE.Points( redGeometry, redMaterial );
		
		const greenGeometry = new THREE.BufferGeometry();
		greenGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( greenPlane, 3 ) );
		const greenMaterial = new THREE.PointsMaterial({color: 0x77ee77, ...attributes});
		stars.greenPoints = new THREE.Points( greenGeometry, greenMaterial );
		
		const blueGeometry = new THREE.BufferGeometry();
		blueGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( bluePlane, 3 ) );
		const blueMaterial = new THREE.PointsMaterial({color: 0x8888ff, ...attributes});
		stars.bluePoints = new THREE.Points( blueGeometry, blueMaterial );

		stars.redPoints.position.set( -1600,0,0 );
		stars.greenPoints.position.set( -1600,0,0 );
		stars.bluePoints.position.set( -1600,0,0 );
	},
		
	show()
	{
		if( !stars.camera )
		{// setup perspective camera
			const fov = 66;
			const aspect = screen.width / screen.height;
			const near = 3;
			const far = (screen.width + screen.height)*2;
			const cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
			//const cam = new THREE.OrthographicCamera(-screen.width/2, screen.width/2, screen.height/2, -screen.height/2, 0, 1000);

			cam.position.set( 0,0,0 );
			cam.lookAt( 0,0,1 );

			screen.scene.add( cam );
			stars.camera = cam;
		}

	 // 
	 	screen.scene.add(stars.redPoints);
		screen.scene.add(stars.greenPoints);
		screen.scene.add(stars.bluePoints);

		screen.renderer.render(screen.scene, stars.camera);

		stars.running = true;
	 // animate it all
		requestAnimationFrame( stars.move );
	},
	hide()
	{	screen.scene.remove(stars.redPoints);
		screen.scene.remove(stars.greenPoints);
		screen.scene.remove(stars.bluePoints);

		stars.running = false;
	},
	
	move()
	{
		screen.renderer.render(screen.scene, stars.camera);
		if(stars.running) requestAnimationFrame( stars.move );

		stars.sx += 0.00213;
		stars.sy += 0.00321;
		stars.sz += 0.00123;

		const b = stars.boundary/6;
		const x = Math.sin( stars.sx ) * b;
		const y = Math.sin( stars.sy ) * b;
		const z = Math.pow(Math.sin( stars.sz ),2) * b - b*2;
		
		stars.camera.position.set( x,y,z );
		stars.camera.lookAt( x,y,z+1 );

		//hud.changeText( "data", `[ ${x} ${y} ${z} ]` )

		stars.camera.updateProjectionMatrix();
	},
};

export const matrix =
{	//texture:
	uniforms:
	{	time: { value: 1.0 },
		colorTexture: { value: new THREE.TextureLoader().load( 'images/FloorsMixedSize0018_matrix_seamless.png' ) },
	},
	vertexShader: `
		varying vec2 vUv;

		void main()
		{
			vUv = uv;
			vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
			gl_Position = projectionMatrix * mvPosition;
		}
	`, //document.getElementById( 'vertexShader' ).textContent,
	fragmentShader: `
		uniform float time;

		uniform sampler2D colorTexture;

		varying vec2 vUv;

		void main( void ) {

			vec2 position = - 1.0 + 2.0 * vUv;

			float a = atan( position.y, position.x );
			float r = sqrt( dot( position, position ) );

			vec3 color1 = sqrt( texture2D( colorTexture, vec2(vUv.x + time * 0.04, vUv.y + time * 0.0022) ).rgb * 2. );
			vec3 color2 = sqrt( texture2D( colorTexture, vec2(vUv.x - time * 0.04, vUv.y - time * 0.0023) ).rgb * 2. );
			vec3 color3 = sqrt( texture2D( colorTexture, vec2(vUv.x + time * 0.0024, vUv.y + time * 0.04) ).rgb * 2. );
			vec3 color4 = sqrt( texture2D( colorTexture, vec2(vUv.x - time * 0.0025, vUv.y - time * 0.04) ).rgb * 2. );

			color1.r += sin( time*1.5 ) * .25 + .4;
			color2.r += sin( time*1.5 + 2. ) * .25 + .4;
			color3.b += sin( time*1.3 ) * .25 + .4;
			color4.b += sin( time*1.3 + 2. ) * .25 + .4;

			vec3 final = sqrt(color1*color2*color3*color4) - sqrt(r*2.);
			float alpha = final.r + final.g + final.b;
			gl_FragColor = vec4( final, alpha * 2. - r );

		}
	`, //document.getElementById( 'fragmentShader' ).textContent

/*
			color1.r += sin( time ) 		* .25 + .25;
			color1.b += sin( time + 1.507 ) * .25 + .25;

			color2.r += sin( time + .7535) 	* .25 + .25;
			color2.b += sin( time + 2.267 ) * .25 + .25;

			color3.r += sin( time + 1.507 ) * .25 + .25;
			color3.b += sin( time ) 		* .25 + .25;

			color4.r += sin( time + 2.267) 	* .25 + .25;
			color4.b += sin( time + .7535 ) * .25 + .25;
*/

	running: false,

	show()
	{	if( !matrix.running )
			matrix.start();
		matrix.running = true;
	},
	start()
	{
		matrix.uniforms['colorTexture'].value.wrapS = matrix.uniforms['colorTexture'].value.wrapT = THREE.RepeatWrapping;

		screen.applyOrthographicCamera();

	 // generate matrix eye shader
//		const geometry = new THREE.PlaneGeometry( 1920, 1920, 1, 1 );
		const geometry = new THREE.PlaneGeometry( 640, 640, 1, 1 );

		const material = new THREE.ShaderMaterial(
		{	uniforms: matrix.uniforms,
//			blending: THREE.AdditiveBlending,
			vertexShader: matrix.vertexShader,
			fragmentShader: matrix.fragmentShader,
			transparent: true,
//			flatShading: true,
//			opacity: 0.1,
		});
console.log("matrix material", material);

		const mesh = new THREE.Mesh( geometry, material );
		mesh.material.opacity = 0.1;
		mesh.position.set( -100., -100., 0. );
		screen.scene.add( mesh );
		requestAnimationFrame( matrix.move );
	},

	hide()
	{
		matrix.running = false;
	},
	move()
	{
		screen.renderer.render(screen.scene, screen.camera);
		matrix.uniforms[ 'time' ].value = performance.now() / 1000;
//		if(matrix.running)
//			requestAnimationFrame( matrix.move );
console.log("STOPPED");
	},
};
