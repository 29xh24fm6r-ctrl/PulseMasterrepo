/**
 * Audio Utilities for Pulse Voice Gateway
 * Includes: G.711 Mu-Law Transcoding, Downsampling, and Packetization
 */

export function clamp16Bit(sample: number): number {
    return Math.max(-32768, Math.min(32767, sample));
}

export function isSilence(buffer: Int16Array, threshold: number = 100): boolean {
    let total = 0;
    for (const sample of buffer) {
        total += Math.abs(sample);
    }
    const avg = total / buffer.length;
    return avg < threshold;
}

export function downsampleBuffer(buffer: Buffer, inputRate: number, outputRate: number): Int16Array {
    if (inputRate === outputRate) return new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

    const sampleRatio = inputRate / outputRate;
    const inputSamples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    const outputLength = Math.floor(inputSamples.length / sampleRatio);
    const outputSamples = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
        const offset = Math.floor(i * sampleRatio);
        outputSamples[i] = inputSamples[offset];
    }
    return outputSamples;
}


const BIAS = 0x84;
const CLIP = 32635;
const SEG_MASK = 0x70;
const SEG_SHIFT = 4;

function valToMu(val: number): number {
    let mask;
    let seg;
    let aval;

    // Get the sign and the magnitude
    if (val < 0) {
        val = -val;
        mask = 0x7f;
    } else {
        mask = 0xff;
    }

    if (val > CLIP) val = CLIP;

    // Bias
    val += BIAS;

    // Segment determination
    if (val >= 0x4000) {
        seg = 7;
        aval = (val >> 10) & 0xf;
    } else if (val >= 0x2000) {
        seg = 6;
        aval = (val >> 9) & 0xf;
    } else if (val >= 0x1000) {
        seg = 5;
        aval = (val >> 8) & 0xf;
    } else if (val >= 0x800) {
        seg = 4;
        aval = (val >> 7) & 0xf;
    } else if (val >= 0x400) {
        seg = 3;
        aval = (val >> 6) & 0xf;
    } else if (val >= 0x200) {
        seg = 2;
        aval = (val >> 5) & 0xf;
    } else if (val >= 0x100) {
        seg = 1;
        aval = (val >> 4) & 0xf;
    } else {
        seg = 0;
        aval = (val >> 3) & 0xf;
    }

    return (seg << SEG_SHIFT) | aval | mask;
}

export function pcmToMuLaw(pcm: Int16Array): Buffer {
    const muBuffer = Buffer.alloc(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
        // Safety: Clamp before encoding
        const val = clamp16Bit(pcm[i]);
        // Invert bits for actual mu-law transmission
        muBuffer[i] = ~valToMu(val);
    }
    return muBuffer;
}

/**
 * Packetizer: Buffers incoming audio and emits fixed-size frames (20ms)
 * Twilio requires 8kHz Mu-Law, so 20ms = 160 samples = 160 bytes.
 */
export class Packetizer {
    private buffer: Buffer = Buffer.alloc(0);
    private readonly frameSize: number;

    constructor(frameSize: number) {
        this.frameSize = frameSize;
    }

    add(chunk: Buffer): Buffer[] {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        const frames: Buffer[] = [];

        while (this.buffer.length >= this.frameSize) {
            const frame = this.buffer.subarray(0, this.frameSize);
            frames.push(frame); // Copy not needed if we send immediately, but safe considering loop
            this.buffer = this.buffer.subarray(this.frameSize);
        }

        return frames;
    }

    clear() {
        this.buffer = Buffer.alloc(0);
    }
}
