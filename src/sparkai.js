import hmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';

const SPARKAI_HOST = 'spark-api.xf-yun.com';
const SPARKAI_PATHNAME = '/v1.1/chat';
const SPARKAI_APP_ID = 'db45f79e';
const SPARKAI_API_SECRET = 'MWFiNjVmNDA4YjNhODFkZGE0MGQ1YWRj';
const SPARKAI_API_KEY = '6a3dfe79b9e9ec588ca65bf3b9d9c847';
const SPARKAI_DOMAIN = 'general';
const SPARKAI_TEMPERATURE = 0.4; // 0.1 ~ 1
const SPARKAI_MAX_TOKENS = 200; // 1 token = 1.5 chinese or 0.8 english
const SPARKAI_TOP_K = 3; // 1 ~ 6

const getWebSocketUrl = () => {
  const date = new Date().toGMTString();
  const apisecret = localStorage.getItem('sparkai.apisecret') || SPARKAI_API_SECRET;
  const apikey = localStorage.getItem('sparkai.apikey') || SPARKAI_API_KEY;

  const signatureRaw = `host: ${SPARKAI_HOST}\ndate: ${date}\nGET ${SPARKAI_PATHNAME} HTTP/1.1`;
  const signature = Base64.stringify(hmacSHA256(signatureRaw, apisecret));

  const authorizationRaw = `api_key="${apikey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = btoa(authorizationRaw);

  return `wss://${SPARKAI_HOST}${SPARKAI_PATHNAME}?authorization=${authorization}&date=${date}&host=${SPARKAI_HOST}`;
};

export function askSpark(messages) {
  const appid = localStorage.getItem('sparkai.appid') || SPARKAI_APP_ID;
  return new Promise((resolve) => {
    const ws = new WebSocket(getWebSocketUrl());
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          header: {
            app_id: appid,
            uid: appid,
          },
          parameter: {
            chat: {
              domain: SPARKAI_DOMAIN,
              temperature: SPARKAI_TEMPERATURE,
              max_tokens: SPARKAI_MAX_TOKENS,
              top_k: SPARKAI_TOP_K,
            },
          },
          payload: {
            message: {
              text: messages,
            },
          },
        }),
      );
    };
    let message = '';
    ws.onerror = (e) => resolve(message);
    ws.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      if (data.header.code !== 0) return resolve(message);
      message += data.payload.choices.text.map((text) => text.content).join('');
      if (data.header.status === 2) {
        ws.close();
        resolve(message.trim());
      }
    };
  });
}
