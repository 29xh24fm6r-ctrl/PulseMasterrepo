import { downsampleBuffer, pcmToMuLaw, Packetizer, clamp16Bit } from "../src/lib/audioUtils.ts";
import assert from "assert";

console.log("Found AudioUtils...");

// 1. Test Downsampling (24k -> 8k)
const inputRate = 24000;
const outputRate = 8000;
const durationSec = 1;

// Create 1 second of 24kHz buffer (48000 bytes)
const inputBuffer = Buffer.alloc(inputRate * 2);
const inputSamples = new Int16Array(inputBuffer.buffer);
for (let i = 0; i < inputSamples.length; i++) {
    inputSamples[i] = Math.sin(i * 0.1) * 10000; // Sine wave
}

console.log(`[Test] Input Buffer Size: ${inputBuffer.length} bytes / ${inputSamples.length} samples`);

const downsampled = downsampleBuffer(inputBuffer, inputRate, outputRate);
console.log(`[Test] Downsampled Size: ${downsampled.length} samples`);

assert.strictEqual(downsampled.length, outputRate * durationSec, "Downsampled length should match output rate * duration");
console.log("✅ Downsampling Correct");

// 2. Test Mu-Law Encoding
const mulaw = pcmToMuLaw(downsampled);
console.log(`[Test] Mu-Law Buffer Size: ${mulaw.length} bytes`);
assert.strictEqual(mulaw.length, outputRate * durationSec, "Mu-Law bytes should match 8k sample count (1 byte per sample)");
console.log("✅ Mu-Law Encoding Correct");

// 3. Test Packetizer
const FRAME_SIZE = 160; // 20ms
const packetizer = new Packetizer(FRAME_SIZE);
const frames = packetizer.add(mulaw);

console.log(`[Test] Generated Frames: ${frames.length}`);
assert.strictEqual(frames.length, 50, "Should generate 50 frames for 1 second of audio (1000ms / 20ms = 50)");
frames.forEach((f, i) => {
    assert.strictEqual(f.length, FRAME_SIZE, `Frame ${i} should be 160 bytes`);
});
console.log("✅ Packetizer Framing Correct");

// 4. Test Clipping
const clipped = clamp16Bit(40000);
assert.strictEqual(clipped, 32767, "Should clamp positive overflow");
const clippedNeg = clamp16Bit(-40000);
assert.strictEqual(clippedNeg, -32768, "Should clamp negative overflow");
console.log("✅ Clipping Correct");

console.log("\n🎉 ALL GOLDEN TESTS PASSED");
