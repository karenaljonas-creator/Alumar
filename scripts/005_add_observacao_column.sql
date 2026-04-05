-- Add observacao column to estoque_pecas table
ALTER TABLE estoque_pecas ADD COLUMN IF NOT EXISTS observacao TEXT;
