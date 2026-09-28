export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Берём token и method из query
    const { token, method } = req.query || {};

    if (!token || !method) {
        return res.status(400).json({ ok: false, error: 'missing token or method' });
    }

    if (!/^[a-zA-Z0-9:_-]+$/.test(method)) {
        return res.status(400).json({ ok: false, error: 'bad method' });
    }

    const url = `https://api.telegram.org/bot${token}/${method}`;

    // === Собираем тело POST ===
    let bodyString = '';

    if (req.method === 'POST') {
        if (typeof req.body === 'string') {
            // Vercel отдал body как строку (application/x-www-form-urlencoded)
            bodyString = req.body;
        } else if (req.body && typeof req.body === 'object') {
            // Vercel отдал body как объект (JSON или парсенную форму)
            bodyString = new URLSearchParams(req.body).toString();
        } else {
            // Читаем поток вручную
            try {
                const chunks = [];
                for await (const chunk of req) {
                    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                }
                bodyString = Buffer.concat(chunks).toString('utf-8');
            } catch (e) {
                bodyString = '';
            }
        }
    }

    // === Дополнительные параметры из query (кроме token и method) ===
    const extraParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
        if (key !== 'token' && key !== 'method') {
            extraParams.append(key, value);
        }
    }
    const extraStr = extraParams.toString();

    // Объединяем тело POST + параметры из URL
    let finalBody = bodyString;
    if (extraStr) {
        finalBody = finalBody ? finalBody + '&' + extraStr : extraStr;
    }

    // Если тело всё равно пустое — попробуем GET-запрос к Telegram
    const tgMethod = finalBody ? 'POST' : 'GET';
    const tgUrl = tgMethod === 'GET' && extraStr
        ? `${url}?${extraStr}`
        : url;

    try {
        const tgRes = await fetch(tgUrl, {
            method: tgMethod,
            headers: tgMethod === 'POST'
                ? { 'Content-Type': 'application/x-www-form-urlencoded' }
                : {},
            body: tgMethod === 'POST' ? finalBody : undefined,
        });

        const data = await tgRes.json();
        return res.status(tgRes.status).json(data);
    } catch (e) {
        return res.status(500).json({ ok: false, error: String(e) });
    }
}
