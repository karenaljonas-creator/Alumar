"""
Script para restaurar os números de série corretos das máquinas no banco de dados.
Lê os dados fornecidos pelo usuário e gera comandos SQL para atualizar o campo numeroSerie
no JSON observacoes de cada máquina, usando o modelo (TAG) como identificador.
"""

# Dados fornecidos pelo usuário com os números de série corretos
maquinas_corretas = [
    {"tag": "CB-2316SA-07", "numero_serie": "APFS90967404"},
    {"tag": "CB-2020-26", "numero_serie": "BQD106934"},
    {"tag": "CB-2020-04", "numero_serie": "BRP075254"},
    {"tag": "CB-2020-24", "numero_serie": "BQD107036"},
    {"tag": "CB-2020-25", "numero_serie": "BQD107037"},
    {"tag": "CB-2020SA-31", "numero_serie": "BQD119297"},
    {"tag": "CB-5013-12", "numero_serie": "BRP081503"},
    {"tag": "CB-5008-11", "numero_serie": "BRP080378"},
    {"tag": "CB-2020-03", "numero_serie": "BRP075253"},
    {"tag": "CB-5013-03", "numero_serie": "BRP072166"},
    {"tag": "CB-1024SA-01", "numero_serie": "BRP071422"},
    {"tag": "CB-5008-02", "numero_serie": "BRP071324"},
    {"tag": "CB-1024SA-02", "numero_serie": "BRP071423"},
    {"tag": "CB-5201SA-01", "numero_serie": "BQD119293"},
    {"tag": "CB-5201SA-02", "numero_serie": "BQD119294"},
    {"tag": "CB-2104SA-01", "numero_serie": "BQD119295"},
    {"tag": "CB-2104SA-02", "numero_serie": "BQD119296"},
    {"tag": "CB-2316SA-02", "numero_serie": "BQD119323"},
    {"tag": "CB-2020-01", "numero_serie": "BRP075251"},
    {"tag": "CB-2020-02", "numero_serie": "BRP075252"},
    {"tag": "CB-2020-21", "numero_serie": "BQD117168"},
    {"tag": "CB-2020SA-32", "numero_serie": "BQD119298"},
    {"tag": "CB-5008-01", "numero_serie": "BRP071323"},
    {"tag": "CB-5008-03", "numero_serie": "BRP071325"},
    {"tag": "CB-5008-12", "numero_serie": "BQD109691"},
    {"tag": "CB-5013-01", "numero_serie": "BRP071936"},
    {"tag": "CB-2316SA-08", "numero_serie": "APFS90967405"},
    {"tag": "CB-5013-02", "numero_serie": "BRP071937"},
    {"tag": "CB-5013-04", "numero_serie": "BRP071935"},
    {"tag": "CB-5013-11", "numero_serie": "BRP081504"},
    {"tag": "CB-5013-13", "numero_serie": "BRP081505"},
    {"tag": "CB-2316SA-01", "numero_serie": "BQD119324"},
    {"tag": "CB-2316SA-03", "numero_serie": "BQD119325"},
    {"tag": "CB-2316SA-04", "numero_serie": "S90967401"},
    {"tag": "CB-2316SA-05", "numero_serie": "S90967402"},
    {"tag": "CB-2316SA-06", "numero_serie": "S90967403"},
    {"tag": "CB-2316SA-09", "numero_serie": "S90967406"},
    {"tag": "CB-6044SA-01", "numero_serie": "BQR131279"},
    {"tag": "CP-1023SA-01", "numero_serie": "BQR131278"},
    {"tag": "CB-1023SA-02", "numero_serie": "BRP071425"},
    {"tag": "SC-2020-02", "numero_serie": "NSE081488"},  # Primeiro SC-2020-02
    {"tag": "SC-2020-03", "numero_serie": "NSE081487"},  # Primeiro SC-2020-03
    {"tag": "SC-2020-06", "numero_serie": "NSE081507"},  # Primeiro SC-2020-06
    {"tag": "FL-5008-14", "numero_serie": "NSE081505"},
    {"tag": "SC-5008-15", "numero_serie": "NSE081508"},
    {"tag": "FL-5008-17", "numero_serie": "NSE081506"},
    {"tag": "FL-5008-20", "numero_serie": "NSE081485"},
    {"tag": "SC-5008-04", "numero_serie": "NSE081486"},  # Primeiro SC-5008-04
    {"tag": "SC-5008-05", "numero_serie": "NSE081509"},  # Primeiro SC-5008-05
    {"tag": "SC-2104SA-01", "numero_serie": "ITJ294894"},
    {"tag": "SC-2104SA-02", "numero_serie": "ITJ294895"},
    {"tag": "SC-2316SA-01", "numero_serie": "ITJ290643"},
    {"tag": "SC-2316SA-02", "numero_serie": "ITJ290644"},
    {"tag": "BO-5015SA-02", "numero_serie": "ITJ2889751"},
    {"tag": "BO-5015SA-01", "numero_serie": "ITJ289551"},
]

print("[v0] Gerando comandos SQL para restaurar números de série...")
print(f"[v0] Total de máquinas a atualizar: {len(maquinas_corretas)}")

# Gerar comandos SQL
sql_commands = []
for maquina in maquinas_corretas:
    tag = maquina["tag"]
    numero_serie = maquina["numero_serie"]
    
    # Usar o modelo (TAG) para identificar a máquina
    sql = f"""UPDATE machines 
SET observacoes = jsonb_set(COALESCE(observacoes::jsonb, '{{}}'::jsonb), '{{numeroSerie}}', '"{numero_serie}"')::text,
    updated_at = NOW()
WHERE modelo = '{tag}';"""
    
    sql_commands.append(sql)

# Imprimir todos os comandos
print("\n[v0] Comandos SQL gerados:\n")
print("\n".join(sql_commands))

print(f"\n[v0] Total de comandos gerados: {len(sql_commands)}")
print("[v0] Execute esses comandos no banco de dados para restaurar os números de série corretos.")
