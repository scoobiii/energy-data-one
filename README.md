# Painel Nacional GD & GC — MEx Energia (MEx Foco)
### Plataforma Integrada de Auditoria Regulatória, Geração Distribuída (MMGD) e Centralizada (GC)

Este repositório contém a aplicação full-stack do **Painel Nacional GD & GC**, desenvolvida em **React 18 + Vite** no front-end e **Express + Node.js 22** no back-end. A persistência de dados é baseada estritamente no **driver SQLite3 nativo do Node.js (`node:sqlite` via `DatabaseSync`)**, garantindo persistência em disco local e execução real de comandos SQL arbitrários pelo console interativo.

---

## 🚀 Arquitetura de Dados & Fluxo de Integração

O ecossistema é alimentado por dados reais e estruturados do **ONS (Operador Nacional do Sistema)** e da **ANEEL (Agência Nacional de Energia Elétrica)**, permitindo uma análise técnica e regulatória real do setor de energia elétrica brasileiro.

```
+-------------------------------------------------------------+
|               Fontes de Dados Originais                    |
|       (ANEEL MMGD / SIGA Centralizada / ONS Síncrono)       |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 Sincronizador ONS/DESSEM                     |
|           (Pulls diários & Carga Horária Real)              |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      Back-End (server.ts)                   |
|     * Node.js 22 Native SQLite3 (DatabaseSync)              |
|     * Pipeline ETL de Processamento Regulatório             |
+------------------------------+------------------------------+
                               |
          +---------------------+---------------------+
          | (Dados Brutos)                            | (Dados Fato Tratados)
          v                                           v
+------------------------+                  +------------------------+
|   Tabela `mmgd_raw`    |                  |   Tabela `mmgd_fato`   |
|  (Landing Zone ANEEL)  |                  | (Taxonomia MEx Ativa)  |
+------------------------+                  +------------------------+
          |                                           |
          +---------------------+---------------------+
                               | (Agregação Automatizada por Triggers)
                               v
                    +------------------------+
                    |  Tabela `uf_stats`     |
                    | (Métricas Gerais / UF) |
                    +------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      Front-End (App.tsx)                    |
|    * Treemap Finviz-Style (100 Ativos Proporcionais)        |
|    * Simulador de Abundância e Transição Tarifária (14.300) |
|    * Terminal SQL Direto no SQLite                          |
|    * RAG Chatbot Integrado com Gemini 3.5 Flash            |
+-------------------------------------------------------------+
```

---

## 📖 GUIA DE USUÁRIO (Funcionalidades do Painel)

O painel é dividido em 5 abas principais, cada uma projetada para cobrir um aspecto crítico do ecossistema de geração e regulação. Abaixo está o guia prático de operação para cada funcionalidade:

### 1. Aba Principal: SIN GD + GC (Mapa Treemap Finviz-Style)
Esta aba centraliza a visualização proporcional da capacidade instalada nacional, misturando ativos centralizados (grandes hidrelétricas/térmicas do ONS) e distribuídos (Geração Distribuída ANEEL).
*   **Interação com o Treemap:** Cada bloco representa um ativo ou segmento energético. A área do bloco é proporcional à sua capacidade em Megawatts (MW).
*   **Controles de Tempo (st:):** Selecione os filtros `1H` (uma hora), `1D` (um dia) ou `1W` (uma semana) para visualizar a variabilidade de curto prazo da fonte ou região selecionada.
*   **Projeções de Longo Prazo:** Alterne entre `LIVE`, `MENSAL`, `ANUAL` e as visões especiais de abundância eletrointensiva `⚡ BR VISION 2030` e `⚡ BR VISION 2040`. Elas mostram graficamente o parque de geração requerido para fornecer um padrão de vida com 20.000 kWh per capita ao ano.
*   **Abertura de Ficha Técnica (Dossiê):** Dê um **duplo clique** em qualquer bloco para abrir um modal detalhado que exibe o enquadramento regulatório, faixa de potência MEx, histórico de crescimento e análise técnica do ativo.

