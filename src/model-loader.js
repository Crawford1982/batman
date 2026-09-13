import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// Every model in public/ is compressed by scripts/compress-models.mjs with
// EXT_meshopt_compression and WebP textures; GLTFLoader handles WebP itself
// but needs the meshopt decoder registered.
export function createModelLoader() {
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

// These game GLBs are self-contained. Bound downloads so retry never reuses a
// permanently pending request; callback failures also reach the loading UI.
export function loadModelWithTimeout(url, onLoad, onProgress, onError) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  (async () => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Vehicle download: HTTP " + response.status);
      const data = await response.arrayBuffer();
      onProgress?.({ loaded: data.byteLength, total: data.byteLength });
      const base = new URL(".", new URL(url, location.href)).href;
      const model = await createModelLoader().parseAsync(data, base);
      onLoad(model);
    } catch (error) {
      onError(error);
    } finally {
      clearTimeout(timeout);
    }
  })();
}
