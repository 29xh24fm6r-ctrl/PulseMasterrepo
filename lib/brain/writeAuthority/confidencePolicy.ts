export const AUTO_WRITE_THRESHOLD = 0.85;
export const CONFIRM_THRESHOLD = 0.6;

export function getWriteMode(confidence: number): 'auto' | 'confirm' | 'proposed' {
    if (confidence >= AUTO_WRITE_THRESHOLD) return 'auto';
    if (confidence >= CONFIRM_THRESHOLD) return 'confirm';
    return 'proposed';
}
