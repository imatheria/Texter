'use strict';

import * as defaults from './constants.js';

import * as THREE from '../three.js-master/build/three.module.js';

import { hud } from './hud.js';
import { stars } from './stars.js';

import { fetchImagefile } from './loaders.js';

export const screen =
{// threeX canvas size
    width: 0,
    height: 0,
    
 // THREE placeholder
    renderer: undefined,    // THREE.WebGLRenderer({canvas});
    scene: undefined,       // THREE.Scene()
    camera: undefined,      // THREE.OrtographicCamera

    toFullscreen: () => document.body.requestFullscreen(),
    exitFullscreen: () => document.exitFullscreen(),
    
    initThreeRenderer()
    {// initialize THREE renderer, scene and camera,
        screen.renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas.screen') }); //{antialias:true} );
        screen.renderer.autoClear = false;
        screen.scene = new THREE.Scene();
        //screen.scene.background = new THREE.Color( 0x110d17 );*/

        console.log("THREE capabilities\n", screen.renderer.capabilities);

        screen.resizeRendererToDisplaySize();
    },
    
    applyOrthographicCamera()
    {// setup camera and scene for three
        const width  = screen.width;
        const height = screen.height;
        screen.camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 1000);
        screen.camera.position.set( 0,0,1 );
        screen.camera.lookAt( 0,0,0 );
    },

    showTestCube()
    {   let pt = (x,y,z) => new THREE.Vector3( x*100,y*100,z*100 );
        const cube = [
            pt(1,1,1),
            pt(1,1,0),
            pt(1,0,0),
            pt(1,0,1),
            pt(0,0,1),
            pt(0,1,1),
            pt(1,1,1),
            pt(1,0,1),
            pt(1,0,0),
            pt(0,0,0),
            pt(0,1,0),
            pt(1,1,0),
            pt(0,1,0),
            pt(0,1,1),
            pt(0,0,1),
            pt(0,0,0),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints( cube );
        const material = new THREE.LineBasicMaterial({color: 0xffffff});
        const line = new THREE.Line( geometry, material );

        line.rotation.x = .7;
        line.rotation.y = .7;
        line.rotation.z = .7;
        line.position.set( 0,0,100 );
        screen.scene.add(line);
    },
    
    testPlane()
    {// show "pixeltestpage.png" directly loaded into THREE.Texture
        if(screen.camera)
        {   screen.scene.remove( screen.testPlane );
            return;
        }
        screen.applyOrthographicCamera();
        fetchImagefile( "pixeltestpage.png" ).then( img =>
        {   hud.log(`pixeltestpage.png loaded.`);

         // texture creation
            const texture = new THREE.Texture( img );
                texture.minFilter = THREE.LinearFilter; // LinearMipMapLinearFilter
                texture.magFilter = THREE.LinearFilter;
                texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.anisotropy = screen.renderer.getMaxAnisotropy();
                texture.needsUpdate = true;
                
         // material
            const material = new THREE.MeshBasicMaterial(
            {   map: texture,
            //  transparent: true,
                flatShading: true,  });

         // plane
            const geometry = new THREE.PlaneGeometry( img.width, img.height, 1, 1 );
            console.log("testplane", img.width, img.height );

         // instance as mesh
            const plane = new THREE.Mesh( geometry, material );
                plane.position.set( 0,0,0 );
                plane.rotation.set( 0,0,0 );
                screen.scene.add(plane);

            screen.scene.add( plane );
            screen.renderer.render(screen.scene, screen.camera);
        } );
    },

    asPlaneNonTransparent( id )
    {   const texture = new THREE.Texture( id );
            texture.minFilter = THREE.LinearFilter; // LinearMipMapLinearFilter
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.anisotropy = screen.renderer.getMaxAnisotropy();
            texture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial(
        {   map: texture,
            //  transparent: true,
            flatShading: true
        });
        const geometry = new THREE.PlaneGeometry( id.width, id.height, 1, 1 );

        return new THREE.Mesh( geometry, material );
    },
    
    asPlane( id )
    {   const texture = new THREE.Texture( id );
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.anisotropy = screen.renderer.getMaxAnisotropy();
            texture.premultiplyAlpha = false;
            texture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial(
        {   map: texture,
            //alphaMap: texture,
            transparent: true,
            //flatShading: false,
        });

        const geometry = new THREE.PlaneGeometry( id.width, id.height, 1, 1 );

        return new THREE.Mesh( geometry, material );
    },

    asShaderPlane( idPhrase, shader )
    {       
        const uniforms =
        {   time: { value: performance.now() / 1000 },
            sPhrase: { value: new THREE.Texture( idPhrase ) },
            sTexture: { value: new THREE.TextureLoader().load( 'images/FloorsMixedSize0018_matrix_seamless.png' ) },
        };

        if( shader.texture )
        {   uniforms.sTexture = { value: new THREE.TextureLoader().load( 'images/FloorsMixedSize0018_matrix_seamless.png' ) };
            //{ value: new THREE.Texture( shader.texture ) };
            // texture only available in uniform sampler2D _when_ its loaded via THREE.TextureLoader()
            uniforms.sTexture.value.wrapS = uniforms.sTexture.value.wrapT = THREE.RepeatWrapping;
        }

        const vertexShader = `
            varying vec2 vUv;

            void main()
            {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        const fragmentShader = `
                uniform sampler2D sPhrase;
                uniform sampler2D sTexture;

                varying vec2 vUv;

                void main( void ) {

                    vec2 position = - 1.0 + 2.0 * vUv;

                    vec3 final = texture2D( sTexture, vUv.xy ).rgb;
                    float alpha = texture2D( sPhrase, vUv.xy ).a;
                    gl_FragColor = vec4( final+.1,alpha+.1 );

                }
            `;

        const material = new THREE.ShaderMaterial(
        {   uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
//          flatShading: true,
        });

        const geometry = new THREE.PlaneGeometry( idPhrase.width, idPhrase.height, 1, 1 );
        return new THREE.Mesh( geometry, material );
    },

    point( x, y, color )
    {   const dotGeometry = new THREE.BufferGeometry();
        dotGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [x,y,1], 3 ) );
        const dotMaterial = new THREE.PointsMaterial({color: color, size: 4, dithering:true});
        const dotPoint = new THREE.Points( dotGeometry, dotMaterial );
        screen.scene.add( dotPoint );
    },

    resizeRendererToDisplaySize()
    {// dynamically adapt to canvas-size-changes
        const canvas = document.querySelector('canvas.screen');
        const pixelRatio = window.devicePixelRatio;
        let width  = canvas.clientWidth  * pixelRatio | 0;
        let height = canvas.clientHeight * pixelRatio | 0;

     // have even sizes
        // no adjustments required due every Fullscreen-Mode is even!
        // All even displays will be pixel-aligned
        //if( width%2 ) width--;
        //if( height%2 ) height--;

     // resize renderer canvas
        if (screen.width !== width || screen.height !== height)
        {   
            hud.log( `Display resize [ ${width} x ${height} ]` );
            screen.renderer.setSize(width, height, false);
            const canvas = screen.renderer.domElement;
            if( (canvas.width != width ) || (canvas.height != height) )
                hud.logError( `Display resize failure on Canvas!<br>you may experience displaced graphics<br>and try another browser.` );
        
         // update camera if existent
            if(screen.camera)
            {   screen.camera.aspect = width / height;
                screen.camera.updateProjectionMatrix();
            }
            if(stars.camera)
            {   stars.camera.aspect = width / height;
                stars.camera.updateProjectionMatrix();
            }
            screen.width  = width;
            screen.height = height;
            if(screen.camera) screen.renderer.render(screen.scene, screen.camera);
        }   
    },
};
