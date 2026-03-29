// Cloudflare Pages Functions用ハンドラー
// worker/src/index.ts のロジックを統合

export const onRequest = async (context: any) => {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  
  // 全体共通のCORS設定 (Pages Functionsでは同一オリジンのため基本不要だが、念のため維持)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // APIパスの正規化
  const pathname = url.pathname;
  const roomId = url.searchParams.get('room');

  if (pathname.startsWith('/api/') && !roomId) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    return new Response('Missing room parameter', { status: 400, headers: corsHeaders });
  }

  const STATE_KEY = `ROOM_${roomId}_STATE`;
  const RESP_KEY = `ROOM_${roomId}_RESPONSES`;
  const Q_KEY = `ROOM_${roomId}_QUESTIONS`;

  // SSE (Server-Sent Events)
  if (pathname === '/api/stream' && request.method === 'GET') {
    let { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders,
    });

    waitUntil((async () => {
      try {
        let lastStateString = '';
        for (let i = 0; i < 1200; i++) {
          const currentStateRaw = await env.RIPPLE_KV.get(STATE_KEY) || '{"status": "waiting"}';
          const responsesRaw = await env.RIPPLE_KV.get(RESP_KEY) || '[]';
          const payload = JSON.stringify({ state: JSON.parse(currentStateRaw), responses: JSON.parse(responsesRaw) });
          
          if (payload !== lastStateString || i % 10 === 0) {
            await writer.write(encoder.encode(`data: ${payload}\n\n`));
            lastStateString = payload;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        console.error('SSE Error:', e);
      } finally {
        await writer.close();
      }
    })());

    return new Response(readable, { headers });
  }

  // 各種APIエンドポイント
  if (pathname === '/api/host/state' && request.method === 'POST') {
    const body = await request.text();
    await env.RIPPLE_KV.put(STATE_KEY, body, { expirationTtl: 86400 });
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }

  if (pathname === '/api/vote' && request.method === 'POST') {
    try {
      const { sessionId, answer } = await request.json() as any;
      const responsesRaw = await env.RIPPLE_KV.get(RESP_KEY) || '[]';
      let responses: any[] = JSON.parse(responsesRaw);
      const existingIndex = responses.findIndex((r: any) => r.sessionId === sessionId);
      if (existingIndex >= 0) responses[existingIndex].answer = answer;
      else responses.push({ sessionId, answer, timestamp: Date.now() });
      
      await env.RIPPLE_KV.put(RESP_KEY, JSON.stringify(responses), { expirationTtl: 7200 });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e) {
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }
  }

  if (pathname === '/api/host/clear_responses' && request.method === 'POST') {
    await env.RIPPLE_KV.put(RESP_KEY, '[]');
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }

  if (pathname === '/api/host/questions' && request.method === 'POST') {
    const body = await request.text();
    await env.RIPPLE_KV.put(Q_KEY, body);
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }

  if (pathname === '/api/questions' && request.method === 'GET') {
    const questionsRaw = await env.RIPPLE_KV.get(Q_KEY) || '[]';
    return new Response(questionsRaw, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
};
