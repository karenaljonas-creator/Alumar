-- Tabela de histórico de mudanças
CREATE TABLE IF NOT EXISTS machine_history (
  id SERIAL PRIMARY KEY,
  machine_id TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Sem RLS para permitir acesso público
ALTER TABLE machine_history DISABLE ROW LEVEL SECURITY;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_history_machine ON machine_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON machine_history(timestamp DESC);
