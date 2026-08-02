export function getPageFromUrl(url) {
    if (!url) return 1;
    try {
        const base = import.meta.env.VITE_API_URL || window.location.origin;
        const parsed = new URL(url, base);
        return Number(parsed.searchParams.get('page') || '1');
    } catch {
        return 1;
    }
}

export function parsePaginatedResponse(data, requestUrl) {
    if (data && Array.isArray(data.results)) {
        return {
            results: data.results,
            pagination: { next: data.next, previous: data.previous, count: data.count },
            page: getPageFromUrl(requestUrl),
        };
    }
    const results = Array.isArray(data) ? data : [];
    return {
        results,
        pagination: { next: null, previous: null, count: results.length },
        page: 1,
    };
}
