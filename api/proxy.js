export default async function handler(req, res) {
  // Allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const target = decodeURIComponent(url);

    // Only allow Polymarket domains
    const allowed = [
      'gamma-api.polymarket.com',
      'clob.polymarket.com',
      'data-api.polymarket.com'
    ];
    const isAllowed = allowed.some(d => target.includes(d));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    });

    const data = await response.json();

    // Cache for 30 seconds
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
