"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Palette, Settings, FileText } from "@/lib/lucide-react"

export default function PersonalizacaoPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Guia de Personalização</h1>
          <p className="text-muted-foreground mt-2">Aprenda a personalizar seu sistema de gestão de máquinas</p>
        </div>

        <Tabs defaultValue="cores" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cores">
              <Palette className="mr-2 h-4 w-4" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="dados">
              <FileText className="mr-2 h-4 w-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cores" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Como Alterar as Cores do Sistema</CardTitle>
                <CardDescription>
                  As cores são definidas no arquivo app/globals.css usando design tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Cores Principais</h3>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 rounded bg-background border-2" />
                        <div className="flex-1">
                          <p className="font-medium">Fundo (background)</p>
                          <code className="text-sm text-muted-foreground">--background: oklch(1 0 0)</code>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard("--background: oklch(1 0 0)")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 rounded bg-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Cor Primária (primary)</p>
                          <code className="text-sm text-muted-foreground">--primary: oklch(0.205 0 0)</code>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard("--primary: oklch(0.205 0 0)")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 rounded bg-destructive" />
                        <div className="flex-1">
                          <p className="font-medium">Cor de Alerta (destructive)</p>
                          <code className="text-sm text-muted-foreground">
                            --destructive: oklch(0.577 0.245 27.325)
                          </code>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard("--destructive: oklch(0.577 0.245 27.325)")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold">Como Usar:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>
                        Abra o arquivo <code className="bg-background px-2 py-1 rounded">app/globals.css</code>
                      </li>
                      <li>
                        Encontre a seção <code className="bg-background px-2 py-1 rounded">:root</code>
                      </li>
                      <li>Modifique os valores das variáveis CSS</li>
                      <li>
                        Use o formato OKLCH:{" "}
                        <code className="bg-background px-2 py-1 rounded">oklch(luminosidade saturação matiz)</code>
                      </li>
                      <li>Salve o arquivo - as mudanças aparecem automaticamente</li>
                    </ol>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">Dica: Gerador de Cores OKLCH</h4>
                    <p className="text-sm text-foreground">
                      Use ferramentas online como <code className="bg-white px-2 py-1 rounded">oklch.com</code> para
                      gerar cores no formato OKLCH facilmente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cores dos Gráficos</CardTitle>
                <CardDescription>Personalize as cores usadas nos gráficos de análise</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-12 h-12 rounded bg-chart-1" />
                      <div className="flex-1">
                        <p className="font-medium">Gráfico 1 (Laranja)</p>
                        <code className="text-sm text-muted-foreground">--chart-1: oklch(0.646 0.222 41.116)</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-12 h-12 rounded bg-chart-2" />
                      <div className="flex-1">
                        <p className="font-medium">Gráfico 2 (Azul)</p>
                        <code className="text-sm text-muted-foreground">--chart-2: oklch(0.6 0.118 184.704)</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-12 h-12 rounded bg-chart-3" />
                      <div className="flex-1">
                        <p className="font-medium">Gráfico 3 (Azul Escuro)</p>
                        <code className="text-sm text-muted-foreground">--chart-3: oklch(0.398 0.07 227.392)</code>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dados" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Como Editar Dados das Máquinas</CardTitle>
                <CardDescription>Gerencie suas máquinas através da interface ou editando o código</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Método 1: Através da Interface (Recomendado)</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          Vá para a aba <strong>Gerenciar</strong>
                        </li>
                        <li>
                          Clique em <strong>Adicionar Máquina</strong> para criar nova
                        </li>
                        <li>
                          Clique no ícone de <strong>lápis</strong> para editar existente
                        </li>
                        <li>
                          Clique no ícone de <strong>lixeira</strong> para excluir
                        </li>
                        <li>Use os filtros para encontrar máquinas específicas</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Método 2: Editando Dados Iniciais</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm mb-2">Para alterar os dados fictícios iniciais:</p>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          Abra o arquivo <code className="bg-background px-2 py-1 rounded">lib/machine-storage.ts</code>
                        </li>
                        <li>
                          Encontre a função{" "}
                          <code className="bg-background px-2 py-1 rounded">getDefaultMachines()</code>
                        </li>
                        <li>Modifique os dados das máquinas de exemplo</li>
                        <li>Salve o arquivo</li>
                        <li>Limpe o localStorage do navegador para ver as mudanças</li>
                      </ol>
                    </div>
                  </div>

                  <div className="bg-secondary border border-border p-4 rounded-lg">
                    <h4 className="font-semibold text-secondary-foreground mb-2">Importante: Backup de Dados</h4>
                    <p className="text-sm text-foreground">
                      Use o botão <strong>Exportar CSV</strong> regularmente para fazer backup dos seus dados. Os dados
                      são salvos no navegador e podem ser perdidos se você limpar o cache.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campos Disponíveis</CardTitle>
                <CardDescription>Todos os campos que você pode editar para cada máquina</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {[
                    { campo: "Nome", descricao: "Identificação da máquina (ex: CB-1024SA-01)" },
                    { campo: "Tipo", descricao: "Compressor, Soprador, Bomba, etc." },
                    { campo: "Status", descricao: "Operacional, Parada, Manutenção" },
                    { campo: "Localização", descricao: "Onde a máquina está instalada" },
                    { campo: "Data da Parada", descricao: "Quando a máquina parou (se aplicável)" },
                    { campo: "Motivo da Parada", descricao: "Razão pela qual está parada" },
                    { campo: "Ação Responsável", descricao: "Vale ou Atlas" },
                    { campo: "Status Preventiva", descricao: "OK, Em Planejamento, Em Atraso" },
                    { campo: "Descrição", descricao: "Detalhes adicionais sobre a máquina" },
                    { campo: "Tem Contrato", descricao: "Se a máquina está sob contrato" },
                  ].map((item) => (
                    <div key={item.campo} className="flex gap-4 p-3 border rounded-lg">
                      <div className="font-medium min-w-[140px]">{item.campo}</div>
                      <div className="text-sm text-muted-foreground">{item.descricao}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Avançadas</CardTitle>
                <CardDescription>Personalize outros aspectos do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Alterar Tipos de Máquinas</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm mb-2">Para adicionar ou remover tipos de máquinas:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>
                          Abra <code className="bg-background px-2 py-1 rounded">lib/types.ts</code>
                        </li>
                        <li>
                          Encontre o array <code className="bg-background px-2 py-1 rounded">MACHINE_TYPES</code>
                        </li>
                        <li>Adicione ou remova tipos conforme necessário</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Alterar Localizações</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm mb-2">Para personalizar as localizações disponíveis:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>
                          Abra <code className="bg-background px-2 py-1 rounded">lib/types.ts</code>
                        </li>
                        <li>
                          Encontre o array <code className="bg-background px-2 py-1 rounded">LOCATIONS</code>
                        </li>
                        <li>Modifique conforme suas necessidades</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Exportar e Importar Dados</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm mb-2">Gerencie seus dados em CSV:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>
                          <strong>Exportar:</strong> Clique em "Exportar CSV" para baixar todos os dados
                        </li>
                        <li>
                          <strong>Importar:</strong> Clique em "Importar CSV" para carregar dados de um arquivo
                        </li>
                        <li>
                          <strong>Edição em Lote:</strong> Edite o CSV no Excel e reimporte
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">Dica: Fluxo Semanal</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-foreground">
                      <li>Segunda-feira: Atualize status das máquinas</li>
                      <li>Salve um snapshot semanal (aba Histórico)</li>
                      <li>Exporte CSV como backup</li>
                      <li>Use aba Análises para gerar relatórios</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
