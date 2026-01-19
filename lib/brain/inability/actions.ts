import { InabilityAction } from './types';

function setDevUserAndReload() {
    if (typeof window === 'undefined') return;
    // Logic to set dev user. Usually implies hitting a bootstrap endpoint or clearing blocks.
    // Based on previous context, forcing a dev bootstrap might be the key.
    fetch('/api/dev/bootstrap', { method: 'POST' })
        .then(() => window.location.reload())
        .catch(err => {
            console.error('Failed to set dev user:', err);
            // Fallback: try to set local storage directly if API fails?
            // localStorage.setItem('pulse_owner_user_id', 'dev-user-id'); // Dangerous assumption?
            // stick to reload for now if bootstrap fails.
            window.location.reload();
        });
}

export function handleInabilityAction(action: InabilityAction) {
    if (typeof window === 'undefined') return;

    switch (action) {
        case 'SET_DEV_USER':
            setDevUserAndReload();
            break;
        case 'RETRY':
            window.location.reload();
            break;
        case 'NAVIGATE':
            // Basic client-side nav if available, or location usage
            window.location.href = '/';
            break;
        case 'NONE':
        default:
            break;
    }
}
