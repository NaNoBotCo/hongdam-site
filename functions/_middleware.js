/**
 * The edge count for a Cloudflare Pages site.
 *
 * WHY MIDDLEWARE AND NOT THE traffic-eye COLLECTOR
 * The collector Worker sits in front of a site and calls `fetch(request)` to
 * reach the origin. On a hostname that IS a Pages custom domain there is no
 * origin behind the edge: that fetch resolves to this same hostname and the
 * Worker calls itself. Pages middleware runs inside the project instead and
 * hands the request on with `next()`, so there is nothing to loop through.
 *
 * WHAT IT RECORDS
 * One row per request, in the blob order src/collector.js uses, into the same
 * `traffic_eye` dataset motdang.net writes to — host, category, agent, path,
 * country, status, referrer host, method. Nothing is added to any page, no
 * script runs in a reader's browser, no cookie is set, and the referring URL
 * is reduced to its host before it is stored.
 *
 * THE CONTRACT
 * This runs on every request to a live site, so it must not be able to break
 * one. `next()` is called first and its result returned whatever happens;
 * recording sits inside a try/catch whose failure path is to do nothing.
 */
import { classify } from './_classify.js';

export async function onRequest(context) {
  const started = Date.now();
  const response = await context.next();
  try {
    context.waitUntil(record(context, response, Date.now() - started));
  } catch {
    // Recording is never worth an error page.
  }
  return response;
}

async function record(context, response, ms) {
  const env = context.env;
  if (!env || !env.TRAFFIC) return; // binding not attached yet — nothing to do

  const request = context.request;
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const { category, agent } = classify(ua);

  let refHost = '';
  const ref = request.headers.get('referer');
  if (ref) {
    try {
      const r = new URL(ref);
      refHost = r.host === url.host ? '(same site)' : r.host;
    } catch {
      refHost = '(unparseable)';
    }
  }

  env.TRAFFIC.writeDataPoint({
    blobs: [
      url.host,
      category,
      agent,
      trimPath(url.pathname),
      request.cf?.country || 'XX',
      String(response.status),
      refHost,
      request.method,
    ],
    doubles: [1, response.status, ms],
    indexes: [url.host],
  });
}

function trimPath(pathname) {
  return pathname.length > 96 ? pathname.slice(0, 96) + '…' : pathname;
}
