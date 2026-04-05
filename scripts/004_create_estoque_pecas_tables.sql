-- Create parts inventory table (Estoque de Peças - Entrada)
CREATE TABLE IF NOT EXISTS estoque_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  ordem_servico TEXT,
  numero_serie TEXT,
  nota_fiscal TEXT,
  data_emissao DATE,
  valor_unitario DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) DEFAULT 0,
  origem TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parts output table (Saída de Peças)
CREATE TABLE IF NOT EXISTS saida_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_saida DATE NOT NULL DEFAULT CURRENT_DATE,
  ordem_servico TEXT,
  area TEXT,
  compressor TEXT,
  utilizacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on codigo for faster lookups
CREATE INDEX IF NOT EXISTS idx_estoque_pecas_codigo ON estoque_pecas(codigo);
CREATE INDEX IF NOT EXISTS idx_saida_pecas_codigo ON saida_pecas(codigo);

-- Enable RLS
ALTER TABLE estoque_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE saida_pecas ENABLE ROW LEVEL SECURITY;

-- Create policies for estoque_pecas
CREATE POLICY "Allow public read access on estoque_pecas" ON estoque_pecas FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on estoque_pecas" ON estoque_pecas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on estoque_pecas" ON estoque_pecas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on estoque_pecas" ON estoque_pecas FOR DELETE USING (true);

-- Create policies for saida_pecas
CREATE POLICY "Allow public read access on saida_pecas" ON saida_pecas FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on saida_pecas" ON saida_pecas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on saida_pecas" ON saida_pecas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on saida_pecas" ON saida_pecas FOR DELETE USING (true);
