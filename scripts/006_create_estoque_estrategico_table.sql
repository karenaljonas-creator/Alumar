-- Criar tabela de estoque estratégico (quantidades mínimas)
CREATE TABLE IF NOT EXISTS estoque_estrategico (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL,
  equipamento TEXT,
  descricao TEXT NOT NULL,
  quantidade_minima INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_estoque_estrategico_codigo ON estoque_estrategico(codigo);

-- Índice para busca por equipamento
CREATE INDEX IF NOT EXISTS idx_estoque_estrategico_equipamento ON estoque_estrategico(equipamento);

-- Habilitar RLS
ALTER TABLE estoque_estrategico ENABLE ROW LEVEL SECURITY;

-- Política de acesso público para leitura e escrita
CREATE POLICY "Allow all access to estoque_estrategico" ON estoque_estrategico
  FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados iniciais do estoque estratégico
INSERT INTO estoque_estrategico (codigo, equipamento, descricao, quantidade_minima) VALUES
-- GA 110
('1028746136', 'GA 110', 'Motor ventilador', 1),
('1089057412', 'GA 110', 'Sensor de temperatura', 3),
('1089062111', 'GA 110', 'valvula solenoide', 1),
('1089962501', 'GA 110', 'trasdutor DP 0 a 3bar', 1),
('1089962533', 'GA 110', 'Transdutor de pressão 0 a 10 bar', 2),
('1089962536', 'GA 110', 'Transdutor de pressão -1 a 17 bar', 2),
('1614873800', 'GA 110', 'elemento acoplamento', 1),
('1614928700', 'GA 110', 'Hélice', 2),
('2906056300', 'GA 110', 'Kit reparos admissão', 1),
('2906056400', 'GA 110', 'kit separador', 1),
('1630040699', 'GA 110', 'Filtro de Ar', 1),
('1613610590', 'GA 110', 'Filtro de Óleo', 3),
-- GA 160 VSD
('2906056500', 'GA 160 VSD', 'Kit filtro separador', 1),
('2906095800', 'GA 160 VSD', 'Kit válvula de admissão', 1),
('1630040899', 'GA 160 VSD', 'Filtro de Ar', 1),
('1621737800', 'GA 160 VSD', 'Filtro de Óleo', 1),
-- GA 160+
('1622369480', 'GA 160+', 'Blowoff', 1),
('2906095500', 'GA 160+', 'Elemento separador', 1),
('2906096300', 'GA 160+', 'kit valvula desvio', 1),
('2906097500', 'GA 160+', 'Kit vedações vitaulicas', 1),
-- GA 315 VSD
('574800145', 'GA 315 VSD', 'Mangueira', 1),
('574800269', 'GA 315 VSD', 'Mangueira', 1),
('574823542', 'GA 315 VSD', 'Mangueira resfriador', 2),
('574987115', 'GA 315 VSD', 'Mangueira DP', 1),
('575036118', 'GA 315 VSD', 'Mangueira recirculação', 1),
('634100040', 'GA 315 VSD', 'Junta vitaulica óleo - 3"', 1),
('634100056', 'GA 315 VSD', 'Junta vitaulica ar', 2),
('634100184', 'GA 315 VSD', 'Junta vitaulica óleo - 5"', 1),
('1089057123', 'GA 315 VSD', 'Ventilador cubículo', 1),
('1623663151', 'GA 315 VSD', 'Motor ventilador', 2),
('1623739400', 'GA 315 VSD', 'Mangueira', 1),
('1623836700', 'GA 315 VSD', 'Mangueira', 1),
('1623836900', 'GA 315 VSD', 'Mangueira', 1),
('1623936300', 'GA 315 VSD', 'Mangueira', 1),
('1635256100', 'GA 315 VSD', 'Mangote de admissão', 1),
('1900520033', 'GA 315 VSD', 'Módulo de expansão', 1),
('3001531111', 'GA 315 VSD', 'Filtro de Ar/óleo', 1),
('3001531109', 'GA 315 VSD', 'Kit Separador de Ar/Óleo', 1),
-- GA 45/55
('1028843060', 'GA 45/55', 'Mangueira de recirculação', 1),
('1028843061', 'GA 45/55', 'Mangueira de injeção de óleo <75', 1),
('1028843062', 'GA 45/55', 'Mangueira de injeção de óleo GA 75', 1),
('1028843063', 'GA 45/55', 'Mangueira do pescador', 1),
('1028843065', 'GA 45/55', 'Mangueira de entrada resfriador de óleo < 75', 1),
('1028843066', 'GA 45/55', 'Mangueira de saída resfriador de óleo GA 75', 1),
('2028843067', 'GA 45/55', 'Mangueira de descarga do elemento', 1),
('1028843068', 'GA 45/55', 'Mangueira de saída de ar do reservatório', 1),
('1622312901', 'GA 45/55', 'Mangote de admissão', 1),
('1630058905', 'GA 45/55', 'Filtro de Ar', 1),
('1630840180', 'GA 45/55', 'Filtro de Óleo', 1),
('2901162600', 'GA 45/55', 'Elemento separador', 1),
('1623181080', 'GA 45/55', 'Blowoff', 1),
('1089070214', 'GA 45/55', 'Solenoide', 1),
-- GA 90
('1028834380', 'GA 90', 'Mangueira de equalização do reservatório', 1),
('1028834381', 'GA 90', 'Mangueira do pescador', 1),
('1028834383', 'GA 90', 'Mangueira de entrada do resfriador', 1),
('1028834385', 'GA 90', 'Mangueira de injeção', 1),
('1028834386', 'GA 90', 'Mangueira de recirculação', 1),
('1028834447', 'GA 90', 'Mangueira de descarga do elemento', 1),
('1028834449', 'GA 90', 'Mangueira de saída de ar do reservatório', 1),
('1089070210', 'GA 90', 'Solenoide 110V', 1),
('1622089400', 'GA 90', 'Mangote de admissão', 1),
('1622365900', 'GA 90', 'Indicador de nível de óleo', 1),
-- GA-160
('1622365900', 'GA160', 'INDICADOR DE NIVEL DE OLEO', 2),
('1089062111', 'GA-160', 'valvula solenoide', 2),
('1622369401', 'GA-160', 'carcaça', 2),
('1622369401', 'GA-160', 'TAMPA', 2),
('1622369402', 'GA-160', 'pistão', 2),
('1028869902', 'GA-160', 'Rele axiliar', 2),
('1028664726', 'GA-160', 'Rele eletronico', 2),
-- TODOS
('1614812601', 'TODOS', 'Cabos Temperatura', 3),
('1614879100', 'TODOS', 'Cabos Pressão', 3),
('1837031035', 'Todos', 'KIT RETROFIT MK5 QUE ATENDA TODAS AS MAQUINAS', 1),
('1837031042', 'TODOS', 'KIT RETROFIT MK5 QUE ATENDA TODAS AS MAQUINAS', 1),
-- ZR 630
('335212000', 'ZR 630', 'Anel elástico', 1),
('1089057440', 'ZR 630', 'Sensor de temperatura', 3),
('1089057526', 'ZR 630', 'Sensor de pressão -1 a 5 bar', 2),
('1089057533', 'ZR 630', 'Sensor de pressão -172 a 172', 2),
('1089057544', 'ZR 630', 'Sensor de pressão 0 a 3 bar', 2),
('1089057545', 'ZR 630', 'Sensor de pressão - 1 a 17 bar', 2),
('1089059021', 'ZR 630', 'Valvula solenoide', 1),
('1202518000', 'ZR 630', 'Mola bypass', 1),
('1619646708', 'ZR 630', 'Elemento acoplamento', 1),
('1621348300', 'ZR 630', 'Tubo retorno alta', 1),
('1621609900', 'ZR 630', 'pistão bypass', 1),
('1621610100', 'ZR 630', 'Válvula bypass', 1),
('1621633400', 'ZR 630', 'Tubo retorno Baixa', 1),
('1621636605', 'ZR 630', 'Tampão bypass de óleo', 1),
('2906038000', 'ZR 630', 'kit dreno resfriador posterior', 1),
('2906044400', 'ZR 630', 'Kit reparos válvula de admissão', 1),
('2906054000', 'ZR 630', 'Kit retenção de ar', 1),
('2906062100', 'ZR 630', 'Kit drenos resfriador int', 1),
('1630040799', 'ZR 630', 'Filtro de Ar', 3),
('1614874799', 'ZR 630', 'Filtro de Óleo', 2),
-- ZR/T
('2908850101', 'ZR/T', 'Óleo Roto Z', 6),
('1028869902', 'ZR/T', 'INDICADOR DE NIVEL DE OLEO', 2),
-- ZR-630
('O663210658', 'ZR-630', 'Anel elástico', 1),
('O663210697', 'ZR-630', 'Anel elástico', 1),
('O663210698', 'ZR-630', 'Anel elástico', 1),
('O663210620', 'ZR-630', 'Anel elástico', 2),
('O663210849', 'ZR-630', 'Anel elástico', 1),
('O663210695', 'ZR-630', 'Anel elástico', 1),
('O663210808', 'ZR-630', 'Anel elástico', 1),
('1089057449', 'ZR-630', 'Anel elástico', 1),
-- ZT 275
('1089962516', 'ZT 275', 'Transdutor de pressão -1 a 17 bar', 1),
('1089962518', 'ZT 275', 'Transdutor d epressão -172 a 172', 2),
('1089962535', 'ZT 275', 'Transdutor de pressão -1 a 3 5 bar', 2),
('1623249500', 'ZT 275', 'Blowndown', 1),
('2906039000', 'ZT 275', 'Kit válvula de retenção de ar', 1),
('2906051000', 'ZT 275', 'kit válvula de admissão', 1),
('1621138999', 'ZT 275', 'Filtro de Ar', 3),
-- GA
('2901170100', 'GA', 'Óleo roto xtend', 4),
('1621631302', 'GA 315 VSD', 'Acoplamento', 3)
ON CONFLICT DO NOTHING;
