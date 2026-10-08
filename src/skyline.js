import * as T from "three";

// Searchlight beams sweeping the cloud base, and the Bat-signal over GCPD.
// Beams are open cones with additive fade along their length and toward the
// edge; the emblem is a canvas-drawn silhouette on a lit disc at cloud height.
const beamMaterial = (color, strength) =>
  new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    uniforms: { color: { value: new T.Color(color) }, strength: { value: strength } },
    vertexShader: /* glsl */ `
      varying float vAlong; varying vec2 vUv;
      void main() { vUv = uv; vAlong = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float strength; varying float vAlong; varying vec2 vUv;
      void main() {
        float edge = 1.0 - abs( fract( vUv.x * 2.0 ) * 2.0 - 1.0 );
        float a = (0.18 + 0.32 * vAlong) * (1.0 - smoothstep(0.78, 1.0, vAlong)) * (0.35 + 0.65 * edge) * strength;
        gl_FragColor = vec4( color, a );
      }`,
  });

function drawEmblem() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const disc = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  disc.addColorStop(0, "#fff4d6");
  disc.addColorStop(0.35, "#f0dca8a0");
  disc.addColorStop(0.7, "#f0dca840");
  disc.addColorStop(1, "#f0dca800");
  g.fillStyle = disc;
  g.fillRect(0, 0, 256, 256);
  // 1989 emblem, approximated: pointed wings, three scallops on the
  // trailing edge, short ears.
  g.filter = "blur(2px)";
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000";
  g.beginPath();
  g.moveTo(128, 78);
  g.lineTo(137, 92);
  g.lineTo(146, 82);
  g.quadraticCurveTo(190, 70, 244, 104);
  g.quadraticCurveTo(214, 110, 202, 128);
  g.quadraticCurveTo(232, 150, 244, 160);
  g.quadraticCurveTo(206, 158, 184, 150);
  g.quadraticCurveTo(178, 170, 160, 168);
  g.quadraticCurveTo(146, 176, 128, 192);
  g.quadraticCurveTo(110, 176, 96, 168);
  g.quadraticCurveTo(78, 170, 72, 150);
  g.quadraticCurveTo(50, 158, 12, 160);
  g.quadraticCurveTo(24, 150, 54, 128);
  g.quadraticCurveTo(42, 110, 12, 104);
  g.quadraticCurveTo(66, 70, 110, 82);
  g.lineTo(119, 92);
  g.closePath();
  g.fill();
  g.filter = "none";
  // A deterministic cloud veil breaks up the projection without animated noise.
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 7; i++) {
    const y = 24 + i * 35;
    const veil = g.createRadialGradient(100 + (i % 3) * 30, y, 5, 128, y, 100);
    veil.addColorStop(0, "#00000055");
    veil.addColorStop(1, "#00000000");
    g.fillStyle = veil;
    g.fillRect(0, 0, 256, 256);
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function createSkyline(scene) {
  const group = new T.Group();
  scene.add(group);
  const cone = new T.CylinderGeometry(4, 0.08, 1, 24, 1, true).translate(0, 0.5, 0);
  const lights = [];
  const addBeam = (x, y, z, color, strength, length, spread, phase, speed) => {
    const pivot = new T.Group();
    pivot.position.set(x, y, z);
    const beam = new T.Mesh(cone, beamMaterial(color, strength));
    beam.scale.set(spread, length, spread);
    pivot.add(beam);
    group.add(pivot);
    lights.push({ pivot, phase, speed });
    return pivot;
  };
  // Two roaming civil-defence searchlights on the Midtown and Old Gotham rooftops.
  addBeam(420, 70, 260, 0xbfd6ff, 0.18, 900, 8, 0, 0.11);
  addBeam(-620, 58, 540, 0xbfd6ff, 0.16, 800, 7, 2.1, -0.09);
  // GCPD: the Bat-signal, steady, aimed high over the city.
  const signal = addBeam(300, 62, -170, 0xf3e3b8, 0.1, 640, 23, 0, 0);
  signal.rotation.set(-0.72, 0.35, 0);
  const emblem = new T.Mesh(
    new T.PlaneGeometry(210, 210),
    new T.MeshBasicMaterial({
      map: drawEmblem(),
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      opacity: 0.48,
    }),
  );
  // Place the emblem where the beam meets the cloud base, facing back down it.
  const dir = new T.Vector3(0, 1, 0).applyEuler(signal.rotation);
  emblem.position.copy(signal.position).addScaledVector(dir, 640);
  emblem.lookAt(signal.position);
  group.add(emblem);
  return {
    group,
    update(t) {
      for (const l of lights) {
        if (!l.speed) continue;
        l.pivot.rotation.set(
          -0.55 + Math.sin(t * l.speed * 0.7 + l.phase) * 0.25,
          t * l.speed + l.phase,
          0,
        );
      }
      emblem.material.opacity = 0.48 + Math.sin(t * 0.25) * 0.02;
    },
  };
}
