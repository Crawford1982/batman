import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// Every model in public/ is compressed by scripts/compress-models.mjs with
// EXT_meshopt_compression and WebP textures; GLTFLoader handles WebP itself
// but needs the meshopt decoder registered.
export function createModelLoader() {
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}
