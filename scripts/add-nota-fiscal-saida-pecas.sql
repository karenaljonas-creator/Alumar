-- Adicionar coluna nota_fiscal à tabela saida_pecas
ALTER TABLE saida_pecas ADD COLUMN IF NOT EXISTS nota_fiscal TEXT;
