import json
from datetime import datetime
import re

# Ler o arquivo de dados
with open('user_read_only_context/text_attachments/pasted-text-2qFCp.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Parsear o cabeçalho
header = lines[0].strip().split('\t')

# Encontrar índices das colunas de datas
date_columns = []
date_indices = []
for i, col in enumerate(header):
    # Verificar se é uma data no formato DD/MM/YYYY
    if re.match(r'\d{2}/\d{2}/\d{4}', col):
        date_columns.append(col)
        date_indices.append(i)

print(f"Encontradas {len(date_columns)} colunas de datas")
print(f"Datas: {date_columns}")

# Função para converter data DD/MM/YYYY para formato de semana ISO (YYYY-Www)
def date_to_week_format(date_str):
    # Corrigir erro de digitação "05/08/20252" -> "05/08/2025"
    date_str = date_str.replace('20252', '2025')
    
    try:
        date_obj = datetime.strptime(date_str, '%d/%m/%Y')
        # Obter número da semana ISO
        iso_calendar = date_obj.isocalendar()
        year = iso_calendar[0]
        week = iso_calendar[1]
        return f"{year}-W{week:02d}"
    except Exception as e:
        print(f"Erro ao converter data {date_str}: {e}")
        return None

# Criar dicionário de snapshots por semana
snapshots_by_week = {}

# Processar cada linha de dados
for line_num, line in enumerate(lines[1:], start=2):
    parts = line.strip().split('\t')
    
    if len(parts) < len(header):
        print(f"Linha {line_num} tem menos colunas que o esperado, pulando...")
        continue
    
    # Extrair dados da máquina
    tag = parts[0] if len(parts) > 0 else ""
    numero_serie = parts[1] if len(parts) > 1 else ""
    contrato = parts[2] if len(parts) > 2 else ""
    
    # Extrair manutenções preventivas e data de parada
    manutencoes_idx = len(date_indices) + 3
    data_parada_idx = manutencoes_idx + 1
    
    manutencoes = parts[manutencoes_idx] if len(parts) > manutencoes_idx else "OK"
    data_parada = parts[data_parada_idx] if len(parts) > data_parada_idx else ""
    
    # Processar cada semana
    for date_str, date_idx in zip(date_columns, date_indices):
        week_format = date_to_week_format(date_str)
        if not week_format:
            continue
        
        # Obter status da máquina nesta semana
        status_str = parts[date_idx] if len(parts) > date_idx else "Operacional"
        
        # Converter status para formato do sistema
        if "Parada" in status_str:
            status = "parada"
        elif "Manutenção" in status_str or "Manutencao" in status_str:
            status = "manutencao"
        else:
            status = "operacional"
        
        # Criar snapshot se não existir
        if week_format not in snapshots_by_week:
            snapshots_by_week[week_format] = {
                "week": week_format,
                "date": date_str,
                "machines": []
            }
        
        # Adicionar máquina ao snapshot
        machine = {
            "id": numero_serie or f"machine-{line_num}",
            "tag": tag,
            "numeroSerie": numero_serie,
            "modelo": "N/A",  # Não disponível nos dados
            "tipo": "Compressor",  # Inferir do TAG ou usar padrão
            "localizacao": "N/A",  # Não disponível nos dados
            "status": status,
            "contrato": contrato == "SIM",
            "acaoResponsavel": "Vale",  # Padrão
            "horasOperacao": 0,
            "ultimaManutencao": "",
            "proximaManutencao": "",
            "observacoes": f"Manutenções: {manutencoes}" + (f" | Parada em: {data_parada}" if data_parada else "")
        }
        
        snapshots_by_week[week_format]["machines"].append(machine)

# Converter para lista e ordenar por semana
snapshots_list = list(snapshots_by_week.values())
snapshots_list.sort(key=lambda x: x["week"])

# Calcular estatísticas para cada snapshot
for snapshot in snapshots_list:
    total = len(snapshot["machines"])
    operacionais = sum(1 for m in snapshot["machines"] if m["status"] == "operacional")
    paradas = sum(1 for m in snapshot["machines"] if m["status"] == "parada")
    manutencao = sum(1 for m in snapshot["machines"] if m["status"] == "manutencao")
    
    snapshot["stats"] = {
        "total": total,
        "operacionais": operacionais,
        "paradas": paradas,
        "manutencao": manutencao,
        "disponibilidade": round((operacionais / total * 100) if total > 0 else 0, 1)
    }

# Salvar em arquivo JSON
output = {
    "snapshots": snapshots_list,
    "totalSnapshots": len(snapshots_list),
    "dateRange": {
        "start": snapshots_list[0]["date"] if snapshots_list else "",
        "end": snapshots_list[-1]["date"] if snapshots_list else ""
    }
}

with open('historical-data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\n✅ Processamento concluído!")
print(f"Total de snapshots criados: {len(snapshots_list)}")
print(f"Período: {output['dateRange']['start']} até {output['dateRange']['end']}")
print(f"\nResumo dos snapshots:")
for snapshot in snapshots_list:
    stats = snapshot["stats"]
    print(f"  {snapshot['week']} ({snapshot['date']}): {stats['operacionais']} operacionais, {stats['paradas']} paradas, {stats['manutencao']} manutenção - {stats['disponibilidade']}% disponibilidade")
