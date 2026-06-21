export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { start, end } = req.query;

    const url = `https://trumpmeter.live/?start=${start}&end=${end}&eventType=weekly`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    const html = await response.text();

    // Extract totals using same pattern as muskmeter
    const totalMatch = html.match(/Event Total[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*(\d+)\s*<\/div>/);
    const projMatch = html.match(/Event Projection[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*(\d+)\s*<\/div>/);
    const trendMatch = html.match(/Event Trend Projection[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*(\d+)\s*<\/div>/);
    const lastPostMatch = html.match(/Last Post[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*([^<]+?)\s*<\/div>/);

    const totalRowMatch = html.match(/Total<\/th>([\s\S]*?)<\/tr>/);
    let dailyCounts = [];
    if (totalRowMatch) {
      const cells = totalRowMatch[1].match(/<td[^>]*>\s*([\d—-]+)\s*<\/td>/g) || [];
      dailyCounts = cells.map(c => {
        const m = c.match(/>(\d+)</);
        return m ? parseInt(m[1]) : 0;
      });
    }

    const eventTotal = totalMatch ? parseInt(totalMatch[1]) : null;
    const projection = projMatch ? parseInt(projMatch[1]) : null;
    const trendProjection = trendMatch ? parseInt(trendMatch[1]) : null;
    const lastPost = lastPostMatch ? lastPostMatch[1].trim() : null;

    const validDays = dailyCounts.filter(d => d > 0);
    const avgPerDay = validDays.length > 0
      ? Math.round(validDays.reduce((a,b) => a+b, 0) / validDays.length)
      : null;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({
      eventTotal, projection, trendProjection, lastPost,
      dailyCounts, avgPerDay, daysWithData: validDays.length,
      creator: 'trump', platform: 'Truth Social'
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
