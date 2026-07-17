CREATE TABLE IF NOT EXISTS kpi_entries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  minutes INTEGER NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
