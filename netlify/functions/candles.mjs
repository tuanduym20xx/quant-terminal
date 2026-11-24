
export default async function(req) {
  try {
    const q = new URL(req.url).searchParams;
    const s = q.get('symbol') || 'BTCUSDT';
    const i = q.get('interval') || '30m';
    const n = Math.min(9000, Math.max(300, Number(q.get('count')) || 1500));

    if (!/^[A-Z0-9]{3,20}$/.test(s) ||
        !['5m','15m','30m','1h','4h','1d'].includes(i)) {
      return Response.json({error:'Invalid parameters'}, {status:400});
    }

    let a = [];
    let end = Date.now() - 1;

    while (a.length < n) {
      let u = new URL('https://fapi.binance.com/fapi/v1/klines');

      u.search = new URLSearchParams({
        symbol:s,
        interval:i,
        limit:String(Math.min(1500,n-a.length)),
        endTime:String(end)
      });

      let r = await fetch(u, {
        signal:AbortSignal.timeout(8000)
      });

      if (!r.ok) throw Error('Binance HTTP '+r.status);

      let b = await r.json();

      if (!Array.isArray(b) || !b.length) break;

      a.unshift(...b);
      end = b[0][0] - 1;
    }

    return Response.json(
      a.filter(x => x[6] < Date.now())
       .map(x => x.slice(0,6).map(Number))
    );

  } catch(e) {
    return Response.json({error:e.message}, {status:502});
  }
}
