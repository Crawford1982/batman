#!/usr/bin/env node

/**
 * Generate CC0 replacement models for portal build
 * 
 * Creates simple procedural models to replace NC-licensed assets:
 * 1. Tactical vehicle (replaces Batmobile)
 * 2. Surveillance drone (replaces Predator UAV)
 */

import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a tactical noir vehicle (sleek, angular design)
 */
function createTacticalVehicle() {
  const vehicle = new T.Group();
  vehicle.name = 'TacticalVehicle';
  
  // Materials
  const bodyMat = new T.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.8,
    roughness: 0.3
  });
  
  const detailMat = new T.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.7,
    roughness: 0.4
  });
  
  const glassMat = new T.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.3
  });
  
  const lightMat = new T.MeshStandardMaterial({
    color: 0xff3300,
    emissive: 0xff3300,
    emissiveIntensity: 1
  });
  
  // Main body (lower hull)
  const body = new T.Mesh(
    new T.BoxGeometry(4.5, 0.8, 2),
    bodyMat
  );
  body.position.y = 0.4;
  vehicle.add(body);
  
  // Upper body (cabin)
  const cabin = new T.Mesh(
    new T.BoxGeometry(3, 1.2, 1.8),
    bodyMat
  );
  cabin.position.set(0, 1.2, 0);
  vehicle.add(cabin);
  
  // Windshield
  const windshield = new T.Mesh(
    new T.BoxGeometry(0.1, 0.8, 1.6),
    glassMat
  );
  windshield.position.set(1.3, 1.3, 0);
  windshield.rotation.z = -0.3;
  vehicle.add(windshield);
  
  // Hood
  const hood = new T.Mesh(
    new T.BoxGeometry(1.8, 0.6, 1.9),
    detailMat
  );
  hood.position.set(2.5, 0.7, 0);
  vehicle.add(hood);
  
  // Rear spoiler
  const spoiler = new T.Mesh(
    new T.BoxGeometry(0.2, 0.5, 1.8),
    detailMat
  );
  spoiler.position.set(-2.3, 1.5, 0);
  vehicle.add(spoiler);
  
  // Wheels (named for animation hookup)
  const wheelGeo = new T.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMat = new T.MeshStandardMaterial({
    color: 0x0a0a0a,
    metalness: 0.3,
    roughness: 0.7
  });
  
  const wheelPositions = [
    { x: 1.6, y: 0.4, z: 1.15, name: 'WheelFrontLeft' },
    { x: 1.6, y: 0.4, z: -1.15, name: 'WheelFrontRight' },
    { x: -1.6, y: 0.4, z: 1.15, name: 'WheelRearLeft' },
    { x: -1.6, y: 0.4, z: -1.15, name: 'WheelRearRight' }
  ];
  
  wheelPositions.forEach(pos => {
    const wheel = new T.Mesh(wheelGeo.clone(), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos.x, pos.y, pos.z);
    wheel.name = pos.name;
    vehicle.add(wheel);
  });
  
  // Headlights
  const headlightGeo = new T.BoxGeometry(0.2, 0.2, 0.4);
  const headlightMat = new T.MeshStandardMaterial({
    color: 0xffffaa,
    emissive: 0xffffaa,
    emissiveIntensity: 0.5
  });
  
  [-0.7, 0.7].forEach(z => {
    const light = new T.Mesh(headlightGeo, headlightMat);
    light.position.set(3.3, 0.6, z);
    vehicle.add(light);
  });
  
  // Tail lights
  [-0.6, 0.6].forEach(z => {
    const light = new T.Mesh(new T.BoxGeometry(0.1, 0.2, 0.3), lightMat);
    light.position.set(-2.3, 0.8, z);
    vehicle.add(light);
  });
  
  // Side panels
  [-1, 1].forEach(z => {
    const panel = new T.Mesh(
      new T.BoxGeometry(3.5, 0.3, 0.1),
      detailMat
    );
    panel.position.set(0, 0.9, z * 1);
    vehicle.add(panel);
  });
  
  // Center the vehicle
  vehicle.position.y = 0;
  
  return vehicle;
}

/**
 * Create a surveillance drone (quadcopter style)
 */
