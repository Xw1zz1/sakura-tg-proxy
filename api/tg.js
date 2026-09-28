export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { token, method, ...params } = req.query;

    if (!token || !method) {
        return res.status(400).json({ ok: false, error: 'missing token or method' });
    }

    if (!/^[a-zA-Z0-9:_-]+$/.test(method)) {
        return res.status(400).json({ ok: false, error: 'bad method' });
    }

    const url = `https://api.telegram.org/bot${token}/${method}`;

    try {
        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            body.append(key, value);
        }

        const tgRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        const data = await tgRes.json();
        return res.status(tgRes.status).json(data);
    } catch (e) {
        return res.status(500).json({ ok: false, error: String(e) });
    }
}
