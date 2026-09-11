import test from "node:test";
import assert from "node:assert/strict";
import { modelProgress } from "../src/loading-progress.js";
test("download progress reports measured bytes without inventing unknown totals", () => {
  assert.equal(modelProgress(2100000,7300000),"LOADING BATWING · 2.1 / 7.3 MB");
  assert.equal(modelProgress(2100000,0),"LOADING BATWING · 2.1 MB RECEIVED");
  assert.equal(modelProgress(0,0),"LOADING BATWING…");
});
