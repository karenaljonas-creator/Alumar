-- Tabela de snapshots semanais
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id SERIAL PRIMARY KEY,
  week TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week, date)
);

-- Sem RLS para permitir acesso público
ALTER TABLE weekly_snapshots DISABLE ROW LEVEL SECURITY;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_snapshots_week ON weekly_snapshots(week);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON weekly_snapshots(date DESC);
