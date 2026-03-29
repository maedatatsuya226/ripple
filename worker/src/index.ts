export interface Env {
  RIPPLE_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 全体共通のCORS設定
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // プリフライトリクエストの処理
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // SSE (Server-Sent Events) エンドポイント
    if (url.pathname === '/api/stream' && request.method === 'GET') {
      let { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders,
      });

      ctx.waitUntil((async () => {
        try {
          let lastStateString = '';
          // イベントループ (Cloudflare Workers内でのポーリング)
          // 最大約20分の接続を維持
          for (let i = 0; i < 1200; i++) {
            // KVから最新のホスト状態と回答データを取得
            const currentStateRaw = await env.RIPPLE_KV.get('CURRENT_STATE') || '{"status": "waiting"}';
            const responsesRaw = await env.RIPPLE_KV.get('RESPONSES') || '[]';
            
            const stateObj = JSON.parse(currentStateRaw);
            const responsesObj = JSON.parse(responsesRaw);
            
            // クライアントへ送信するペイロード
            const payload = JSON.stringify({ state: stateObj, responses: responsesObj });
            
            // 状態が変化したか、もしくは10秒ごとのPingとして送信
            if (payload !== lastStateString || i % 10 === 0) {
              await writer.write(encoder.encode(`data: ${payload}\n\n`));
              lastStateString = payload;
            }
            
            // 1秒待機 (KVの読み取り頻度を制御)
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

    // ホスト: 現在の状態(問題切替等)を更新
    if (url.pathname === '/api/host/state' && request.method === 'POST') {
      const body = await request.text();
      await env.RIPPLE_KV.put('CURRENT_STATE', body, { expirationTtl: 86400 }); // 24時間保持
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // 参加者: 回答を送信
    if (url.pathname === '/api/vote' && request.method === 'POST') {
      try {
        const { sessionId, answer } = await request.json() as { sessionId: string; answer: any };
        
        // 簡易的なRead-Modify-Write (30-50人規模ならKVの同時書き込みでも実用範囲内)
        const responsesRaw = await env.RIPPLE_KV.get('RESPONSES') || '[]';
        let responses: any[] = JSON.parse(responsesRaw);
        
        // 既存のセッションIDがあるか確認 (重複防止)
        const existingIndex = responses.findIndex(r => r.sessionId === sessionId);
        if (existingIndex >= 0) {
           responses[existingIndex].answer = answer; // 上書き（またはブロックしてもよい）
        } else {
           responses.push({ sessionId, answer, timestamp: Date.now() });
        }
        
        await env.RIPPLE_KV.put('RESPONSES', JSON.stringify(responses), { expirationTtl: 7200 }); // 2時間保持
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response('Bad Request', { status: 400, headers: corsHeaders });
      }
    }

    // ホスト: 回答データをリセット
    if (url.pathname === '/api/host/clear_responses' && request.method === 'POST') {
      await env.RIPPLE_KV.put('RESPONSES', '[]');
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ホスト: 問題セットを保存
    if (url.pathname === '/api/host/questions' && request.method === 'POST') {
      const body = await request.text();
      await env.RIPPLE_KV.put('QUESTIONS', body);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // クライアント/ホスト: 問題セットを取得
    if (url.pathname === '/api/questions' && request.method === 'GET') {
      const questionsRaw = await env.RIPPLE_KV.get('QUESTIONS') || '[]';
      return new Response(questionsRaw, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
