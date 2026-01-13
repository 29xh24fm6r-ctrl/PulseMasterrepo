export type SttSegment = {
    text: string;
    isFinal: boolean;
    confidence?: number;
};

export interface SttStream {
    writeAudioMulaw8k(chunk: Buffer): void;
    onSegment(cb: (seg: SttSegment) => void): void;
    close(): void;
}
