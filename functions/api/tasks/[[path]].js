/**
 * /api/tasks — the task board for bots and scripts.
 *
 *   GET  /api/tasks[?cat=&src=user|ours|elsewhere]   open tasks
 *   POST /api/tasks {title, what, cat, contact, by?, place?, baht?, shoup?, name?, cat_new?, up?}
 *   GET  /api/tasks/:id
 *   POST /api/tasks/:id/answers {name, contact, note?, baht?}   an offer, or a take on one of ours
 *   POST /api/tasks/:id/own/:token {do: shoup|fixed|accept|close|taken, answer?}
 *   POST /api/tasks/:id/admin {do: …}   Authorization: Bearer TASKS_ADMIN
 *   GET  /api/tasks/new     kinds of work posters named that the graph lacks
 *   GET  /api/tasks/graph   the graph (also /tasks/graph.json)
 */
import { CAT, NODES, ORGS, L, ORIGIN, openTasks, answersFor, pub, createTask, createAnswer, ownTask, ownerAct, adminAct, namedKinds, readBody, catBaht } from '../../_tasks.js'

const json = (body, status = 200) => new Response(JSON.stringify(body, null, 1), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
})

export async function onRequest(ctx) {
  const { request, env, params } = ctx
  const path = [].concat(params.path || [])
  const m = request.method
  if (m === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': 'content-type,authorization' } })
  if (!env.TASKS) return json({ error: 'The board is not connected yet.' }, 503)
  const db = env.TASKS, now = Date.now()
  const [a, b, c] = path

  if (!a) {
    if (m === 'POST') {
      const r = await createTask(ctx, await readBody(request))
      return json(r, r.status)
    }
    const u = new URL(request.url)
    const cat = u.searchParams.get('cat'), src = u.searchParams.get('src')
    if (cat && !CAT[cat]) return json({ error: 'No such category', graph: `${ORIGIN}/tasks/graph.json` }, 404)
    const rows = await openTasks(db, now, { cat, src: src ? [src] : null })
    const ans = await answersFor(db, rows.map((t) => t.id))
    return json({
      board: `${ORIGIN}/tasks`, graph: `${ORIGIN}/tasks/graph.json`,
      post: `POST ${ORIGIN}/api/tasks {"title","what","cat","contact","by":"robot|human|either","baht","shoup":true}`,
      tasks: rows.map((t) => pub(t, ans[t.id] || [], now)),
    })
  }
  if (a === 'new') return json({ new: await namedKinds(db) })
  if (a === 'graph') return Response.redirect(`${ORIGIN}/tasks/graph.json`, 302)
  if (a === 'prices') {
    const out = {}
    for (const n of NODES) if (n.price?.baht != null) out[n.id] = await catBaht(db, n.id, now)
    return json({ ladder: L, answer_price_baht: out })
  }

  const id = Number(a)
  if (!Number.isInteger(id) || id < 1) return json({ error: 'No such task' }, 404)
  if (!b) {
    const t = await db.prepare("SELECT * FROM task WHERE id = ? AND state != 'held'").bind(id).first()
    if (!t) return json({ error: 'No such task' }, 404)
    const ans = await answersFor(db, [id])
    return json({ task: pub(t, ans[id] || [], now), answer: `POST ${ORIGIN}/api/tasks/${id}/answers {"name","contact","note","baht"}` })
  }
  if (b === 'answers' && m === 'POST') {
    const r = await createAnswer(ctx, id, await readBody(request))
    return json(r, r.status)
  }
  if (b === 'own' && m === 'POST') {
    const t = await ownTask(db, id, c)
    if (!t) return json({ error: 'That link does not open this task' }, 403)
    return json(await ownerAct(ctx, t, await readBody(request)))
  }
  if (b === 'admin' && m === 'POST') {
    const key = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!env.TASKS_ADMIN || key !== env.TASKS_ADMIN) return json({ error: 'Key' }, 401)
    const r = await adminAct(ctx, id, await readBody(request))
    return json(r, r.status)
  }
  return json({ error: 'No such route', orgs: Object.keys(ORGS) }, 404)
}
