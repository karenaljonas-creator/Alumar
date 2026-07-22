-- Lista Mestre do Estoque Estratégico: tabela de CONFIGURAÇÃO (PN, descrição, quantidade mínima).
-- Não guarda movimentações. As movimentações ficam em estoque_pecas (entradas) e saida_pecas (saídas).
-- A tela "Estoque Estratégico" cruza os PNs com movimentação estratégica contra esta lista.
CREATE TABLE IF NOT EXISTS lista_mestre (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL DEFAULT '',
  quantidade_minima INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lista_mestre_codigo ON lista_mestre(codigo);

ALTER TABLE lista_mestre ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to lista_mestre" ON lista_mestre;
CREATE POLICY "Allow all access to lista_mestre" ON lista_mestre
  FOR ALL USING (true) WITH CHECK (true);