### 2. Aba: ONS & DESSEM Operacional
Permite o acompanhamento operacional em tempo real e histórico das curvas de carga do Sistema Interligado Nacional (SIN) e do despacho físico do DESSEM.
*   **Timeframes de Curva:** Alterne entre `Diário` (resolução semi-horária), `Mensal` (carga diária média), `Anual` (média sazonal) e `Máximo` (série de recordes históricos do SIN).
*   **Consulta por Data (Restrição de 2018 a 2026):** Utilize o seletor de calendário para viajar no tempo. O painel ajusta dinamicamente as curvas de carga, fatores de penetração e despacho do DESSEM baseado na data selecionada. O sistema possui restrições físicas de validação, limitando as consultas estritamente entre `01/01/2018` e `31/12/2026`.
*   **Simulação de Instabilidade (Apagão de 15/08/2023):** Selecione a data `15/08/2023` na aba diária e use o interruptor para comparar a **Carga Regular** com o cenário de **Queda SIN**. O gráfico desenha o vale histórico de perda de carga do evento real de blackout ocorrido às 08:30 daquele dia.
*   **Balanço Energético Horário (DESSEM):** Veja a composição exata do despacho físico (Hídrica, Térmica, Eólica e Solar) que mantém a rede elétrica equilibrada a cada hora.

### 3. Aba: Simulador de ETL e SQL (Banco Físico SQLite3)
Dedicado a desenvolvedores e auditores de dados para interagir diretamente com a infraestrutura relacional nativa do backend.
*   **Integração de Sincronismo:** Os botões **"Sincronizar ANEEL (MMGD)"** e **"Sincronizar ONS (DESSEM)"** disparam o pipeline de ETL interno, puxando dados brutos, normalizando regras regulatórias e atualizando as tabelas fato.
*   **Console de Queries SQL:** Um editor de texto SQL real onde você pode redigir instruções `SELECT` padrão ANSI contra as tabelas do banco de dados `energy-data-br.sqlite`.
*   **Atalhos Rápidos:** Clique em qualquer atalho de consulta para carregar automaticamente modelos de consultas avançadas (como buscar outliers de potência ou segmentar por faixa de enquadramento da Lei 14.300). Clique em **"Executar Query SQL"** para ver os resultados retornados diretamente do driver físico.

### 4. Aba: Calculadora Lei 14.300
Uma ferramenta analítica de simulação tarifária para Geração Distribuída com base no marco regulatório da Lei nº 14.300/2022.
*   **Parâmetros de Entrada:** Configure a potência instalada do sistema em kW, o consumo mensal médio do cliente, a tarifa base da concessionária local e a taxa de simultaneidade do sistema (quanto da energia gerada é consumida na hora).
*   **Resultados de Enquadramento:** A calculadora define em qual faixa de compensação o consumidor se enquadra (`GD I` - Isenção até 2045, `GD II` - Cobrança gradativa do Fio B, ou `GD III` - Novas conexões acima de 500 kW com cobrança integral de encargos). Ela calcula o custo do Fio B estimado, o payback projetado em anos, e a economia anual limpa.

### 5. Aba: MEx Assistente AI
Um copiloto técnico e regulatório integrado diretamente com o modelo de inteligência artificial Gemini 3.5 Flash e munido de dados RAG específicos sobre regulação nacional de energia.
*   **Interações de Chat:** Faça perguntas complexas sobre compensação de créditos, regras de autoconsumo remoto, impactos do PLD horário no DESSEM e faturamento do Grupo B.
*   **Atalhos Regulatórios:** Utilize as perguntas rápidas pré-configuradas para obter de forma ágil explicações didáticas e precisas sobre os marcos legais mais complexos do setor brasileiro.

---

## 🔀 NAVEGAÇÃO ENTRE AS FONTES DE DADOS (ANEEL vs. ONS)

Uma das maiores complexidades do setor elétrico é compreender como a **Geração Distribuída (regulada pela ANEEL)** interage e impacta a **Geração Centralizada e a rede de transmissão (operada pelo ONS)**. O Painel MEx Energy foi estruturado especificamente para facilitar essa ponte analítica:

### Como fazer a correlação no painel:

```
+------------------------------------+             +------------------------------------+
|            FONTE: ANEEL            |             |             FONTE: ONS             |
|   (Geração Distribuída / MMGD)     |             |    (Geração Centralizada / SIN)    |
|   * Detalhado por Estado/Distrib.  |             |    * Curva de Carga Geral (MW)     |
|   * Focado em Consumidor (Fio B)   |             |    * Despacho Físico DESSEM        |
+-----------------+------------------+             +-----------------+------------------+
                  |                                                  |
                  +------------------------+-------------------------+
                                           |
                                           v
                             PONTE DE NAVEGAÇÃO NO PAINEL:
                     "A Curva do Pato" (Duck Curve) & Balanço Energético
```

