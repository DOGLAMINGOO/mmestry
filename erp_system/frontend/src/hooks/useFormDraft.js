import { useEffect } from 'react';

export function loadDraft(key, defaultValue) {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
    } catch (err) {
        console.error('Failed to load saved draft', err);
        return defaultValue;
    }
}

export function useSaveDraft(key, draft) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const timeout = window.setTimeout(() => {
            try {
                window.localStorage.setItem(key, JSON.stringify(draft));
            } catch (err) {
                console.error('Failed to save draft', err);
            }
        }, 300);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [key, draft]);
}

export function clearDraft(key) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(key);
    } catch (err) {
        console.error('Failed to clear draft', err);
    }
}
