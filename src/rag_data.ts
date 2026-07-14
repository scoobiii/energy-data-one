/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RAG Knowledge Base and Fine-tuning Q&A Dataset for MEx Energy Agent
 */

export interface RagQAPair {
  instruction: string;
  response: string;
  category: 'arquitetura' | 'regulatorio' | 'mex_estrategia' | 'automacao';
}

export const mexProjectKnowledgeBase: RagQAPair[] = [
  {
    category: 'arquitetura',
    instruction: "Qual é o tamanho do banco de dados e onde ele está armazenado?",
    response: "O banco de dados do projeto MEx Energy Data BR está armazenado 100% em memória RAM (Memory Heap) no container do Node.js, como um emulador SQLite em variáveis voláteis. Portanto, consome 0 bytes de armazenamento em disco rígido físico do container. O tamanho estimado do banco em memória para o seed inicial é de aproximadamente 30 KB."
  },
  {
    category: 'arquitetura',
    instruction: "Qual é o tamanho do legado de dados e onde está guardado?",
    response: "O legado de dados do projeto representa mais de 25k registros históricos consolidados agregados por Unidade Federativa (UF). Eles estão embutidos no código-fonte em arrays estáticos (em src/data.ts) e carregados na memória do servidor Express. O arquivo correspondente em disco consome cerca de 12 KB, resultando em virtualmente 0 bytes de consumo de disco operacional."
  },
  {
    category: 'arquitetura',
    instruction: "Quanto a aplicação consome de memória RAM?",
    response: "A aplicação MEx Energy Data BR consome em média entre 80 MB e 120 MB de memória RAM (RSS) sob carga no container do Node.js. O banco de dados emulado em memória consome menos de 1 MB, sendo que o maior consumo é decorrente do próprio runtime do Node.js e do servidor de desenvolvimento Vite."
  },
  {
    category: 'arquitetura',
    instruction: "Por que o banco de dados SQLite é simulado e não um SQLite real em disco?",
    response: "O banco de dados é simulado em memória usando estruturas de dados TypeScript para garantir compatibilidade com o ambiente serveless e containerizado volátil do Cloud Run (onde sistemas de arquivos são temporários e redefinidos a cada reinicialização). Além disso, a simulação em memória oferece tempo de resposta ultrarrápido (<1ms) e elimina problemas de concorrência de escrita, mantendo um console SQL completo via parser regex no servidor."
  },
  {
    category: 'arquitetura',
    instruction: "Quais conectores com APIs externas estão sendo usados no projeto?",
    response: "O projeto possui um único conector ativo com API externa: a API do Google Gemini, integrada através do SDK oficial '@google/genai' no backend Express (/api/gemini/chat). Os dados de carga do ONS e usinas da ANEEL MMGD utilizam conectores de simulação de feeds locais em src/data.ts, mas estão estruturados para mapear os endpoints do portal de Dados Abertos brasileiros."
  },
  {
    category: 'regulatorio',
    instruction: "Como funciona a transição tarifária (Fio B) da Lei 14.300/2022 no ano atual?",
    response: "Pelas regras de transição da Lei 14.300/2022 para novos projetos conectados (GD2), a cobrança do componente tarifário TUSD Fio B ocorre de forma escalonada. No ano de 2026 (ano atual do projeto), o percentual de cobrança é de 60% do Fio B. A taxa evolui para 75% em 2027, 90% em 2028 e chega a 100% em 2029."
  },
  {
    category: 'regulatorio',
    instruction: "O que acontece com projetos de minigeração acima de 500 kW com autoconsumo remoto?",
    response: "De acordo com o Artigo 26 da Lei 14.300/2022, os projetos de minigeração acima de 500 kW enquadrados na modalidade Autoconsumo Remoto sofrem regras de transição mais rígidas. Eles não possuem o escalonamento gradual e devem pagar imediatamente 100% da TUSD Fio B, 40% da TUSD Fio A, além de encargos de Pesquisa e Desenvolvimento (P&D) e TFSEE."
  },
  {
    category: 'regulatorio',
    instruction: "Qual é o limite de potência para classificação de Microgeração e Minigeração?",
    response: "De acordo com a Lei 14.300/2022: Microgeração é o projeto com potência instalada menor ou igual a 75 kW. Minigeração compreende projetos com potência maior que 75 kW e menor ou igual a 3 MW para fontes hídricas (CGH), ou menor ou igual a 5 MW para as demais fontes renováveis (como Solar UFV e Eólica EOL)."
  },
  {
    category: 'mex_estrategia',
    instruction: "Quais são as faixas estratégia de interesse para BESS e Barramento 800VDC da MEx?",
    response: "As faixas de interesse MEx Energia são: \n1. Residencial (<= 15 kW): Baixa viabilidade para BESS comercial. Payback longo (~8.5 anos).\n2. Comercial Pequeno (15-75 kW): GD tradicional. Payback médio (~5.8 anos).\n3. Minigeração Alvo (75-1000 kW): Viabilidade moderada/alta para BESS modular MEx.\n4. Industrial Alvo (1000-5000 kW): Foco MEx prioritário! Altamente viável para barramento nativo 800VDC + BESS de alta potência. Payback curto (~4.2 anos)."
  },
  {
    category: 'automacao',
    instruction: "Como é feita a automação da atualização horária e quem executa?",
    response: "A automação de atualização horária e sincronização no ecossistema da MEx é gerenciada pelo Google Cloud Scheduler. Ele executa requisições HTTP POST programadas (via expressões cron como '0 * * * *') que disparam o endpoint público '/api/energy/sync' no Cloud Run. O servidor processa a ingestão, executa o ETL canônico com checksum SHA-256 e atualiza os agregados em tempo real."
  },
  {
    category: 'automacao',
    instruction: "A sincronização de horário do projeto e dos dispositivos (como A23) com o Brasil é automatizada?",
    response: "Sim. Tanto o servidor do projeto quanto os dispositivos clientes (como o celular A23) utilizam sincronização automática de relógio via protocolo NTP (Network Time Protocol) apontados para servidores NTP do Brasil (a.ntp.br). O backend do projeto calcula datas e transações baseando-se estritamente no fuso horário local 'America/Sao_Paulo' (UTC-3), garantindo divergência zero (delta = 0 ms)."
  }
];