1.  **Navegando da ANEEL para o ONS (Análise de Impacto Solar):**
    *   Acesse a aba **"SIN GD + GC"** e note a enorme barra de potência correspondente à **Solar MMGD** (Geração Distribuída Solar) em estados como Minas Gerais (MG), São Paulo (SP) e Bahia (BA). Esses dados vêm dos relatórios de MMGD da **ANEEL**.
    *   Para entender como essa geração distribuída oculta (que reduz a carga líquida vista pela rede de transmissão) afeta o sistema elétrico nacional, vá para a aba **"ONS & DESSEM Operacional"**.
    *   Na visualização **"Diária"**, avance os anos de `2018` até `2026`. Você observará o surgimento de uma barriga acentuada no centro do dia (entre 08h e 16h) na curva de carga programada e verificada. Este fenômeno é a **Curva do Pato (Duck Curve)**, provocado pela explosão de Geração Distribuída Solar (dados ANEEL) que injeta energia na rede local, reduzindo a demanda por geração centralizada (dados ONS) no horário de pico de sol.

2.  **Análise do Despacho Horário do DESSEM (ONS) em resposta à GD (ANEEL):**
    *   Ainda na aba **"ONS & DESSEM Operacional"**, role até o gráfico de **Balanço Energético DESSEM (Hourly Dispatch)**.
    *   Selecione o ano de `2018` (baixa penetração de GD ANEEL). O gráfico de despacho mostra a curva hídrica e térmica acompanhando linearmente a carga nacional ao longo do dia, com pouca necessidade de rampas rápidas de variação.
    *   Mude a data para o ano de `2026` (elevadíssima penetração de GD). Veja como a geração solar e eólica assume grande parte da carga central durante o dia. Quando o sol se põe (por volta das 17h/18h), a geração solar despenca rapidamente. O gráfico ilustra a necessidade dramática das hidrelétricas e térmicas (geridas pelo ONS) realizarem rampas de subida extremamente acentuadas para suprir o pico noturno.
    *   Isso comprova a correlação regulatória: o crescimento de contratos de GD sob regras da **ANEEL** (simulados na aba Calculadora e no Treemap) redefine as restrições operacionais e os custos de oportunidade de água do DESSEM calculados pelo **ONS**.

---

## 📂 FONTES OFICIAIS DOS DADOS

Para manter o compromisso de rejeição de dados estáticos sem embasamento regulatório, este painel utiliza dados com as seguintes origens oficiais:

