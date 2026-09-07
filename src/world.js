import { createDistricts, districtAt, reservedPlot } from "./districts.js";
import * as T from "three";
export function rng(seed = 1989) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function createWorld(scene) {
  const rand = rng(),
    buildings = [],
    dummy = new T.Object3D();
  scene.background = new T.Color("#050b19");
  scene.fog = new T.FogExp2("#101d30", 0.00165);
  const sky = new T.Mesh(
    new T.SphereGeometry(3300, 32, 20),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: { time: { value: 0 } },
      vertexShader:
        "varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec3 vPos; uniform float time; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);} void main(){vec3 d=normalize(vPos);float h=max(d.y,0.);vec2 uv=d.xz/(max(d.y,.08))*1.4+vec2(time*.002,0);float n=noise(uv)*.5+noise(uv*2.)*.25+noise(uv*4.)*.125;vec3 col=mix(vec3(.055,.09,.15),vec3(.009,.018,.045),pow(h,.45));col+=vec3(.045,.06,.085)*smoothstep(.38,.72,n)*smoothstep(.01,.25,h);gl_FragColor=vec4(col,1.);}`,
    }),
  );
  scene.add(sky);
  scene.add(new T.HemisphereLight(0x9ebde2, 0x172033, 2.0));
  const moonlight = new T.DirectionalLight(0xb6d5ff, 3);
  moonlight.position.set(-250, 700, -600);
  scene.add(moonlight);
  const fill = new T.DirectionalLight(0xeabf87, 0.8);
  fill.position.set(300, 120, 200);
  scene.add(fill);
  const texCanvas = document.createElement("canvas");
  texCanvas.width = 128;
  texCanvas.height = 256;
  const c = texCanvas.getContext("2d");
  c.fillStyle = "#111c29";
  c.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 256; y += 12)
    for (let x = 5; x < 128; x += 10) {
      c.fillStyle =
        rand() > 0.42 ? (rand() > 0.2 ? "#b39b68" : "#819eae") : "#192632";
      c.fillRect(x, y, 3, 5);
    }
  const facade = new T.CanvasTexture(texCanvas);
  facade.colorSpace = T.SRGBColorSpace;
  facade.anisotropy = 4;
  const mat = new T.MeshStandardMaterial({
    map: facade,
    emissiveMap: facade,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    roughness: 0.8,
    metalness: 0.25,
  });
  for (let x = -33; x <= 33; x++)
    for (let z = -33; z <= 33; z++) {
      if (
        Math.abs(x) <= 0 ||
        Math.abs(z) <= 0 ||
        rand() < 0.12 ||
        reservedPlot(x * 95, z * 95)
      )
        continue;
      const district = districtAt(x * 95, z * 95);
      const h =
        district === "TRICORNER DOCKS"
          ? 18 + rand() * 40
          : district === "OLD GOTHAM"
            ? 35 + rand() * 85
            : district === "THE NARROWS"
              ? 40 + rand() * 115
              : 65 + Math.pow(rand(), 1.5) * 185;
      buildings.push({
        x: x * 95 + (rand() - 0.5) * 18,
        z: z * 95 + (rand() - 0.5) * 18,
        w: 30 + rand() * 30,
        d: 30 + rand() * 30,
        h,
      });
    }
  const geo = new T.BoxGeometry(1, 1, 1),
    blocks = new T.InstancedMesh(geo, mat, buildings.length),
    roofs = new T.InstancedMesh(
      geo,
      new T.MeshStandardMaterial({ color: 0x9baabd, roughness: 0.95 }),
      buildings.length,
    ),
    tops = new T.InstancedMesh(geo, mat, buildings.length);
  buildings.forEach((b, i) => {
    dummy.position.set(b.x, b.h / 2, b.z);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    blocks.setMatrixAt(i, dummy.matrix);
    const district = districtAt(b.x, b.z);
    blocks.setColorAt(
      i,
      new T.Color(
        district === "OLD GOTHAM"
          ? 0xb49d88
          : district === "TRICORNER DOCKS"
            ? 0x839796
            : district === "THE NARROWS"
              ? 0x9e8b99
              : 0xa7bed5,
      ),
    );
    dummy.position.y = b.h + 0.6;
    dummy.scale.set(b.w + 1, 1.2, b.d + 1);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    dummy.position.y = b.h + 5;
    dummy.scale.set(b.w * 0.48, 9, b.d * 0.48);
    dummy.updateMatrix();
    tops.setMatrixAt(i, dummy.matrix);
  });
  scene.add(blocks, roofs, tops);
  const spireBuildings = buildings.filter((b) => b.h > 140 && rand() > 0.4),
    spires = [];
  const antennas = new T.InstancedMesh(
      new T.CylinderGeometry(0.3, 1, 28, 5),
      new T.MeshStandardMaterial({ color: 0x576879 }),
      spireBuildings.length,
    ),
    beacons = new T.InstancedMesh(
      new T.SphereGeometry(0.8, 5, 4),
      new T.MeshBasicMaterial({ color: 0xff594b }),
      spireBuildings.length,
    );
  spireBuildings.forEach((b, i) => {
    dummy.position.set(b.x, b.h + 19, b.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    antennas.setMatrixAt(i, dummy.matrix);
    dummy.position.y = b.h + 33;
    dummy.updateMatrix();
    beacons.setMatrixAt(i, dummy.matrix);
  });
  scene.add(antennas, beacons);
  // Spatial instance batches allow the GPU to skip whole distant city blocks.
  const cityCells = [];
  for (const source of [blocks, roofs, tops, antennas, beacons]) {
    const cells = new Map(), matrix = new T.Matrix4(), color = new T.Color();
    for (let i=0;i<source.count;i++) {
      source.getMatrixAt(i,matrix);
      const x=Math.floor(matrix.elements[12]/700), z=Math.floor(matrix.elements[14]/700), key=x+','+z;
      if (!cells.has(key)) cells.set(key,{x:(x+.5)*700,z:(z+.5)*700,indices:[]});
      cells.get(key).indices.push(i);
    }
    scene.remove(source);
    for (const cell of cells.values()) {
      const mesh=new T.InstancedMesh(source.geometry,source.material,cell.indices.length);
      cell.indices.forEach((i,j)=>{source.getMatrixAt(i,matrix);mesh.setMatrixAt(j,matrix);if(source.instanceColor){source.getColorAt(i,color);mesh.setColorAt(j,color);}});
      mesh.computeBoundingSphere();scene.add(mesh);cityCells.push({mesh,x:cell.x,z:cell.z});
    }
    source.dispose();
  }


  const ground = new T.Mesh(
    new T.PlaneGeometry(8000, 8000),
    new T.MeshStandardMaterial({
      color: 0x182333,
      metalness: 0.5,
      roughness: 0.4,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  scene.add(ground);
  const streetMat = new T.MeshBasicMaterial({
      color: 0x91b9c9,
      transparent: true,
      opacity: 0.18,
    }),
    roads = new T.InstancedMesh(new T.PlaneGeometry(2, 6600), streetMat, 134);
  let ri = 0;
  for (let i = -33; i <= 33; i++) {
    for (let axis = 0; axis < 2; axis++) {
      dummy.rotation.set(-Math.PI / 2, 0, (axis * Math.PI) / 2);
      dummy.position.set(axis ? 0 : i * 95 + 46, 0.1, axis ? i * 95 + 46 : 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      roads.setMatrixAt(ri++, dummy.matrix);
    }
  }
  scene.add(roads);
  dummy.rotation.set(0, 0, 0);

  const tower = new T.Group();
  tower.position.set(-270, 0, -380);
  const stone = new T.MeshStandardMaterial({
    color: 0x253448,
    metalness: 0.25,
    roughness: 0.7,
    map: facade,
    emissiveMap: facade,
    emissive: 0x72889e,
    emissiveIntensity: 0.25,
  });
  for (let i = 0; i < 5; i++) {
    const m = new T.Mesh(
      new T.BoxGeometry(100 - i * 14, 60, 90 - i * 12),
      stone,
    );
    m.position.y = 30 + i * 52;
    tower.add(m);
  }
  for (const x of [-32, 32]) {
    const m = new T.Mesh(new T.ConeGeometry(12, 70, 4), stone);
    m.position.set(x, 300, 0);
    tower.add(m);
  }
  scene.add(tower);
  buildings.push({ x: -270, z: -380, w: 100, d: 90, h: 290 });
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sc = signCanvas.getContext("2d");
  sc.fillStyle = "#b5c7d1";
  sc.font = "500 50px serif";
  sc.textAlign = "center";
  sc.fillText("WAYNE", 256, 60);
  sc.font = "16px sans-serif";
  sc.fillText("ENTERPRISES", 256, 95);
  const sign = new T.Sprite(
    new T.SpriteMaterial({
      map: new T.CanvasTexture(signCanvas),
      transparent: true,
      opacity: 0.8,
    }),
  );
  sign.position.set(-270, 242, -333);
  sign.scale.set(66, 16, 1);
  scene.add(sign);
  const districts = createDistricts(scene, buildings);
  const moonCanvas = document.createElement("canvas");
  moonCanvas.width = 512;
  moonCanvas.height = 512;
  const mc = moonCanvas.getContext("2d");
  mc.fillStyle = "#d9e3de";
  mc.beginPath();
  mc.arc(256, 256, 249, 0, Math.PI * 2);
  mc.fill();
  mc.save();
  mc.clip();
  for (let i = 0; i < 900; i++) {
    const x = rand() * 512,
      y = rand() * 512,
      r = rand() * 27 + 1;
    const g = mc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(62,83,98,${rand() * 0.24})`);
    g.addColorStop(1, "rgba(70,90,100,0)");
    mc.fillStyle = g;
    mc.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  mc.restore();
  const moon = new T.Sprite(
    new T.SpriteMaterial({
      map: new T.CanvasTexture(moonCanvas),
      fog: false,
      color: 0xdae8f1,
    }),
  );
  moon.scale.set(460, 460, 1);
  moon.position.set(500, 650, -1900);
  scene.add(moon);
  const starsGeo = new T.BufferGeometry(),
    stars = [];
  for (let i = 0; i < 1300; i++) {
    stars.push(
      (rand() - 0.5) * 6000,
      450 + rand() * 2200,
      (rand() - 0.5) * 6000,
    );
  }
  starsGeo.setAttribute("position", new T.Float32BufferAttribute(stars, 3));
  scene.add(
    new T.Points(
      starsGeo,
      new T.PointsMaterial({
        color: 0xc5dbe7,
        size: 2.2,
        transparent: true,
        opacity: 0.65,
        fog: false,
      }),
    ),
  );
  const flakeCanvas = document.createElement("canvas");
  flakeCanvas.width = 32;
  flakeCanvas.height = 32;
  const fc = flakeCanvas.getContext("2d"),
    fg = fc.createRadialGradient(16, 16, 0, 16, 16, 16);
  fg.addColorStop(0, "#ffffff");
  fg.addColorStop(0.2, "#ffffffcc");
  fg.addColorStop(1, "#ffffff00");
  fc.fillStyle = fg;
  fc.fillRect(0, 0, 32, 32);
  const flakeTex = new T.CanvasTexture(flakeCanvas);
  const snowGeo = new T.BufferGeometry(),
    snow = new Float32Array(2100 * 3);
  for (let i = 0; i < snow.length; i += 3) {
    snow[i] = (rand() - 0.5) * 500;
    snow[i + 1] = (rand() - 0.5) * 300;
    snow[i + 2] = (rand() - 0.5) * 500;
  }
  snowGeo.setAttribute("position", new T.BufferAttribute(snow, 3));
  const snowPoints = new T.Points(
    snowGeo,
    new T.PointsMaterial({
      map: flakeTex,
      color: 0xd9ecff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  scene.add(snowPoints);
  const rings = [];
  const ringMat = new T.MeshBasicMaterial({
    color: 0x73d3de,
    transparent: true,
    opacity: 0.8,
  });
  for (const p of [
    [0, 130, -340],
    [350, 210, 0],
    [-420, 240, 350],
    [0, 175, 720],
    [-1100, 240, -750],
    [1400, 170, 1250],
    [-1400, 150, 1000],
  ]) {
    const ring = new T.Mesh(new T.TorusGeometry(21, 0.6, 6, 48), ringMat);
    ring.position.set(...p);
    scene.add(ring);
    rings.push(ring);
  }
  return {
    buildings,
    moon,
    rings,
    setGridIntegrity(value) {
      mat.emissiveIntensity = 0.15 + (0.5 * value) / 100;
    },
    update(dt, pos, t) {
      for (const cell of cityCells) cell.mesh.visible=Math.hypot(cell.x-pos.x,cell.z-pos.z)<(pos.y<25?1450:2700);
      districts.update(t);
      sky.position.copy(pos);
      sky.material.uniforms.time.value = t;
      for (let i = 0; i < spires.length; i++)
        spires[i].visible = Math.sin(t * 2 + i) > 0.1;
      snowPoints.position.copy(pos);
      const a = snowGeo.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        a[i] += (1.5 + Math.sin(t * 0.3 + i) * 0.6) * dt;
        a[i + 1] -= 13 * dt;
        if (a[i + 1] < -150) a[i + 1] = 150;
        if (a[i] > 250) a[i] = -250;
      }
      snowGeo.attributes.position.needsUpdate = true;
      for (const r of rings) {
        r.rotation.z = t * 0.12;
        r.material.opacity = 0.55 + Math.sin(t * 2) * 0.15;
      }
    },
    setQuality(low) {
      snowGeo.setDrawRange(0, low ? 700 : 2100);
    },
  };
}