function createSurveillanceDrone() {
  const drone = new T.Group();
  drone.name = 'SurveillanceDrone';
  
  // Materials
  const bodyMat = new T.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.7,
    roughness: 0.4
  });
  
  const propMat = new T.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.5,
    roughness: 0.6
  });
  
  const sensorMat = new T.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.8
  });
  
  // Central body
  const body = new T.Mesh(
    new T.BoxGeometry(1.2, 0.4, 1.2),
    bodyMat
  );
  drone.add(body);
  
  // Sensor dome
  const sensor = new T.Mesh(
    new T.SphereGeometry(0.3, 16, 16),
    sensorMat
  );
  sensor.position.y = -0.3;
  drone.add(sensor);
  
  // Arms and rotors
  const armPositions = [
    { x: 1.2, z: 1.2 },
    { x: 1.2, z: -1.2 },
    { x: -1.2, z: 1.2 },
    { x: -1.2, z: -1.2 }
  ];
  
  armPositions.forEach((pos, i) => {
    // Arm
    const angle = Math.atan2(pos.z, pos.x);
    const arm = new T.Mesh(
      new T.CylinderGeometry(0.08, 0.08, 1.4, 8),
      bodyMat
    );
    arm.rotation.z = -angle + Math.PI / 2;
    arm.position.set(pos.x * 0.5, 0, pos.z * 0.5);
    drone.add(arm);
    
    // Rotor base
    const rotorBase = new T.Mesh(
      new T.CylinderGeometry(0.15, 0.15, 0.1, 8),
      bodyMat
    );
    rotorBase.position.set(pos.x, 0.1, pos.z);
    drone.add(rotorBase);
    
    // Rotor blades
    const rotor = new T.Group();
    rotor.name = `Rotor${i}`;
    rotor.position.set(pos.x, 0.15, pos.z);
    
    [-1, 1].forEach(side => {
      const blade = new T.Mesh(
        new T.BoxGeometry(0.8, 0.02, 0.12),
        propMat
      );
      blade.position.x = side * 0.4;
      rotor.add(blade);
    });
    
    drone.add(rotor);
  });
  
  // Antenna
  const antenna = new T.Mesh(
    new T.CylinderGeometry(0.02, 0.02, 0.6, 6),
    bodyMat
  );
  antenna.position.y = 0.5;
  drone.add(antenna);
  
  // Navigation lights
  const navLightGeo = new T.SphereGeometry(0.08, 8, 8);
  const greenMat = new T.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 1
  });
  const redMat = new T.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1
  });
  
  const greenLight = new T.Mesh(navLightGeo, greenMat);
  greenLight.position.set(0.5, 0, 0);
  drone.add(greenLight);
  
  const redLight = new T.Mesh(navLightGeo, redMat);
  redLight.position.set(-0.5, 0, 0);
  drone.add(redLight);
  
  return drone;
}

/**
 * Export scene as GLB
 */
function exportGLB(scene, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        resolve(Buffer.from(gltf));
      },
      (error) => {
        reject(error);
      },
      { binary: true }
    );
  });
}

async function main() {
  console.log('🎨 Generating CC0 replacement models...\n');
  
  const outputDir = path.join(__dirname, '../src/models');
  
  // Generate vehicle
  console.log('🚗 Creating tactical vehicle...');
  const vehicle = createTacticalVehicle();
  const vehicleScene = new T.Scene();
  vehicleScene.add(vehicle);
  const vehicleBuffer = await exportGLB(vehicleScene, 'nightblade.glb');
  await fs.writeFile(path.join(outputDir, 'nightblade.glb'), vehicleBuffer);
  console.log(`✓ Saved nightblade.glb (${(vehicleBuffer.length / 1024).toFixed(1)} KB)`);
  
  // Generate drone
  console.log('🚁 Creating surveillance drone...');
  const drone = createSurveillanceDrone();
  const droneScene = new T.Scene();
  droneScene.add(drone);
  const droneBuffer = await exportGLB(droneScene, 'surveillance-drone.glb');
  await fs.writeFile(path.join(outputDir, 'surveillance-drone.glb'), droneBuffer);
  console.log(`✓ Saved surveillance-drone.glb (${(droneBuffer.length / 1024).toFixed(1)} KB)`);
  
  console.log('\n✅ CC0 models generated successfully!');
  console.log('\nThese models are original procedural creations:');
  console.log('  • License: CC0 1.0 (Public Domain)');
  console.log('  • Author: Generated for Shadow Striker portal build');
  console.log('  • Commercial use: ✓ Allowed\n');
}

main().catch(err => {
  console.error('❌ Generation failed:', err);
  process.exit(1);
});
