/**
 * Client proxy IPTV — tous les appels à l'API Xtream Codes passent ici.
 * Les credentials ne transitent JAMAIS côté client.
 */
import http from "http";
import https from "https";

export interface Creds { server: string; username: string; password: string; }

function httpRequest(urlStr: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(url, {
      headers: {
        "User-Agent": "Lavf/60.16.100",
        "Connection": "close"
      }
    }, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`IPTV API error: ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function httpRequestWithRetry(urlStr: string, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await httpRequest(urlStr);
    } catch (err: any) {
      if (i === retries) throw err;
      console.warn(`[IPTV] Request failed, retrying in 100ms (${i + 1}/${retries}). Error: ${err.message}`);
      await sleep(100);
    }
  }
}

async function call(creds: Creds, params: Record<string, string>) {
  const url = new URL(`${creds.server}/player_api.php`);
  url.searchParams.set("username", creds.username);
  url.searchParams.set("password", creds.password);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  return httpRequestWithRetry(url.toString());
}


export const iptv = {
  authenticate:       (c: Creds) => call(c, { action: "get_live_categories" }),
  liveCategories:     (c: Creds) => call(c, { action: "get_live_categories" }),
  liveStreams:        (c: Creds, catId: string) => call(c, { action: "get_live_streams", category_id: catId }),
  vodCategories:      (c: Creds) => call(c, { action: "get_vod_categories" }),
  vodStreams:         (c: Creds, catId: string) => call(c, { action: "get_vod_streams", category_id: catId }),
  seriesCategories:   (c: Creds) => call(c, { action: "get_series_categories" }),
  series:            (c: Creds, catId: string) => call(c, { action: "get_series", category_id: catId }),
  seriesInfo:        (c: Creds, seriesId: string) => call(c, { action: "get_series_info", series_id: seriesId }),
  epg:               (c: Creds, streamId: string) => call(c, { action: "get_short_epg", stream_id: streamId, limit: "5" }),

  liveUrl:  (c: Creds, streamId: string) => `${c.server}/live/${c.username}/${c.password}/${streamId}.m3u8`,
  movieUrl: (c: Creds, streamId: string, ext = "mp4") => `${c.server}/movie/${c.username}/${c.password}/${streamId}.${ext}`,
  episodeUrl:(c: Creds, streamId: string, ext = "mp4") => `${c.server}/series/${c.username}/${c.password}/${streamId}.${ext}`,
};