/**
 * Quick local keyword search to simulate a local client-side RAG engine
 */
export function searchLocalKnowledgeBase(query: string): string {
  const normalizedQuery = query.toLowerCase();
  
  // Basic scoring based on word match
  let bestMatch: RagQAPair | null = null;
  let highestScore = 0;
  
  for (const qa of mexProjectKnowledgeBase) {
    let score = 0;
    const words = normalizedQuery.split(/\s+/);
    for (const word of words) {
      if (word.length > 2) {
        if (qa.instruction.toLowerCase().includes(word)) score += 3;
        if (qa.response.toLowerCase().includes(word)) score += 1;
      }
    }
    
    // Exact category matches boost score
    if (normalizedQuery.includes(qa.category)) score += 5;
    if (normalizedQuery.includes('fio b') && qa.instruction.toLowerCase().includes('fio b')) score += 5;
    if (normalizedQuery.includes('sqlite') && qa.instruction.toLowerCase().includes('sqlite')) score += 5;
    if (normalizedQuery.includes('banco') && qa.instruction.toLowerCase().includes('banco')) score += 5;
    if (normalizedQuery.includes('ram') && qa.instruction.toLowerCase().includes('ram')) score += 5;
    if (normalizedQuery.includes('memoria') && qa.instruction.toLowerCase().includes('ram')) score += 5;
    if (normalizedQuery.includes('cron') && qa.instruction.toLowerCase().includes('cron')) score += 5;
    if (normalizedQuery.includes('automacao') && qa.instruction.toLowerCase().includes('automacao')) score += 5;
    if (normalizedQuery.includes('500') && qa.instruction.toLowerCase().includes('500')) score += 5;
    if (normalizedQuery.includes('a23') && qa.instruction.toLowerCase().includes('a23')) score += 5;
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = qa;
    }
  }
  
  if (bestMatch && highestScore > 2) {
    return `[Local RAG Offline Fallback Actived] 
Pergunta associada identificada: "${bestMatch.instruction}"

Resposta: ${bestMatch.response}`;
  }
  
  return `[Local RAG Offline Fallback Actived]
Não foi possível encontrar uma resposta exata no banco de conhecimento local MEx com pontuação suficiente.

Tente perguntar algo relacionado a:
- Tamanho ou local do banco de dados e do legado de dados.
- Consumo de memória RAM da aplicação.
- Por que o SQLite é simulado.
- Conectores de APIs externas e o SDK @google/genai.
- Regras de transição do Fio B (Lei 14.300) ou minigeração > 500 kW.
- Automação cron das atualizações horárias do ONS.
- Sincronização do relógio com o fuso horário brasileiro (A23 / Brasília).`;
}
