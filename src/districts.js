import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const RELAY_SITES = [
  { name: "WAYNE TOWER", district: "MIDTOWN", x: -270, y: 352, z: -380 },
  {
    name: "CATHEDRAL SHELTER",
    district: "OLD GOTHAM",
    x: -1100,
    y: 214,
    z: -1000,
  },
  {
    name: "TRICORNER SUBSTATION",
    district: "TRICORNER DOCKS",
    x: 1420,
    y: 124,
    z: 1050,
  },
];
export function districtAt(x, z) {
  if (x > 850 && z > 300) return "TRICORNER DOCKS";
  if (x < -650 && z < -350) return "OLD GOTHAM";
  if (x < -650 && z > 350) return "THE NARROWS";
  if (Math.abs(x - 720) < 160) return "GOTHAM RIVER";
  return "MIDTOWN";
}
export function reservedPlot(x, z) {
  return (
    Math.abs(x - 720) < 145 ||
    (x > 870 && x < 1230 && z > 530 && z < 1330) ||
    (Math.abs(x + 1100) < 160 && Math.abs(z + 1000) < 180) ||
    (Math.abs(x - 1420) < 190 && Math.abs(z - 1050) < 170) ||
    (Math.abs(x + 270) < 85 && Math.abs(z + 380) < 80)
  );
}

