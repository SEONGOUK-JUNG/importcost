// Cloudflare Worker: importcost-rates
// AniBridge와 동일한 방식으로 배포
// wrangler.toml 설정 후 `wrangler deploy` 실행

const CACHE_TTL = 3600; // 1시간 캐시

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 헤더
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // /rates 엔드포인트
    if (url.pathname === '/rates') {
      try {
        // Cloudflare Cache API 활용
        const cacheKey = new Request('https://open.er-api.com/v6/latest/USD');
        const cache = caches.default;
        let cached = await cache.match(cacheKey);

        if (cached) {
          return new Response(cached.body, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          });
        }

        // 실시간 환율 가져오기
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();

        // KRW 기준으로 주요 통화 계산
        const krw = data.rates.KRW;
        const result = {
          base: 'USD',
          timestamp: data.time_last_update_unix,
          updated: new Date(data.time_last_update_unix * 1000).toISOString(),
          rates: {
            USD_KRW: Math.round(krw),
            CNY_KRW: parseFloat((krw / data.rates.CNY).toFixed(2)),
            EUR_KRW: Math.round(krw / data.rates.EUR),
            JPY_KRW: parseFloat((krw / data.rates.JPY).toFixed(4)),
            AUD_KRW: Math.round(krw / data.rates.AUD),
            VND_KRW: parseFloat((krw / data.rates.VND).toFixed(6)),
            INR_KRW: parseFloat((krw / data.rates.INR).toFixed(4)),
            SGD_KRW: Math.round(krw / data.rates.SGD),
          }
        };

        const response = new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL}`,
            'X-Cache': 'MISS'
          }
        });

        // Cloudflare 엣지에 캐시
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;

      } catch (err) {
        // 폴백 — 최근 고시환율 기본값
        return new Response(JSON.stringify({
          error: 'fetch_failed',
          rates: {
            USD_KRW: 1374,
            CNY_KRW: 190.2,
            EUR_KRW: 1498,
            JPY_KRW: 9.18,
            AUD_KRW: 880,
            VND_KRW: 0.054,
            INR_KRW: 16.5,
            SGD_KRW: 1028,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('ImportCost Rate API', { headers: corsHeaders });
  }
};
