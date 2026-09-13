import * as T from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Height fog for every fogged material. Three's fog chunks only know view
// depth; add a world-height varying so haze pools in the streets, thins
// with altitude and takes on the sodium glow of the city near the ground.
export function installHeightFog() {
  T.ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying float vFogHeight;
#endif`;
  T.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  // Back from view space to world height; mvPosition exists in every
  // material's vertex shader (sprites and points included).
  vFogHeight = ( transpose( mat3( viewMatrix ) ) * mvPosition.xyz + cameraPosition ).y;
#endif`;
  T.ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying float vFogHeight;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  T.ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  // Ground haze fades out over ~140 m; a third of the density persists at
  // altitude so distant towers still soften into the sky.
  float fogHeightFactor = mix( 0.34, 1.0, exp( - max( vFogHeight, 0.0 ) / 140.0 ) );
  #ifdef FOG_EXP2
    float fogDensityH = fogDensity * fogHeightFactor;
    float fogFactor = 1.0 - exp( - fogDensityH * fogDensityH * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth ) * fogHeightFactor;
  #endif
  vec3 fogTint = mix( fogColor, fogColor * vec3( 1.55, 1.25, 0.9 ), fogHeightFactor * 0.6 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogTint, fogFactor );
#endif`;
}

// Procedural windows in world-space metres, so a 40 m tower and a 180 m tower
// share the same floor height, with structured occupancy: whole dark floors,
// lit stairwell columns, warm retail at street level, three colour
// temperatures. Distant facades fade to an even glow to avoid shimmer.
export function installWindowShader(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
  varying vec3 vWinPos;
  varying vec3 vWinNormal;
  varying float vWinSeed;`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
  mat4 winModel = modelMatrix;
  #ifdef USE_INSTANCING
    winModel = modelMatrix * instanceMatrix;
  #endif
  vWinPos = ( winModel * vec4( position, 1.0 ) ).xyz;
  vWinNormal = normalize( mat3( winModel ) * normal );
  vWinSeed = fract( sin( dot( winModel[3].xz, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
  varying vec3 vWinPos;
  varying vec3 vWinNormal;
  varying float vWinSeed;
  float winHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
  // Returns window mask in .x, lit amount in .y, colour in .zw is unused; colour via out param.
  vec2 windowAt( out vec3 colour ) {
    vec3 n = abs( vWinNormal );
    colour = vec3( 0.0 );
    if ( n.y > 0.6 ) return vec2( 0.0 );
    vec2 fp = n.x > n.z ? vec2( vWinPos.z, vWinPos.y ) : vec2( vWinPos.x, vWinPos.y );
    vec2 pitch = vec2( 4.4, 3.6 );
    vec2 id = floor( fp / pitch );
    vec2 f = fract( fp / pitch );
    float win = step( 0.24, f.x ) * step( f.x, 0.76 ) * step( 0.26, f.y ) * step( f.y, 0.80 );
    float darkFloor = step( 0.64, winHash( vec2( id.y, vWinSeed * 17.0 ) ) );
    float stair = step( 0.93, winHash( vec2( id.x, vWinSeed * 31.0 ) ) );
    float occupied = step( 0.63, winHash( id + vWinSeed * 53.0 ) );
    float lit = max( stair, occupied * ( 1.0 - darkFloor ) );
    float ground = step( fp.y, 4.5 );
    lit = mix( lit, step( 0.25, winHash( vec2( id.x, vWinSeed ) ) ), ground );
    float temp = winHash( id * 0.37 + vWinSeed );
    colour = temp < 0.62 ? vec3( 1.0, 0.74, 0.42 ) : temp < 0.88 ? vec3( 0.70, 0.82, 1.0 ) : vec3( 1.0, 0.56, 0.24 );
    colour = mix( colour, vec3( 1.0, 0.64, 0.30 ), ground );
    float dist = length( vWinPos - cameraPosition );
    float far = smoothstep( 500.0, 1700.0, dist );
    win = mix( win, 0.30, far );
    lit = mix( lit, 0.45, far );
    return vec2( win, lit );
  }`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `vec3 winColour;
  vec2 winInfo = windowAt( winColour );
  // Window glass is darker than masonry in the diffuse.
  diffuseColor.rgb *= mix( 1.0, 0.42, winInfo.x );`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `totalEmissiveRadiance = winColour * winInfo.x * winInfo.y * emissive.r * 1.7;`,
      );
  };
}

// Final grade before tone mapping: vignette, edge chromatic aberration, film
// grain and a blue-shadow / amber-highlight split.
export function createGradePass() {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, strength: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
    fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform float time; uniform float strength; varying vec2 vUv;
float grain( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) + time ) * 43758.5453 ); }
void main() {
  vec2 d = vUv - 0.5;
  float r2 = dot( d, d );
  vec2 ca = d * r2 * 0.028 * strength;
  vec3 c;
  c.r = texture2D( tDiffuse, vUv + ca ).r;
  c.g = texture2D( tDiffuse, vUv ).g;
  c.b = texture2D( tDiffuse, vUv - ca ).b;
  float lum = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  // Shadows toward cold blue, highlights toward amber.
  vec3 shadows = vec3( 0.86, 0.94, 1.14 ), highs = vec3( 1.08, 1.0, 0.88 );
  c *= mix( shadows, highs, smoothstep( 0.0, 0.6, lum ) );
  c *= 1.0 - smoothstep( 0.18, 0.75, r2 ) * 0.55 * strength;
  c += ( grain( vUv * 1400.0 ) - 0.5 ) * 0.035 * strength;
  gl_FragColor = vec4( max( c, 0.0 ), 1.0 );
}`,
  });
}