1.  **ANEEL (Agência Nacional de Energia Elétrica):**
    *   **Geração Distribuída:** Dados consolidados do *Relatório de Geração Distribuída* (RGD) e do portal de Dados Abertos da ANEEL, especificando a capacidade instalada (kW), número de usinas e enquadramento regulatório.
    *   **Geração Centralizada:** Dados extraídos do *Sistema de Informações de Geração da ANEEL (SIGA)*, listando a capacidade operacional outorgada das usinas de grande porte do SIN.
    *   *Link Oficial:* [dadosabertos.aneel.gov.br](https://dadosabertos.aneel.gov.br/)

2.  **ONS (Operador Nacional do Sistema Elétrico):**
    *   **Curvas de Carga:** Dados históricos de Carga Programada e Verificada extraídos do *Histórico da Operação* e das bases diárias do ONS.
    *   **DESSEM (Modelo de Despacho Hidrotérmico de Curto Prazo):** Dados horários de programação da operação diária, contemplando o balanço energético nacional por bacia e fonte.
    *   *Link Oficial:* [dados.ons.org.br](https://dados.ons.org.br/)

3.  **CCEE (Câmara de Comercialização de Energia Elétrica):**
    *   **PLD Horário:** Preço de Liquidação de Diferenças horário associado indiretamente aos custos marginais de operação (CMO) simulados nas respostas técnicas do chatbot regulatório.
    *   *Link Oficial:* [ccee.org.br](https://www.ccee.org.br/)

---

## 📊 AUDITORIA DE CAMPOS E MAPEAMENTO DO BANCO DE DADOS

Esquemas físicos gerenciados no arquivo local `energy-data-br.sqlite`:

### 1. Tabela `mmgd_raw` (Landing Zone - ANEEL Bruto)
*   `id` (TEXT, PRIMARY KEY): Identificador único interno.
*   `nom_empreendimento` (TEXT): Nome da usina/projeto.
*   `cod_geracao_distribuida` (TEXT): Código de registro oficial ANEEL.
*   `nom_titular` (TEXT): Proprietário ou titular da Unidade Consumidora.
*   `num_cpf_cnpj` (TEXT): Documento de identificação parcial.
*   `sig_uf` (TEXT): Sigla do Estado.
*   `nom_municipio` (TEXT): Nome do município de instalação.
*   `potencia_instalada_kw` (REAL): Potência total instalada em kW.
*   `fonte_bruta` (TEXT): Classificação da fonte energética original.
*   `modalidade_bruta` (TEXT): Modalidade de compensação cadastrada na distribuidora.
*   `data_conexao` (TEXT): Data da conexão física com a rede pública.

### 2. Tabela `mmgd_fato` (Data Warehouse - MEx Transformado)
*   `id` (TEXT, PRIMARY KEY): Identificador referencial.
*   `nom_empreendimento` (TEXT): Nome do empreendimento higienizado.
*   `cod_geracao_distribuida` (TEXT): Código GD higienizado.
*   `nom_titular` (TEXT): Nome ou razão social tratada.
*   `sig_uf` (TEXT): Estado validado.
*   `nom_municipio` (TEXT): Município normalizado.
*   `potencia_kw` (REAL): Potência convertida e auditada.
*   `fonte_norm` (TEXT): Fonte padronizada (`UFV`, `EOL`, `CGH`, `UTE`, `OUTRA`).
*   `modalidade_norm` (TEXT): Modalidade regulatória limpa.
*   `faixa_regulatoria` (TEXT): Enquadramento tarifário (`GD I`, `GD II`, `GD III`).
*   `faixa_potencia_mex` (TEXT): Faixa de mercado MEx.
*   `is_outlier` (INTEGER): Flag binária de desvio padrão extremo.
*   `hash` (TEXT, UNIQUE): Hash criptográfico MD5/SHA de segurança para evitar duplicidades no pipeline.
*   `data_conexao` (TEXT): Data formatada ISO.

### 3. Tabela `uf_stats` (Agregações Regionais)
*   `uf` (TEXT, PRIMARY KEY): Sigla do Estado.
*   `uf_name` (TEXT): Nome completo correspondente.
*   `mmgd_count` (INTEGER): Quantidade de conexões GD cadastradas.
*   `mmgd_mw` (REAL): Potência somada em Megawatts (MW).
*   `siga_count` (INTEGER): Quantidade de Usinas Centralizadas (SIGA/ANEEL).
*   `siga_mw` (REAL): Potência de GC somada em MW.
*   `ufv_mw` / `eol_mw` / `cgh_mw` / `ute_mw` (REAL): Quebra de capacidade por fonte.

### 4. Tabela `ons_carga` (Curva de Carga do Sistema)
*   `hora` (TEXT, PRIMARY KEY): Horário da medição (HH:MM).
*   `verificada_mw` (INTEGER): Carga verificada real no SIN.
*   `programada_mw` (INTEGER): Carga programada teórica.

### 5. Tabela `dessem_balanco` (Balanço Energético Horário - Previsão DESSEM)
*   `hora` (INTEGER, PRIMARY KEY): Hora operacional (0 a 23).
*   `hidraulica_mw` / `termica_mw` / `eolica_mw` / `solar_mw` (INTEGER): Despacho realizado por fonte.
*   `carga_total_mw` (INTEGER): Somatório consumido.

---

## 🛠️ COMO EXECUTAR A APLICAÇÃO LOCALMENTE

### Pré-requisitos
*   **Node.js v22.11.0 ou superior** (essencial para suporte nativo a `node:sqlite`).

### Instalação e Execução
1.  Instale as dependências de todo o workspace:
    ```bash
    npm install
    ```
2.  Copie o arquivo de exemplo de variáveis de ambiente:
    ```bash
    cp .env.example .env
    ```
    *Adicione a sua `GEMINI_API_KEY` dentro do arquivo `.env` para habilitar o chatbot regulatório.*

3.  Inicie o servidor de desenvolvimento full-stack:
    ```bash
    npm run dev
    ```
    *O painel estará disponível em [http://localhost:3000](http://localhost:3000).*

4.  Para realizar o build de produção compilando o backend com esbuild:
    ```bash
    npm run build
    ```
5.  Inicie em modo produção:
    ```bash
    npm run start
    ```
