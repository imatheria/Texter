'use strict';

import * as THREE from '../three.js-master/build/three.module.js';

import {screen} from './screen.js';

// mostly experimental stuff in here
export const vessel =
{
    uniforms:
    {   time: { value: 1.0 },
        colorTexture: { value: new THREE.TextureLoader().load( 'images/FloorsMixedSize0018_matrix_seamless.png' ) },
        windowTexture: { value: new THREE.DataTexture( new Uint8Array( 128 * 128 * 3 ), 128, 128, THREE.RGBFormat ) },
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

        uniform sampler2D windowTexture;

        varying vec2 vUv;

        void main( void ) {

            gl_FragColor = vec4( texture2D( windowTexture, vec2(vUv.x, vUv.y) ).rgb + .2, 1.0 );

        }
    `, //document.getElementById( 'fragmentShader' ).textContent
    
    pike()
    {
        screen.applyOrthographicCamera();

      // material
        const material = new THREE.LineBasicMaterial(
        {   color: 0xffffff,
        });

        const point = ([x,y,z]) => new THREE.Vector3( x,y,z );

        const vertices = [  [40,40,0],
                            [0,40,0],
                            [0,-40,0],
                            [40,-40,0]  ];
     // plane
        const geometry = new THREE.BufferGeometry().setFromPoints( vertices.map( (v) => point(v) ) );

     // instance as mesh
        const line = new THREE.Line( geometry, material );
            line.position.set( 0,100,0 );
            line.rotation.set( 0,0,0 );
            screen.scene.add(line);

        screen.scene.add( line );
        screen.renderer.render(screen.scene, screen.camera);
    },


    segment( shape )
    {
        shape.autoClose = true;

        const points = shape.getPoints();

        const geometryPoints = new THREE.BufferGeometry().setFromPoints( points );

        // solid line

        let line = new THREE.Line(
            geometryPoints,
            new THREE.LineBasicMaterial( { color: 0xffffff } ) );

        line.position.set( 0,0,0,0 );

        screen.scene.add(line);
        screen.renderer.render(screen.scene, screen.camera);
    },
    camTexture()
    {
        const textureSize = 128;// * window.devicePixelRatio;

        const vector = new THREE.Vector2();
        
     // window camera
        const width = window.innerWidth;
        const height = window.innerHeight;
        const camWindow = new THREE.OrthographicCamera( - width / 2, width / 2, height / 2, - height / 2, 1, 10 );
        camWindow.position.z = 10;

        const sceneWindow = new THREE.Scene();

     // window texture
        const data = new Uint8Array( textureSize * textureSize * 3 );

        const texture = new THREE.DataTexture( data, textureSize, textureSize, THREE.RGBFormat );
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

     // window mesh
        const spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
        const sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set( textureSize, textureSize, 1 );
        sprite.position.set( -512, 512, 1 );
        sceneWindow.add( sprite );

     // scene rendering

        screen.renderer.clear();
        screen.renderer.render( screen.scene, screen.camera );

     // calculate start position for copying data
        vector.x = ( window.innerWidth * window.devicePixelRatio / 2 ) - 64;
        vector.y = ( window.innerHeight * window.devicePixelRatio / 2 ) - 64;

        screen.renderer.copyFramebufferToTexture( vector, texture );
        screen.renderer.clearDepth();
        screen.renderer.render( sceneWindow, camWindow );
    },

    camShaderTexture()
    {
        const textureSize = 128;// * window.devicePixelRatio;

        const vector = new THREE.Vector2();
        
     // window camera
        const width = window.innerWidth;
        const height = window.innerHeight;
        const camWindow = new THREE.OrthographicCamera( - width / 2, width / 2, height / 2, - height / 2, 1, 10 );
        camWindow.position.z = 10;

        const sceneWindow = new THREE.Scene();

     // window texture
        const data = new Uint8Array( textureSize * textureSize * 3 );

        const texture = new THREE.DataTexture( data, textureSize, textureSize, THREE.RGBFormat );
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        vessel.uniforms.windowTexture = texture;
    

     // window mesh
        //const spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
        const geometry = new THREE.PlaneGeometry( textureSize, textureSize, 1, 1 );
        const material = new THREE.ShaderMaterial(
        {   uniforms: vessel.uniforms,
            blending: THREE.AdditiveBlending,
            vertexShader: vessel.vertexShader,
            fragmentShader: vessel.fragmentShader,
        });

        const mesh = new THREE.Mesh( geometry, material );
        mesh.position.set( 512, 512, 1 );

        screen.scene.add( mesh );

        // scene rendering
        screen.renderer.clear();
        screen.renderer.render( screen.scene, screen.camera );

        // calculate start position for copying data
        vector.x = ( window.innerWidth * window.devicePixelRatio / 2 ) - 64;
        vector.y = ( window.innerHeight * window.devicePixelRatio / 2 ) - 64;

        screen.renderer.copyFramebufferToTexture( vector, vessel.uniforms.windowTexture );
        console.log("copyFramebufferToTexture", vessel.uniforms.windowTexture);
        screen.renderer.clearDepth();
        screen.renderer.render( sceneWindow, camWindow );
    },

    shaderTexture()
    {
        vessel.uniforms[ "colorTexture" ].value.wrapS = vessel.uniforms[ "colorTexture" ].value.wrapT = THREE.RepeatWrapping;

        screen.applyOrthographicCamera();

        const geometry = new THREE.PlaneGeometry( 1920, 1920, 1, 1 );

        const material = new THREE.ShaderMaterial( {

        blending: THREE.AdditiveBlending,
 
            uniforms: vessel.uniforms,
            vertexShader: `
                varying vec2 vUv;

                void main()
                {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;

                uniform sampler2D colorTexture;

                varying vec2 vUv;

                void main( void ) {

                    vec2 position = - 1.0 + 2.0 * vUv;

                    float a = atan( position.y, position.x );
                    float r = sqrt( dot( position, position ) );

                    vec3 color = texture2D( colorTexture, vUv + time * 0.04 ).rgb;

                    gl_FragColor = vec4( color - sqrt(r*0.8), 1.0 );

                }
            `,

        } );

        const mesh = new THREE.Mesh( geometry, material );

        screen.scene.add(mesh);
        screen.renderer.render(screen.scene, screen.camera);
    },

    addBackGroundTexture( image )
    {// texture
        const texture = new THREE.Texture( image );
            texture.minFilter = THREE.LinearFilter; // LinearMipMapLinearFilter
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.anisotropy = screen.renderer.getMaxAnisotropy();
            texture.needsUpdate = true;

     // material
        const material = new THREE.MeshBasicMaterial(
        {   map: texture,
            //blending: 
        //  transparent: true,
            flatShading: true,  });

        material.map.minFilter = THREE.LinearFilter; // LinearMipMapLinearFilter
        material.map.magFilter = THREE.LinearFilter;
        material.map.wrapS = material.map.wrapT = THREE.ClampToEdgeWrapping;
        material.map.anisotropy = screen.renderer.getMaxAnisotropy();
        material.map.needsUpdate = true;

     // plane
        const geometry = new THREE.PlaneGeometry( image.width / 3., image.height / 3., 1, 1 );

     // instance as mesh
        const plane = new THREE.Mesh( geometry, material );
            plane.position.set( 0,0,0 );
            plane.rotation.set( 0,0,0 );
            screen.scene.add(plane);

        screen.scene.add( plane );
    },

};