// Architectural details are combined by material to keep the larger city cheap to draw.
export function createDistricts(scene, collisions) {
  const palettes = {
    stone: new T.MeshStandardMaterial({ color: 0x414653, roughness: 0.85 }),
    roof: new T.MeshStandardMaterial({
      color: 0x718493,
      metalness: 0.3,
      roughness: 0.65,
    }),
    steel: new T.MeshStandardMaterial({
      color: 0x263e50,
      metalness: 0.65,
      roughness: 0.4,
    }),
    copper: new T.MeshStandardMaterial({
      color: 0xaa6b3c,
      metalness: 0.45,
      roughness: 0.6,
    }),
    gold: new T.MeshBasicMaterial({ color: 0xffcd85 }),
    blue: new T.MeshBasicMaterial({ color: 0x63b8ca }),
    red: new T.MeshStandardMaterial({ color: 0x613c3c, roughness: 0.7 }),
  };
  const batches = Object.fromEntries(Object.keys(palettes).map((k) => [k, []]));
  function shape(key, geometry, x, y, z, rotation = [0, 0, 0]) {
    geometry.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(x, y, z),
        new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
        new T.Vector3(1, 1, 1),
      ),
    );
    batches[key].push(geometry.index ? geometry.toNonIndexed() : geometry);
  }
  const box = (key, x, y, z, w, h, d) =>
    shape(key, new T.BoxGeometry(w, h, d), x, y, z);
  const collider = (x, z, w, d, h) => collisions.push({ x, z, w, d, h });

  // Old Gotham cathedral: twin bell towers, rose window, nave and flying buttresses.
  box("stone", -1100, 48, -1000, 95, 96, 145);
  shape("roof", new T.CylinderGeometry(0, 69, 38, 4), -1100, 111, -1000, [
    0,
    Math.PI / 4,
    0,
  ]);
  collider(-1100, -1000, 95, 145, 127);
  for (const x of [-1142, -1058]) {
    box("stone", x, 80, -943, 28, 160, 30);
    shape("roof", new T.ConeGeometry(22, 54, 4), x, 187, -943, [
      0,
      Math.PI / 4,
      0,
    ]);
    box("gold", x, 147, -927, 8, 14, 1);
    collider(x, -943, 35, 35, 214);
    for (const y of [18, 76, 132, 160]) box("roof", x, y, -943, 30, 2, 32);
    for (const side of [-1, 1]) {
      box("roof", x + side * 12, 80, -927, 2, 160, 2);
      shape("roof", new T.ConeGeometry(4, 20, 4), x + side * 13, 169, -928);
      box("steel", x + side * 5, 142, -926, 2, 18, 1.5);
    }
  }
  for (let i = 0; i < 5; i++)
    for (const side of [-1, 1]) {
      box("stone", -1100 + side * 55, 34, -1048 + i * 24, 15, 68, 9);
      shape(
        "roof",
        new T.ConeGeometry(6, 22, 4),
        -1100 + side * 55,
        78,
        -1048 + i * 24,
      );
      box("gold", -1100 + side * 48, 61, -1048 + i * 24, 1, 27, 6);
    }
  shape("gold", new T.TorusGeometry(16, 1, 6, 40), -1100, 70, -926);
  shape("roof", new T.TorusGeometry(18, 2, 8, 40), -1100, 70, -926);
  // Inset stained-glass sectors and dark mullions give the rose window depth.
  shape('steel', new T.CircleGeometry(15.8,48), -1100,70,-925.8);
  for(let i=0;i<12;i++){
    shape(i%3===0?'gold':i%3===1?'blue':'copper',new T.CircleGeometry(14.8,4,i*Math.PI/6+.035,Math.PI/6-.07),-1100,70,-925.6);
  }
  shape('roof',new T.TorusGeometry(6,.6,6,32),-1100,70,-925);
  for(const y of [8,46,92])box('roof',-1100,y,-926,92,.7,1.4);
  for(const side of [-1,1])for(const x of [29,35]){
    box('steel',-1100+side*x,25,-926.2,3.4,25,.5);
    shape('roof',new T.TorusGeometry(1.7,.35,5,12,Math.PI),-1100+side*x,37.5,-925.7);
    box('copper',-1100+side*x,25,-925.7,.18,24,.3);
  }
  for (const side of [-1, 1]) {
    box("roof", -1100 + side * 45, 46, -926, 4, 92, 5);
    box("roof", -1100 + side * 22, 23, -926, 3, 46, 4);
  }
  for (let i = 0; i < 3; i++)
    shape(
      "roof",
      new T.TorusGeometry(13 + i * 2, 0.8, 6, 24, Math.PI),
      -1100,
      30,
      -924 - i * 0.7,
    );
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    shape("gold", new T.BoxGeometry(0.7, 30, 0.7), -1100, 70, -925, [0, 0, a]);
  }
  box("steel", -1100, 14, -926, 20, 28, 2);
  // Recessed bronze-framed doors read at street distance without new materials.
  for (const side of [-1, 1]) {
    const x = -1100 + side*5;
    for (const y of [5, 14, 23]) {
      box('copper', x, y, -924.8, 8.8, 7.8, .35);
      box('steel', x, y, -924.5, 7.8, 6.8, .4);
    }
    box('copper', -1100+side*.45, 12, -924, .3, 3, .5);
  }

  // Docks: gantry cranes, stacked freight, a power station and industrial chimneys.
  box("steel", 1420, 32, 1050, 115, 64, 90);
  collider(1420, 1050, 115, 90, 65);
  for (const x of [1380, 1460]) {
    shape("copper", new T.CylinderGeometry(7, 10, 105, 10), x, 53, 1020);
    box("gold", x, 106, 1020, 9, 2, 9);
    collider(x, 1020, 20, 20, 108);
  }
  for (let i = 0; i < 4; i++) {
    const z = 600 + i * 210;
    for (const x of [900, 970]) box("copper", x, 42, z, 7, 84, 9);
    box("copper", 920, 85, z, 210, 8, 10);
    box("steel", 838, 56, z, 1, 55, 1);
    box("gold", 920, 90, z, 8, 2, 10);
    collider(935, z, 80, 15, 90);
    for (let k = 0; k < 8; k++) {
      const x = 1040 + (k % 4) * 40,
        zz = z + 35 + Math.floor(k / 4) * 30;
      box(k % 2 ? "red" : "steel", x, 8, zz, 32, 16, 22);
      box("roof", x, 16.2, zz, 32, 0.4, 22);
    }
  }

  // Two suspension bridges cross a continuous water corridor.
  for (const z of [-780, 900]) {
    box("steel", 720, 24, z, 460, 9, 40);
    for (const x of [565, 875]) {
      for (const side of [-1, 1])
        box("stone", x, 62, z + side * 22, 13, 124, 13);
      box("stone", x, 117, z, 15, 14, 57);
      collider(x, z, 20, 65, 124);
    }
    // The deck is an elevated obstacle, not a solid wall down to the water.
    collisions.push({ x: 720, z, w: 460, d: 40, h: 29, bottom: 19 });
    for (let i = 0; i < 25; i++) {
      const x = 510 + i * 17.5,
        y = 52 + 66 * ((x - 720) / 210) ** 2;
      for (const side of [-1, 1]) {
        box("steel", x, (y + 28) / 2, z + side * 21, 0.65, y - 28, 0.65);
        box("gold", x, 29, z + side * 18, 1.5, 1, 1.5);
      }
    }
    for (const side of [-1, 1]) {
      const cable = [];
      for (let i = 0; i <= 32; i++) {
        const x = 565 + (i * 310) / 32;
        cable.push(
          new T.Vector3(x, 52 + 65 * ((x - 720) / 155) ** 2, z + side * 22),
        );
      }
      shape(
        "roof",
        new T.TubeGeometry(new T.CatmullRomCurve3(cable), 40, 1.1, 5, false),
        0,
        0,
        0,
      );
    }
  }
  const water = new T.Mesh(
    new T.PlaneGeometry(285, 7100),
    new T.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 vUv;uniform float time;void main(){float wave=sin(vUv.y*900.+sin(vUv.x*70.+time)*2.+time*1.8)*.5+.5;float glint=pow(wave,14.)*(.15+.85*pow(abs(sin(vUv.x*17.)),12.));gl_FragColor=vec4(vec3(.008,.02,.035)+vec3(.04,.08,.11)*glint,1.);}",
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(720, 0.5, 0);
  scene.add(water);
  // A moored cargo ship gives the river a recognizable scale.
  box("steel", 735, 8, 1210, 55, 16, 190);
  box("roof", 735, 21, 1275, 40, 27, 35);
  collider(735, 1210, 55, 190, 35);
  for (let i = 0; i < 5; i++) box("red", 735, 22, 1150 + i * 24, 38, 16, 20);

  for (const [key, parts] of Object.entries(batches)) {
    if (parts.length)
      scene.add(new T.Mesh(mergeGeometries(parts), palettes[key]));
  }
  return {
    update(time) {
      water.material.uniforms.time.value = time;
    },
  };
}
