import api from '../api';

export async function fetchAllPages(endpoint) {
    const records = [];
    const [path, query = ''] = endpoint.split('?');
    const params = new URLSearchParams(query);
    let page = Number(params.get('page') || '1');

    while (true) {
        params.set('page', String(page));
        const response = await api.get(`${path}?${params.toString()}`);
        const data = response.data;

        if (Array.isArray(data)) {
            records.push(...data);
            break;
        }

        const pageResults = data?.results || [];
        records.push(...pageResults);
        if (!data?.next || pageResults.length === 0) break;
        page += 1;
    }

    return records;
}