-- hongdam.net/tasks — D1 database hongdam-tasks, bound as TASKS on the Pages project.
CREATE TABLE IF NOT EXISTS task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE,                 -- seed key; null for posts from the form or API
  src TEXT NOT NULL,               -- user · ours · elsewhere
  org TEXT,                        -- motdang · hongdam · cmvd, for ours
  poster TEXT,                     -- display name
  cat TEXT NOT NULL,
  cat_new TEXT,                    -- a category the poster named that the graph lacks
  by TEXT NOT NULL DEFAULT 'either', -- robot · human · either
  title TEXT NOT NULL,
  title_th TEXT,
  what TEXT,
  what_th TEXT,
  place TEXT,
  href TEXT,                       -- where the work is done, or where it was asked
  site TEXT,                       -- the other site, for elsewhere
  contact TEXT,                    -- private
  price_kind TEXT NOT NULL,        -- shoup · fixed · mirror · none
  baht REAL,                       -- fixed price, or the Shoup opening price
  price_note TEXT,                 -- mirror: the price where it lives
  unit TEXT,
  slots INTEGER NOT NULL DEFAULT 3, -- takers or answers a week that count as full
  token TEXT,                      -- the poster's own link
  state TEXT NOT NULL DEFAULT 'open', -- open · taken · closed · held
  created_at TEXT NOT NULL,
  shoup_at TEXT,                   -- when the Shoup clock started
  ends_at TEXT,
  closed_at TEXT,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS task_state ON task (state, src);
CREATE INDEX IF NOT EXISTS task_cat ON task (cat);

CREATE TABLE IF NOT EXISTS answer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  org TEXT,                        -- motdang · hongdam · cmvd when one of ours answers
  kind TEXT NOT NULL,              -- offer · take
  name TEXT,
  note TEXT,
  baht REAL,
  contact TEXT,                    -- private
  state TEXT NOT NULL DEFAULT 'up', -- up · held · down
  accepted_at TEXT,
  created_at TEXT NOT NULL,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS answer_task ON answer (task_id, created_at);

-- the price Mot Dang, Hongdam and the Visa Desk answer with, per category, stepped monthly
CREATE TABLE IF NOT EXISTS catprice (
  cat TEXT PRIMARY KEY,
  rung INTEGER NOT NULL,
  stepped_at TEXT NOT NULL,
  log TEXT
);
