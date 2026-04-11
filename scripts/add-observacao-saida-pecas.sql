-- Add observacao column to saida_pecas table
ALTER TABLE saida_pecas ADD COLUMN IF NOT EXISTS observacao text;
