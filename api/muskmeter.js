export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { start, end, eventId } = req.query;

    // Fetch MuskMeter page with the event params
    const url = `https://www.muskmeter.live/?start=${start}&end=${end}&eventId=${eventId}&eventType=weekly&source=3`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    const html = await response.text();

    // Extract tweet count - look for "Event Total" value
    const totalMatch = html.match(/Event Total[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*(\d+)\s*<\/div>/);
    
    // Extract projection
    const projMatch = html.match(/Event Projection[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*(\d+)\s*<\/div>/);
    
    // Extract trend projection  
    const trendMatch = html.match(/Event Trend Projection[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*(\d+)\s*<\/div>/);

    // Extract hourly data - look for the table totals row
    const totalRowMatch = html.match(/Total<\/th>([\s\S]*?)<\/tr>/);
    
    // Extract last post time
    const lastPostMatch = html.match(/Last Post[\s\S]*?<\/div>[\s\S]*?<div[^>]*>\s*([^<]+?)\s*<\/div>/);

    // Extract daily totals from the Total row
    let dailyCounts = [];
    if (totalRowMatch) {
      const cells = totalRowMatch[1].match(/<td[^>]*>\s*([\d—-]+)\s*<\/td>/g) || [];
      dailyCounts = cells.map(c => {
        const m = c.match(/>(\d+)</);
        return m ? parseInt(m[1]) : 0;
      });
    }

    // Also try to find the "0" current total more reliably
    // Look for the big number displayed prominently
    const bigNumMatch = html.match(/<div[^>]*class="[^"]*text-[4-9]xl[^"]*"[^>]*>\s*(\d+)\s*<\/div>/);
    
    // Parse what we found
    const eventTotal = totalMatch ? parseInt(totalMatch[1]) : null;
    const projection = projMatch ? parseInt(projMatch[1]) : null;
    const trendProjection = trendMatch ? parseInt(trendMatch[1]) : null;
    const lastPost = lastPostMatch ? lastPostMatch[1].trim() : null;

    // Calculate current pace based on daily counts
    const validDays = dailyCounts.filter(d => d > 0);
    const avgPerDay = validDays.length > 0 
      ? validDays.reduce((a,b) => a+b, 0) / validDays.length 
      : null;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({
      eventTotal,
      projection,
      trendProjection,
      lastPost,
      dailyCounts,
      avgPerDay: avgPerDay ? Math.round(avgPerDay) : null,
      daysWithData: validDays.length,
      raw: {
        hasTotal: !!totalMatch,
        hasProjection: !!projMatch,
        hasTrend: !!trendMatch,
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
