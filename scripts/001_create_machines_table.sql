-- Tabela de máquinas
CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  modelo TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  status_operacional TEXT NOT NULL,
  tipo_equipamento TEXT NOT NULL,
  pressao_trabalho NUMERIC,
  vazao NUMERIC,
  potencia_motor NUMERIC,
  horas_operacao NUMERIC DEFAULT 0,
  data_ultima_manutencao TIMESTAMP,
  proxima_manutencao TIMESTAMP,
  contrato TEXT,
  observacoes TEXT,
  acao_responsavel TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sem RLS para permitir acesso público (todos podem ver e editar as mesmas máquinas)
ALTER TABLE machines DISABLE ROW LEVEL SECURITY;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status_operacional);
CREATE INDEX IF NOT EXISTS idx_machines_tipo ON machines(tipo_equipamento);
CREATE INDEX IF NOT EXISTS idx_machines_localizacao ON machines(localizacao);
