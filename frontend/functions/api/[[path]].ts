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

  // ---- ゲスト機能エンドポイント（roomId不要） ----

  // ゲストトークン発行 (管理者専用)
  if (pathname === '/api/host/create_guest' && request.method === 'POST') {
    let days = 7;
    try {
      const body = await request.json() as any;
      if (body.days) days = body.days;
    } catch (e) { }

    const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    await env.RIPPLE_KV.put(
      `GUEST_TOKEN:${token}`,
      JSON.stringify({ valid: true, createdAt: Date.now() }),
      { expirationTtl: days * 86400 } // 指定された日数（秒）
    );
    // ゲスト用には専用の入り口（/invite）を使用
    const guestUrl = `${url.origin}/invite?guest=${token}`;
    return new Response(JSON.stringify({ url: guestUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ホスト認証API (環境変数を使用)
  if (pathname === '/api/host/login' && request.method === 'POST') {
    try {
      const { password } = await request.json() as any;
      const masterPassword = env.HOST_PASSWORD || '1234'; // 未設定時は暫定的に1234
      const success = (password === masterPassword);
      return new Response(JSON.stringify({ success }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }
  }

  // ゲストアクセス時: トークン検証 & ルームID払い出し
  if (pathname === '/api/guest/enter' && request.method === 'GET') {
    const token = url.searchParams.get('guest');
    if (!token) return new Response(JSON.stringify({ valid: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const data = await env.RIPPLE_KV.get(`GUEST_TOKEN:${token}`);
    if (!data) return new Response(JSON.stringify({ valid: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    // 訪問者ごとにユニークなルームIDを払い出す
    const shortId = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 6);
    const roomId = `guest-${shortId}`;
    return new Response(JSON.stringify({ valid: true, roomId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ---- 通常API (roomId必須) ----
  const roomId = url.searchParams.get('room');

  if (pathname.startsWith('/api/') && !roomId) {
    return new Response('Missing room parameter', { status: 400, headers: corsHeaders });
  }

  const STATE_KEY = `ROOM_${roomId}_STATE`;
  const RESP_KEY = `ROOM_${roomId}_RESPONSES`;
  const Q_KEY = `ROOM_${roomId}_QUESTIONS`;
  const REACT_KEY = `ROOM_${roomId}_REACTIONS`;

  // SSE (Server-Sent Events)
  if (pathname === '/api/stream' && request.method === 'GET') {
    // wantResults=false の参加者には回答集計・リアクションデータを送らない（KV節約）
    const wantResults = url.searchParams.get('wantResults') !== 'false';

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
          const stateObj = JSON.parse(currentStateRaw);

          let responsesRaw = '[]';
          let reactionsRaw = '[]';

          if (wantResults) {
            // ホスト・プレゼン画面のみ: 全データを読み込む
            responsesRaw = await env.RIPPLE_KV.get(RESP_KEY) || '[]';
            reactionsRaw = await env.RIPPLE_KV.get(REACT_KEY) || '[]';
            if (reactionsRaw !== '[]') {
              await env.RIPPLE_KV.delete(REACT_KEY);
            }
          }

          const payload = JSON.stringify({
            state: stateObj,
            responses: JSON.parse(responsesRaw),
            reactions: JSON.parse(reactionsRaw)
          });

          if (payload !== lastStateString || i % 10 === 0 || reactionsRaw !== '[]') {
            await writer.write(encoder.encode(`data: ${payload}\n\n`));
            lastStateString = payload;
          }

          // 休憩中はポーリング間隔を15秒に延長してKV読み取りを節約
          const isBreak = stateObj.status === 'break';
          await new Promise(resolve => setTimeout(resolve, isBreak ? 15000 : 1000));
        }
      } catch (e) {
        console.error('SSE Error:', e);
      } finally {
        await writer.close();
      }
    })());

    return new Response(readable, { headers });
  }

  // リアクション送信API
  if (pathname === '/api/reaction' && request.method === 'POST') {
    try {
      const { emoji } = await request.json() as any;
      const reactionsRaw = await env.RIPPLE_KV.get(REACT_KEY) || '[]';
      let reactions: any[] = JSON.parse(reactionsRaw);
      reactions.push({ emoji, id: Math.random().toString(36).substring(7), timestamp: Date.now() });
      // 直近30個くらいに制限
      if (reactions.length > 30) reactions = reactions.slice(-30);

      await env.RIPPLE_KV.put(REACT_KEY, JSON.stringify(reactions), { expirationTtl: 300 });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e) {
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }
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
