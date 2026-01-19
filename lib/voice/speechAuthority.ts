export function speak(text: string) {
    if (typeof window === 'undefined') return;

    // IPP Requirement: Pulse must never be silent.
    // We use browser architecture for the Inability Protocol to ensure 
    // it works even if the Voice Gateway is disconnected or blocked.

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Optional: Select a specific voice if available, but default is robust.

    window.speechSynthesis.speak(utterance);
}
