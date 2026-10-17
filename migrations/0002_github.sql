-- hongdam.net/github — bookings, in D1 hongdam-tasks (bound as TASKS).
CREATE TABLE IF NOT EXISTS gh_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,        -- GH-xxxxxx, given to the buyer
  kind TEXT NOT NULL,              -- profile · showcase · whole
  login TEXT NOT NULL,             -- the GitHub username
  contact TEXT NOT NULL,           -- private
  note TEXT,
  baht INTEGER NOT NULL,
  usd INTEGER NOT NULL,
  week INTEGER NOT NULL,           -- the Shoup week the slot sits in (functions/_github.js weekOf)
  state TEXT NOT NULL DEFAULT 'booked', -- booked · paid · done · void
  paid_ref TEXT,                   -- bank reference from SlipOK
  created_at TEXT NOT NULL,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS gh_order_week ON gh_order (kind, week);
