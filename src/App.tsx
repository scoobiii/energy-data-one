/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
  Database, 
  Calculator, 
  MessageSquare, 
  TrendingUp, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Send, 
  Play, 
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  BarChart3,
  ListFilter,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Copy,
  X,
  Download,
  Check,
  AlertTriangle,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  Cell, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie,
  Treemap
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { mexProjectKnowledgeBase, searchLocalKnowledgeBase } from './rag_data';

// Define structures matching server schema
interface StateEnergyStats {
  uf: string;
  uf_name: string;
  mmgd_count: number;
  mmgd_mw: number;
  siga_count: number;
  siga_mw: number;
  ufv_mw: number;
  eol_mw: number;
  cgh_mw: number;
  ute_mw: number;
}

interface RawMMGDRecord {
  id?: string;
  nom_empreendimento: string;
  cod_geracao_distribuida: string;
  nom_titular: string;
  num_cpf_cnpj: string;
  sig_uf: string;
  nom_municipio: string;
  potencia_instalada_kw: number;
  fonte_bruta: string;
  modalidade_bruta: string;
  data_conexao: string;
}

interface FatoMMGDRecord {
  id: string;
  nom_empreendimento: string;
  cod_geracao_distribuida: string;
  nom_titular: string;
  sig_uf: string;
  nom_municipio: string;
  potencia_kw: number;
  fonte_norm: 'UFV' | 'EOL' | 'CGH' | 'UTE' | 'OUTRA';
  modalidade_norm: string;
  faixa_regulatoria: string;
  faixa_potencia_mex: string;
  is_outlier: number;
  hash: string;
  data_conexao: string;
}

interface DBStats {
  mmgd_count: number;
  mmgd_mw: number;
  siga_count: number;
  siga_mw: number;
  database_engine: string;
  total_tables: number;
}

// Custom styled Content renderer for the proportional load Treemap (ONS + MMGD) - styled exactly like Finviz.com/map (dense flat grid, performance based color, tickers)
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, ticker, size, change, fullName } = props;
  
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') return null;
  if (width < 32 || height < 16) return null;

  // Finviz-accurate color scale based on % change (Vibrant green/red/dark shades)
  const getFinvizColor = (val: number) => {
    if (val >= 5) return '#00a334';        // Strong growth (Vibrant Green)
    if (val >= 2) return '#006c21';        // Moderate growth (Medium-High Green)
    if (val > 0) return '#004213';         // Light growth (Dark Green)
    if (val === 0) return '#171e2e';       // Neutral/Flat (Dark Slate)
    if (val >= -2) return '#4f0a0a';       // Light decay (Dark Red)
    if (val >= -5) return '#820b0b';       // Moderate decay (Medium-High Red)
    return '#ba0707';                      // Strong decay (Vibrant Red)
  };

  const bgColor = typeof change === 'number' ? getFinvizColor(change) : '#1e293b';
  const displayChange = typeof change === 'number' ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '0.00%';
  const safeSize = typeof size === 'number' ? size : 0;
  const formattedSize = safeSize >= 1000 ? `${(safeSize / 1000).toFixed(1)} GW` : `${safeSize.toLocaleString('pt-BR')} MW`;
  const displayTicker = ticker || (name ? name.split(' ')[0].toUpperCase() : 'GD');

  const itemOnDoubleClick = props.onDoubleClickItem || (props.payload && props.payload.onDoubleClickItem);

  return (
    <g 
      className="group select-none"
      onDoubleClick={() => {
        if (itemOnDoubleClick) {
          itemOnDoubleClick(props);
        }
      }}
    >
      <title>{`Ativo: ${fullName || name || ticker}\nCapacidade: ${formattedSize}\nVariação: ${displayChange}\n\n*Duplo clique para exibir todos os componentes e detalhes*`}</title>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: bgColor,
          stroke: '#05080e',
          strokeWidth: 1.5,
          cursor: 'pointer'
        }}
        className="transition-all duration-300 hover:brightness-[1.18] active:scale-[0.99] origin-center"
      />
      
      {width > 80 && height > 45 ? (
        <g className="pointer-events-none">
          {/* Ticker / Source Symbol (Large bold white sans) */}
          <text
            x={x + width / 2}
            y={y + height / 2 - 10}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={width > 130 ? 13 : 11}
            fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="-0.025em"
          >
            {displayTicker}
          </text>
          
          {/* Size / Capacity Value (Light grey Inter) */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 5}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize={width > 130 ? 10 : 8.5}
            fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {formattedSize}
          </text>

          {/* Hourly dispatch change percentage (Finviz style color green/red indicator) */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 18}
            textAnchor="middle"
            fill={change >= 0 ? '#4ade80' : '#f87171'}
            fontSize={width > 130 ? 10 : 8.5}
            fontWeight="800"
            fontFamily="JetBrains Mono, monospace"
          >
            {displayChange}
          </text>
        </g>
      ) : width > 45 && height > 24 ? (
        <g className="pointer-events-none">
          {/* Smaller compact view for intermediate rectangles */}
          <text
            x={x + width / 2}
            y={y + height / 2 - 2}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={9.5}
            fontWeight="bold"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {displayTicker.split('.')[1] || displayTicker}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 9}
            textAnchor="middle"
            fill={change >= 0 ? '#4ade80' : '#f87171'}
            fontSize={8}
            fontWeight="bold"
            fontFamily="JetBrains Mono, monospace"
          >
            {displayChange}
          </text>
        </g>
      ) : (
        <g className="pointer-events-none">
          {/* Micro layout for tiny rectangles */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 3}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={7.5}
            fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif"
            opacity={0.9}
          >
            {displayTicker.split('.')[1] || displayTicker.slice(0, 3)}
          </text>
        </g>
      )}
    </g>
  );
};

const Sparkline = ({ data, change }: { data: number[]; change: number }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * 60;
    const y = 16 - ((val - min) / range) * 14;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = change >= 0 ? '#10b981' : '#f43f5e';

  return (
    <svg className="w-16 h-5" viewBox="0 0 60 16">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        points={points}
      />
    </svg>
  );
};

const treemapDetailsLookup: Record<string, {
  title: string;
  badge: string;
  description: string;
  subComponents: {
    ticker: string;
    name: string;
    size: number;
    change: number;
    status: string;
    location: string;
    operator: string;
    share: string;
    sparkline: number[];
    description?: string;
    challenges?: string[];
  }[];
  regulatoryText: string;
  vision2040Text: string;
  challenges: string[];
}> = {
  'ONS.HIDR': {
    title: 'Hidrelétrica Centralizada (ONS SIN)',
    badge: 'ONS.HIDR • Centralizada',
    description: 'Espinha dorsal da estabilidade energética e da regulação de frequência do Sistema Interligado Nacional (SIN). Controla os principais reservatórios hidráulicos de regularização do país.',
    subComponents: [
      {
        ticker: 'UHE.ITAIPU',
        name: 'UHE Itaipu Binacional',
        size: 14000,
        change: 0.20,
        status: 'Operacional',
        location: 'Foz do Iguaçu - PR',
        operator: 'Itaipu Binacional',
        share: '20.6%',
        sparkline: [13800, 13900, 14000, 13950, 14020, 13980, 14000],
        description: 'Maior usina hidrelétrica em geração de energia acumulada do planeta, operando como ativo binacional estratégico fundamental para o controle de frequência do SIN.',
        challenges: ['Garantia física de longo termo influenciada pelo fluxo do Rio Paraná', 'Coordenação operacional binacional entre Brasil e Paraguai']
      },
      {
        ticker: 'UHE.BMONTE',
        name: 'UHE Belo Monte',
        size: 11233,
        change: -1.50,
        status: 'Sazonal',
        location: 'Altamira - PA',
        operator: 'Norte Energia S/A',
        share: '16.5%',
        sparkline: [8500, 8100, 7800, 7500, 7200, 6800, 6500],
        description: 'A maior hidrelétrica 100% brasileira. Opera no regime de fio d\'água no Rio Xingu, com alta sensibilidade à sazonalidade do período seco amazônico.',
        challenges: ['Vazões reduzidas severas na bacia do Rio Xingu durante a estiagem', 'Cumprimento de condicionantes socioambientais rigorosas']
      },
      {
        ticker: 'UHE.TUCURUI',
        name: 'UHE Tucuruí',
        size: 8535,
        change: 0.10,
        status: 'Operacional',
        location: 'Tucuruí - PA',
        operator: 'Eletrobras Eletronorte',
        share: '12.5%',
        sparkline: [8300, 8400, 8450, 8420, 8500, 8510, 8535],
        description: 'Crucial para o escoamento de energia da região Norte para o Nordeste e Sudeste, com um reservatório de regularização de grande porte.',
        challenges: ['Coordenação de múltiplos usos do reservatório e eclusas de navegação', 'Modernização de turbinas antigas']
      },
      {
        ticker: 'UHE.JIRAU',
        name: 'UHE Jirau',
        size: 3750,
        change: 0.50,
        status: 'Operacional',
        location: 'Porto Velho - RO',
        operator: 'Energia Sustentável do Brasil',
        share: '5.5%',
        sparkline: [3600, 3650, 3680, 3700, 3710, 3730, 3750],
        description: 'Localizada no Rio Madeira, utiliza turbinas tipo bulbo de alta tecnologia para baixa queda, reduzindo a área inundada do reservatório.',
        challenges: ['Abrasão das pás de turbina devido ao alto teor de sedimentos do Rio Madeira', 'Estreita janela operativa no período de cheias']
      },
      {
        ticker: 'UHE.SANTO_ANTONIO',
        name: 'UHE Santo Antônio',
        size: 3568,
        change: -0.80,
        status: 'Operacional',
        location: 'Porto Velho - RO',
        operator: 'Santo Antônio Energia S/A',
        share: '5.2%',
        sparkline: [3400, 3450, 3430, 3480, 3460, 3500, 3568],
        description: 'Também no complexo do Rio Madeira, opera como geradora chave para o suprimento do subsistema Sudeste/Centro-Oeste.',
        challenges: ['Logística de manutenção especializada em região de floresta equatorial', 'Variação rápida de vazões de afluentes']
      }
    ],
    regulatoryText: 'Regulada pelo ONS na operação direta do SIN. Sob as regras de despacho físico, sua valoração econômica é balizada pelo Custo de Oportunidade da Água (PLD Horário do DESSEM) e pelo Mecanismo de Realocação de Energia (MRE).',
    vision2040Text: 'Prevê a modernização de ativos (repensar e repotencializar turbinas de usinas com mais de 30 anos) e a conversão de usinas selecionadas em Sistemas de Bombeamento Reversível (Pumped Storage), atuando como baterias de água gigantescas de 135 GW para cobrir picos solares e eólicos.',
    challenges: [
      'Garantia física impactada por severas secas e estresse hídrico climático.',
      'Dificuldades para licenciamento ambiental de novos reservatórios na bacia Amazônica.',
      'Gestão de múltiplos usos da água (irrigação, transporte e abastecimento versus geração).'
    ]
  },
  'ONS.EOL': {
    title: 'Eólica Centralizada (ONS SIN)',
    badge: 'ONS.EOL • Centralizada',
    description: 'Complexos de aerogeradores de grande escala localizados principalmente nas regiões de ventos de alta qualidade do Nordeste e Extremo Sul do Brasil. Apresenta alta complementaridade com a geração hidrelétrica.',
    subComponents: [
      {
        ticker: 'EOL.CASA_VENTOS',
        name: 'Complexo Casa dos Ventos',
        size: 2500,
        change: 4.20,
        status: 'Expansão',
        location: 'Vários - Nordeste',
        operator: 'Casa dos Ventos',
        share: '15.6%',
        sparkline: [2200, 2300, 2410, 2350, 2450, 2480, 2500],
        description: 'Maior desenvolvedor de projetos eólicos onshore do país, com parques de alto fator de capacidade no Ceará, Pernambuco e Piauí.',
        challenges: ['Saturação das linhas de transmissão regionais de subtransmissão', 'Negociação de contratos de longo prazo (PPA) em mercado livre volátil']
      },
      {
        ticker: 'EOL.LAGOA_VENTOS',
        name: 'Complexo Eólico Lagoa dos Ventos',
        size: 1012,
        change: 5.10,
        status: 'Operacional',
        location: 'Lagoa do Barro - PI',
        operator: 'Enel Green Power',
        share: '6.3%',
        sparkline: [910, 930, 950, 970, 990, 1005, 1012],
        description: 'O maior parque eólico operacional da América do Sul, com aerogeradores de última geração operados de forma totalmente automatizada.',
        challenges: ['Coordenação de múltiplos inversores de parque em conexões fracas de rede', 'Logística pesada para substituição de componentes mecânicos de grande escala']
      },
      {
        ticker: 'EOL.SERRA_MEL',
        name: 'Complexo Serra do Mel',
        size: 950,
        change: 4.80,
        status: 'Operacional',
        location: 'Serra do Mel - RN',
        operator: 'Voltalia Brasil',
        share: '5.9%',
        sparkline: [880, 910, 920, 900, 930, 940, 950],
        description: 'Parque localizado em uma das regiões com ventos mais unidirecionais e estáveis do Brasil, alcançando fatores de capacidade excepcionais de mais de 50%.',
        challenges: ['Abrasão salina em pás expostas a ventos litorâneos carregados de umidade', 'Cumprimento de contratos de fornecimento firme em picos de calmaria']
      },
      {
        ticker: 'EOL.RIO_VENTO',
        name: 'Complexo Rio do Vento',
        size: 1038,
        change: 3.90,
        status: 'Operacional',
        location: 'Lajes - RN',
        operator: 'Casa dos Ventos / Elera',
        share: '6.5%',
        sparkline: [980, 1000, 1010, 1005, 1020, 1030, 1038],
        description: 'Geração robusta integrada diretamente à rede básica nacional de alta tensão, negociando energia predominantemente no mercado livre (ACL).',
        challenges: ['Controle de harmônicos e oscilações de frequência em conexões de subtransmissão', 'Flutuações de velocidade de vento que impactam planejamento diário do ONS']
      }
    ],
    regulatoryText: 'Os contratos de geração eólica competem ferozmente no Ambiente de Contratação Livre (ACL). No aspecto operacional, sofrem frequentes restrições de corte pelo ONS (curtailment) para evitar sobrecargas regionais nas linhas de transmissão.',
    vision2040Text: 'Crescimento exponencial para 240 GW. Projetos offshore ao longo do Ceará, Rio Grande do Norte e Rio de Janeiro serão integrados à rede nacional com subestações marinhas de alta tecnologia, destinando o excedente para a produção em larga escala de Hidrogênio Verde.',
    challenges: [
      'Saturação da capacidade de escoamento no tronco de transmissão Norte-Nordeste.',
      'Curtailment operativo (perdas financeiras não compensadas por limitação física da rede).',
      'Logística pesada para transporte de pás de grandes dimensões para o interior.'
    ]
  },
  'ONS.SOL': {
    title: 'Solar Centralizada (ONS SIN)',
    badge: 'ONS.SOL • Centralizada',
    description: 'Grandes usinas solares centralizadas com rastreamento solar dinâmico de um eixo (single-axis trackers) focadas em mercados de grande porte e autoprodução industrial.',
    subComponents: [
      {
        ticker: 'SOL.JANAUBA',
        name: 'Complexo Solar Janaúba',
        size: 1200,
        change: 14.20,
        status: 'Operacional',
        location: 'Janaúba - MG',
        operator: 'Elera Renováveis',
        share: '15.0%',
        sparkline: [800, 900, 1000, 1050, 1100, 1150, 1200],
        description: 'Um dos maiores complexos solares da América Latina, cobrindo uma área de mais de 3.000 hectares com trackers solares inteligentes de alta eficiência.',
        challenges: ['Manutenção e limpeza de milhões de módulos em região semiárida', 'Inversão do PLD horário para valores mínimos devido à alta concentração de geração diurna']
      },
      {
        ticker: 'SOL.FUTURA',
        name: 'Complexo Solar Futura',
        size: 852,
        change: 12.40,
        status: 'Operacional',
        location: 'Juazeiro - BA',
        operator: 'Eneva S/A',
        share: '10.7%',
        sparkline: [600, 700, 750, 780, 820, 840, 852],
        description: 'Parque de grande porte que fornece energia limpa principalmente sob o modelo de autoprodução por equivalência de carga para parceiros industriais.',
        challenges: ['Suavização de rampas de subida e descida de geração (Duck Curve)', 'Custos associados à expansão da subestação de acoplamento com a rede básica']
      },
      {
        ticker: 'SOL.SAO_GONCALO',
        name: 'Complexo Solar São Gonçalo',
        size: 864,
        change: 11.80,
        status: 'Operacional',
        location: 'São Gonçalo do Gurguéia - PI',
        operator: 'Enel Green Power',
        share: '10.8%',
        sparkline: [700, 750, 800, 810, 830, 850, 864],
        description: 'Pioneiro na utilização de módulos bifaciais que captam a radiação refletida do solo, aumentando o rendimento energético anual em até 15%.',
        challenges: ['Depósitos de poeira e areia que causam perdas de eficiência por sombreamento parcial', 'Custos regulatórios de transmissão interestadual de longa distância']
      },
      {
        ticker: 'SOL.PIRAPORA',
        name: 'Complexo Solar Pirapora',
        size: 321,
        change: 8.50,
        status: 'Operacional',
        location: 'Pirapora - MG',
        operator: 'EDF Renewables / Canadian',
        share: '4.0%',
        sparkline: [290, 300, 310, 305, 312, 318, 321],
        description: 'Primeira grande usina solar construída no Brasil com módulos fotovoltaicos montados e fabricados localmente com certificação do BNDES.',
        challenges: ['Obsolescência técnica prematura de inversores centrais de primeira geração', 'Degradação térmica acelerada de células em picos de calor extremo']
      }
    ],
    regulatoryText: 'Regulada pelas portarias do mercado livre de energia e pelos leilões de energia de reserva da ANEEL. Influencia o perfil de preços do DESSEM, jogando o preço horário ao piso do PLD durante as horas de pico de sol.',
    vision2040Text: 'Crescimento de 8 GW para 180 GW centralizados, obrigatoriamente acoplados com sistemas BESS industriais de 4 a 6 horas para suavizar a rampa de descarga de fim de tarde e garantir o fornecimento de ponta segura.',
    challenges: [
      'Rápida obsolescência de inversores centrais e necessidade de repotencialização de módulos.',
      'Perda de eficiência térmica devido ao aumento extremo das temperaturas ambientes.',
      'Custos de conexão às redes de subtransmissão.'
    ]
  },
  'ONS.TERM': {
    title: 'Térmica Centralizada (ONS SIN)',
    badge: 'ONS.TERM • Centralizada',
    description: 'Complexos termelétricos centralizados de alta potência, essenciais para a segurança de carga e de tensão no SIN como reserva estável não intermitente.',
    subComponents: [
      {
        ticker: 'UTE.SERGIPE',
        name: 'UTE Porto de Sergipe I',
        size: 1551,
        change: -8.20,
        status: 'Reserva',
        location: 'Barra dos Coqueiros - SE',
        operator: 'Eneva S/A',
        share: '15.5%',
        sparkline: [1500, 1400, 1300, 1200, 1000, 800, 1551],
        description: 'Uma das maiores termelétricas a gás natural da América Latina, abastecida por um terminal de regaseificação de GNL offshore dedicado.',
        challenges: ['Elevado custo de importação do gás natural liquefeito (GNL) cotado em dólar', 'Baixo fator de utilização devido ao despacho prioritário de renováveis intermitentes']
      },
      {
        ticker: 'UTE.ANGRA2',
        name: 'Nuclear Angra 2',
        size: 1350,
        change: 0.02,
        status: 'Operacional',
        location: 'Angra dos Reis - RJ',
        operator: 'Eletronuclear S/A',
        share: '13.5%',
        sparkline: [1349, 1350, 1350, 1350, 1350, 1350, 1350],
        description: 'Unidade nuclear estratégica que gera energia de base constante (baseload), garantindo a estabilidade de carga e tensão para a região Sudeste.',
        challenges: ['Planejamento complexo para paradas programadas de reabastecimento de combustível nuclear', 'Gestão rigorosa de rejeitos radioativos de acordo com protocolos globais']
      },
      {
        ticker: 'UTE.MARIO_LAGO',
        name: 'UTE Mário Lago',
        size: 920,
        change: -1.50,
        status: 'Reserva',
        location: 'Macaé - RJ',
        operator: 'Petrobras S/A',
        share: '9.2%',
        sparkline: [900, 910, 880, 870, 890, 915, 920],
        description: 'Instalação de turbogeradores térmicos a gás natural despachada em picos de demanda ou em condições de extrema escassez hídrica.',
        challenges: ['Emissões locais de óxidos de nitrogênio (NOx) e gases de efeito estufa', 'Elevado custo marginal de operação (CVU) que onera encargos do SIN']
      }
    ],
    regulatoryText: 'Despachadas por segurança operacional ou ordem de mérito pelo ONS. A receita de capacidade garante remuneração fixa em leilões de reserva de capacidade para prover estabilidade ao sistema de transmissão.',
    vision2040Text: 'Reconfiguração para 35 GW de potência. Desativação total de combustíveis fósseis pesados (carvão/óleo) e migração para biometano e turbinas termoelétricas alimentadas a Hidrogênio Verde ou amônia como contingência de curtíssimo prazo.',
    challenges: [
      'Pegada de carbono associada ao uso emergencial de óleo diesel e carvão mineral.',
      'Preços voláteis do gás natural importado indexado ao dólar americano.',
      'Elevado custo marginal de operação (CVU) que onera diretamente o consumidor final.'
    ]
  },
  'GD.SOLAR': {
    title: 'Solar MMGD (Geração Distribuída)',
    badge: 'GD.SOLAR • Micro/Minigeração',
    description: 'A maior revolução de energia distribuída do país. Composta por milhões de telhados residenciais, comerciais, industriais e cooperativas de geração solar remota.',
    subComponents: [
      {
        ticker: 'GD.SOL.RES_MG',
        name: 'Microgeração Residencial MG',
        size: 1200,
        change: 15.50,
        status: 'Crescendo',
        location: 'Minas Gerais - Vários',
        operator: 'Consumidores Residenciais',
        share: '22.5%',
        sparkline: [980, 1020, 1050, 1100, 1120, 1150, 1200],
        description: 'Milhares de pequenos telhados solares residenciais espalhados por Minas Gerais, liderando a GD nacional graças à isenção de ICMS histórica.',
        challenges: ['Inversão de fluxo de potência em transformadores de subestação local de distribuição', 'Adaptação gradual às novas regras de compensação da Lei 14.300']
      },
      {
        ticker: 'GD.SOL.RES_SP',
        name: 'Microgeração Residencial SP',
        size: 980,
        change: 14.20,
        status: 'Crescendo',
        location: 'São Paulo - Vários',
        operator: 'Consumidores Residenciais',
        share: '18.4%',
        sparkline: [850, 880, 900, 910, 930, 960, 980],
        description: 'Crescimento acelerado de conexões em telhados da capital e interior paulista, impulsionado pela alta tarifa de energia local.',
        challenges: ['Burocracia e atrasos no processo de homologação de acesso pelas distribuidoras', 'Gargalos físicos de espaço útil em coberturas residenciais urbanas']
      },
      {
        ticker: 'GD.SOL.COM_SP',
        name: 'Minigeração Comercial SP',
        size: 650,
        change: 12.80,
        status: 'Operacional',
        location: 'São Paulo - Vários',
        operator: 'Pequenas e Médias Empresas',
        share: '12.2%',
        sparkline: [580, 600, 610, 620, 615, 640, 650],
        description: 'Sistemas fotovoltaicos instalados em comércios, galpões e supermercados para redução imediata do custo fixo operacional.',
        challenges: ['Cobrança de demanda contratada em contratos comerciais rígidos', 'Amortização financeira (Payback) alongada pelas novas regras de transição do Fio B']
      }
    ],
    regulatoryText: 'Regida pela Lei 14.300/2022 (Marco Legal de GD). Conexões efetuadas pós-período de transição arcam gradualmente com parcelas da TUSD Fio B. Incentiva-se o autoconsumo local para otimizar faturamento e evitar sobrecarga na rede distribuidora.',
    vision2040Text: 'Salto espetacular para 320 GW. Cada telhado residencial e industrial operará com inversores híbridos inteligentes e armazenamento térmico ou elétrico em baterias locais, reduzindo a dependência da rede elétrica em 90% nos horários de pico.',
    challenges: [
      'Inversão de fluxo de potência em transformadores de distribuição locais.',
      'Restrições arbitrárias de conexão por parte das concessionárias locais (obstáculos de rede).',
      'Necessidade de transição para tarifas horárias binômias de demanda para pequenos consumidores.'
    ]
  },
  'GD.TERM': {
    title: 'Térmica MMGD (Geração Distribuída)',
    badge: 'GD.TERM • Micro/Minigeração',
    description: 'Pequenos geradores despacháveis descentralizados instalados junto ao centro de consumo, aproveitando resíduos orgânicos de aterros sanitários e atividades agropecuárias.',
    subComponents: [
      {
        ticker: 'GD.TERM.CAN_SP',
        name: 'Biomassa Cana Ribeirão Preto',
        size: 145,
        change: 3.20,
        status: 'Sazonal',
        location: 'Ribeirão Preto - SP',
        operator: 'Usinas de Açúcar e Álcool',
        share: '35.2%',
        sparkline: [120, 130, 135, 140, 142, 145, 145],
        description: 'Geração térmica distribuída a partir da queima direta do bagaço da cana-de-açúcar durante o período de safra sucroalcooleira.',
        challenges: ['Dependência extrema do cronograma agrícola e do volume de moagem de cana', 'Custo de armazenagem física de grandes estoques de bagaço para entressafra']
      },
      {
        ticker: 'GD.TERM.BIOGAS_SC',
        name: 'Biogás Suinocultura Chapecó',
        size: 48,
        change: 8.40,
        status: 'Operacional',
        location: 'Chapecó - SC',
        operator: 'Cooperativa Agroindustrial',
        share: '11.6%',
        sparkline: [40, 42, 43, 45, 46, 47, 48],
        description: 'Biodigestores de dejetos suínos no oeste catarinense, transformando passivo ambiental em energia estável 24h e biofertilizante de alta qualidade.',
        challenges: ['Manutenção preventiva constante de motores de combustão interna contra corrosão de H2S', 'Investimento inicial alto para sistemas de purificação de biometano']
      },
      {
        ticker: 'GD.TERM.ATERRO_SP',
        name: 'Biogás Aterro Paulínia',
        size: 25,
        change: 5.00,
        status: 'Operacional',
        location: 'Paulínia - SP',
        operator: 'Orizon Valorização',
        share: '6.1%',
        sparkline: [21, 22, 23, 23, 24, 25, 25],
        description: 'Captação direta de metano do lixo orgânico urbano depositado no aterro, gerando energia constante acoplada à rede de baixa tensão.',
        challenges: ['Declínio natural na curva de geração de gás após o fechamento de células de aterro', 'Necessidade de monitoramento de contaminantes siloxanos na queima']
      }
    ],
    regulatoryText: 'Garante compensação de créditos sob o modelo de compensação da Lei 14.300/2022, com o benefício técnico de não sobrecarregar as linhas de subtransmissão por operar em base estável firme durante os períodos noturnos.',
    vision2040Text: 'Escalar para 45 GW, com aproveitamento em massa dos resíduos orgânicos e efluentes do agronegócio nacional (vinhaça de etanol de milho/cana e dejetos de suinocultura) convertidos em energia estável de base contínua.',
    challenges: [
      'Fornecimento sazonal de biomassa florestal ou de resíduos agrícolas.',
      'Custos de manutenção mecânica especializada de motogeradores de biogás.',
      'Inexistência de rede de gasodutos locais de biometano refinado.'
    ]
  },
  'GD.CGH': {
    title: 'Hidro CGH MMGD (Geração Distribuída)',
    badge: 'GD.CGH • Micro/Minigeração',
    description: 'Pequenos aproveitamentos hidrelétricos descentralizados com potência individual inferior a 5 MW. Operam sob a modalidade de run-of-river (fio d\'água).',
    subComponents: [
      {
        ticker: 'GD.CGH.SAO_JOAO',
        name: 'CGH São João',
        size: 4.8,
        change: 1.20,
        status: 'Operacional',
        location: 'Rio Sapucaí - MG',
        operator: 'Hidro Metalúrgica Ltda',
        share: '48.0%',
        sparkline: [4.2, 4.5, 4.6, 4.5, 4.7, 4.8, 4.8],
        description: 'Microcentral geradora hidrelétrica que atende a uma unidade industrial de fundição local através do modelo de autoconsumo remoto.',
        challenges: ['Queda drástica no fator de capacidade nos meses secos do subsistema Sudeste', 'Custos regulatórios e tempo elevado para obtenção de outorga de barramento']
      },
      {
        ticker: 'GD.CGH.PORTO_VERDE',
        name: 'CGH Porto Verde',
        size: 3.5,
        change: -0.50,
        status: 'Operacional',
        location: 'Tibagi - PR',
        operator: 'Cooperativa Agropecuária',
        share: '35.0%',
        sparkline: [3.8, 3.7, 3.6, 3.5, 3.5, 3.5, 3.5],
        description: 'Central hídrica distribuída operando sem reservatório (fio d\'água), fornecendo estabilidade e créditos aos associados da cooperativa rural.',
        challenges: ['Assoreamento de canais de captação após episódios de chuvas torrenciais', 'Manutenção corretiva difícil de realizar por acessibilidade geográfica remota']
      }
    ],
    regulatoryText: 'Beneficia-se das regras de compensação distribuída de energia, fornecendo eletricidade com baixíssimo impacto ambiental e sem necessidade de reservatórios inundados.',
    vision2040Text: 'Meta de 15 GW instalados através do retrofitting (modernização tecnológica) de antigas turbinas industriais e fazendas históricas, com controle automatizado e sensoriamento preditivo por microrredes locais inteligentes.',
    challenges: [
      'Sensibilidade extrema à vazão sazonal de rios menores de cabeceira.',
      'Custos burocráticos elevados e lentidão no licenciamento de pequenos barramentos.',
      'Manutenção preventiva em locais de difícil acesso geográfico.'
    ]
  },
  'GD.EOL': {
    title: 'Eólica MMGD (Geração Distribuída)',
    badge: 'GD.EOL • Micro/Minigeração',
    description: 'Geração de energia a partir da força dos ventos por meio de micro e pequenos aerogeradores distribuídos localmente para autoconsumo rural, de cooperativas ou pequenas indústrias.',
    subComponents: [
      {
        ticker: 'GD.EOL.RURAL_RN',
        name: 'Microeólica Fazendas RN',
        size: 8.2,
        change: 5.50,
        status: 'Operacional',
        location: 'Lajes - RN',
        operator: 'Agropecuários RN',
        share: '60.0%',
        sparkline: [7.2, 7.5, 7.8, 8.0, 8.1, 8.2, 8.2],
        description: 'Pequenos aerogeradores de baixa potência instalados em fazendas do sertão potiguar para suprimento de irrigação e bombeamento hídrico.',
        challenges: ['Baixa disponibilidade de peças de reposição de microaerogeradores nacionais', 'Desgaste mecânico acelerado por ventos intensos e altas temperaturas']
      },
      {
        ticker: 'GD.EOL.HIBRIDO_RS',
        name: 'Híbrido Solar-Eólico Osório',
        size: 3.8,
        change: 2.10,
        status: 'Operacional',
        location: 'Osório - RS',
        operator: 'Condomínio Industrial',
        share: '27.8%',
        sparkline: [3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.8],
        description: 'Projeto piloto integrando microgeração eólica e solar em uma malha híbrida industrial local com baterias estacionárias.',
        challenges: ['Desenvolvimento de algoritmos complexos para controle coordenado de carga e descarga de bateria', 'Complexidade técnica de parametrização de inversores de acoplamento híbrido']
      }
    ],
    regulatoryText: 'Compensa créditos de energia na baixa ou média tensão sob o marco legal da Lei 14.300/2022, geralmente com complementaridade com sistemas de compensação em baterias locais.',
    vision2040Text: 'Atingirá 10 GW de capacidade instalada através do desenvolvimento e disseminação de microaerogeradores de eixo vertical (VAWT) silenciosos e de alta eficiência, ideais para o setor comercial periurbano e agropecuária intensiva de corte.',
    challenges: [
      'Custos de importação de equipamentos e baixa oferta de turbinas de pequeno porte nacionais.',
      'Turbulência de ventos em baixas altitudes próxima a obstáculos construídos ou árvores.',
      'Baixo fator de capacidade quando não planejado por campanhas de medição robustas.'
    ]
  },
};

export default function App() {
  // Tabs: 'dashboard' | 'ons' | 'db' | 'calc' | 'ai'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ons' | 'db' | 'calc' | 'ai'>('dashboard');
  
  // App states
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [ufStats, setUfStats] = useState<StateEnergyStats[]>([]);
  const [selectedUF, setSelectedUF] = useState<string>('MG');
  
  // ONS States
  const [cargaData, setCargaData] = useState<any[]>([]);
  const [dessemData, setDessemData] = useState<any[]>([]);
  const [loadingONS, setLoadingONS] = useState<boolean>(true);
  
  // DB & ETL States
  const [mmgdRaw, setMmgdRaw] = useState<RawMMGDRecord[]>([]);
  const [mmgdFato, setMmgdFato] = useState<FatoMMGDRecord[]>([]);
  const [loadingDB, setLoadingDB] = useState<boolean>(true);
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM mmgd_fato WHERE sig_uf = 'MG'");
  const [sqlResult, setSqlResult] = useState<any | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [runningSQL, setRunningSQL] = useState<boolean>(false);
  
  // New raw record state for custom ETL sync
  const [newRecord, setNewRecord] = useState<Partial<RawMMGDRecord>>({
    nom_empreendimento: 'UFV Solar Tech Campinas',
    cod_geracao_distribuida: 'GD_450291',
    nom_titular: 'Condomínio Residencial Tech',
    num_cpf_cnpj: '33.444.555/0001-22',
    sig_uf: 'SP',
    nom_municipio: 'Campinas',
    potencia_instalada_kw: 150,
    fonte_bruta: 'Solar Fotovoltaica (UFV)',
    modalidade_bruta: 'Geração Compartilhada',
    data_conexao: '2026-07-13'
  });
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  // Confetti trigger trigger
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // New Audit & RAG Fallback states
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState<boolean>(false);
  const [triggeringCron, setTriggeringCron] = useState<boolean>(false);
  const [fallbackRAG, setFallbackRAG] = useState<boolean>(false);

  // PDF Text Report states
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportText, setReportText] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Treemap Timeframe Selection: '1h' | '1d' | '1w' (Finviz Map Style)
  const [mapTimeframe, setMapTimeframe] = useState<'1h' | '1d' | '1w'>('1h');

  // Treemap Map View Selection: 'live' | 'mensal' | 'anual' | 'vision2030' | 'vision2040' (Finviz Map Style)
  const [mapView, setMapView] = useState<'live' | 'mensal' | 'anual' | 'vision2030' | 'vision2040'>('live');

  // Double-clicked Item Modal for deep-dive components and details
  const [selectedTreemapItem, setSelectedTreemapItem] = useState<any | null>(null);
  const [showTreemapDetailModal, setShowTreemapDetailModal] = useState<boolean>(false);
  const [expandedSubComponent, setExpandedSubComponent] = useState<string | null>(null);

  // Custom states for expanded assets and families integration (SIN GD + GC)
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState<string>('');
  const [jsonVectorTab, setJsonVectorTab] = useState<'treemap' | 'uf_stats' | 'dessem'>('treemap');
  const [jsonCopied, setJsonCopied] = useState<boolean>(false);

  // ONS Load Curve modes: 'normal' | 'apagao'
  const [onsViewMode, setOnsViewMode] = useState<'normal' | 'apagao'>('normal');
  const [onsTimeframe, setOnsTimeframe] = useState<'diario' | 'mensal' | 'anual' | 'maximo'>('diario');
  const [selectedONSDate, setSelectedONSDate] = useState<string>('2023-08-15');

  // Uncaught errors public log state (Observability & Diagnostics)
  const [uncaughtErrors, setUncaughtErrors] = useState<{ time: string; level: 'WARNING' | 'CRITICAL' | 'INFO'; message: string; component: string }[]>([
    { time: new Date().toLocaleTimeString('pt-BR'), level: 'INFO', message: 'MEx Observability Daemon inicializado com sucesso.', component: 'System Core' },
    { time: new Date().toLocaleTimeString('pt-BR'), level: 'WARNING', message: 'Conexão HMR WebSocket recusada (Comportamento esperado devido a restrições de sandbox do iframe).', component: 'Vite Development Server' }
  ]);

  // Calculator state
  const [calcInputs, setCalcInputs] = useState({
    potenciaKw: 250,
    fonteNorm: 'UFV' as 'UFV' | 'EOL' | 'CGH' | 'UTE',
    modalidadeNorm: 'AUTOCONSUMO_REMOTO' as 'GERACAO_PROPRIA' | 'AUTOCONSUMO_REMOTO' | 'GERACAO_COMPARTILHADA' | 'EMUC' | 'MUC',
    connectionYear: 2026
  });
  const [calcResults, setCalcResults] = useState<any | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);

  // Gemini AI Chat states
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([
    {
      role: 'model',
      text: 'Olá! Sou o Assistente de Inteligência Energética da MEx Energia. Posso tirar suas dúvidas sobre o marco legal de GD (Lei 14.300/2022), regras de transição do Fio B, cargas de alta densidade no barramento 800VDC e dimensionamento de armazenamento de energia por bateria (BESS).'
    }
  ]);
  const [sendingChat, setSendingChat] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch stats and UF details
  const fetchStatsAndUF = async () => {
    try {
      const statsRes = await fetch('/api/energy/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setDbStats(statsData.data);
      }
      
      const ufRes = await fetch('/api/energy/uf');
      const ufData = await ufRes.json();
      if (ufData.success) {
        setUfStats(ufData.data);
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  // Fetch ONS curves
  const fetchONSCurves = async () => {
    setLoadingONS(true);
    try {
      const res = await fetch('/api/energy/ons');
      const data = await res.json();
      if (data.success) {
        setCargaData(data.data.carga_ons);
        setDessemData(data.data.dessem_balanco);
      }
    } catch (e) {
      console.error('Failed to fetch ONS curves', e);
    } finally {
      setLoadingONS(false);
    }
  };

  // Fetch DB records and run initial query
  const fetchDBAndRunQuery = async () => {
    setLoadingDB(true);
    try {
      const res = await fetch('/api/energy/db');
      const data = await res.json();
      if (data.success) {
        setMmgdRaw(data.data.mmgd_raw);
        setMmgdFato(data.data.mmgd_fato);
      }
      
      // Execute standard SQL query
      executeSQL(sqlQuery);
    } catch (e) {
      console.error('Failed to fetch database', e);
    } finally {
      setLoadingDB(false);
    }
  };

  // Fetch real-time system diagnostics (Evidence Audit)
  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetch('/api/energy/diagnostics');
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch diagnostics', e);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Trigger a simulated Cron schedule run
  const handleTriggerCron = async (action: 'MMGD_SYNC' | 'ONS_PULL') => {
    setTriggeringCron(true);
    try {
      const res = await fetch('/api/energy/trigger-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh diagnostics logs, stats and DB
        await fetchDiagnostics();
        await fetchStatsAndUF();
        await fetchDBAndRunQuery();
      }
    } catch (e) {
      console.error('Failed to trigger cron', e);
    } finally {
      setTriggeringCron(false);
    }
  };

  // Run Calculator
  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await fetch('/api/energy/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calcInputs)
      });
      const data = await res.json();
      if (data.success) {
        setCalcResults(data.data);
      }
    } catch (e) {
      console.error('Calculation failed', e);
    } finally {
      setCalculating(false);
    }
  };

  // Generate formatted text report for copy and download
  const handleGenerateReport = () => {
    if (!calcResults) return;

    const formattedDate = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'long',
      timeStyle: 'medium'
    });

    const isRemotoAcima500 = calcResults.isMinigeracaoAcima500kW;
    const yearComp = calcInputs.connectionYear;
    
    let fonteExt = 'Solar Fotovoltaica (UFV)';
    if (calcInputs.fonteNorm === 'EOL') fonteExt = 'Eólica (EOL)';
    if (calcInputs.fonteNorm === 'CGH') fonteExt = 'Central Geradora Hidrelétrica (CGH)';
    if (calcInputs.fonteNorm === 'UTE') fonteExt = 'Térmica / Biogás (UTE)';

    let modExt = 'Geração Própria / Autoconsumo Local';
    if (calcInputs.modalidadeNorm === 'AUTOCONSUMO_REMOTO') modExt = 'Autoconsumo Remoto';
    if (calcInputs.modalidadeNorm === 'GERACAO_COMPARTILHADA') modExt = 'Geração Compartilhada';
    if (calcInputs.modalidadeNorm === 'EMUC') modExt = 'EMUC (Múltiplos Consumidores)';

    const text = `======================================================================
                 MEx ENERGIA - RELATÓRIO DE SIMULAÇÃO REGULATÓRIA
                         MARCO LEGAL DE GD (LEI 14.300/2022)
======================================================================
Data/Hora de Emissão : ${formattedDate}
Local de Referência  : Fuso Horário de Brasília (UTC-3)
Sistema Gerador      : MEx Energy Data Analytics Platform

----------------------------------------------------------------------
1. IDENTIFICAÇÃO DO EMPREENDIMENTO SIMULADO
----------------------------------------------------------------------
Potência do Projeto  : ${calcInputs.potenciaKw} kW
Fonte Primária       : ${fonteExt}
Modalidade de Proj.  : ${modExt}
Ano da Conexão       : ${yearComp === 2022 ? 'Até 2022 (Direito Adquirido GD1)' : yearComp === 2029 ? 'A partir de 2029 (GD2 Integral)' : `${yearComp} (Transição GD2)`}

----------------------------------------------------------------------
2. ENQUADRAMENTO E PARECER REGULATÓRIO ANEEL
----------------------------------------------------------------------
Faixa Regulatória    : ${calcResults.faixaRegulatoria}
Cobrança TUSD Fio B  : ${calcResults.fioBPercentage}% da TUSD Fio B (Compensação reduzida)
Regra de Transição   : ${
      yearComp === 2022 
        ? 'GD1 (Isenção total até 2045 - Direito adquirido)' 
        : isRemotoAcima500 
          ? 'SEM TRANSIÇÃO GRADUAL. Sujeito a 100% de Fio B e 40% de Fio A imediatos (Art. 26).'
          : `Cobrança gradual escalonada (${calcResults.fioBPercentage}% da TUSD Fio B em ${yearComp})`
    }
Alerta Artigo 26     : ${isRemotoAcima500 ? 'SIM • Minigeração > 500 kW Autoconsumo Remoto (100% de cobrança de TUSD Fio B)' : 'Não aplicável (Regras padrão de micro/minigeração com transição)'}

----------------------------------------------------------------------
3. ANÁLISE DE PAYBACK E VIABILIDADE TÉCNICA-ECONÔMICA
----------------------------------------------------------------------
Retorno Estimado     : ${calcResults.paybackYearsEstimated} Anos (Payback)
Viabilidade BESS MEx : ${calcResults.bessViabilityScore}% (Grau de adequação tecnológica)
Adequação Tecnológica: ${
      calcResults.bessViabilityScore >= 70 
        ? 'ALTAMENTE RECOMENDADO para armazenamento nativo industrial BESS MEx (800VDC).' 
        : calcResults.bessViabilityScore >= 40
          ? 'RECOMENDAÇÃO MODERADA. Requer otimização da curva de carga por peak shaving.'
          : 'BAIXO APELO FINANCEIRO para baterias modulares comerciais no momento.'
    }

----------------------------------------------------------------------
4. PARECER ESTRATÉGICO MEx ENERGIA (SUMÁRIO OPERACIONAL)
----------------------------------------------------------------------
${calcResults.recommendation}

----------------------------------------------------------------------
Relatório gerado automaticamente para fins informativos e de pré-projeto.
MEx Energia BR • Tecnologia em Barramento 800VDC e Microrredes.
======================================================================`;

    setReportText(text);
    setCopiedReport(false);
    setShowReportModal(true);
  };

  // Copy formatted report text to clipboard
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Download formatted report text as .txt file
  const handleDownloadReport = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_mex_lei14300_${calcInputs.potenciaKw}kw.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Run simulated SQL query
  const executeSQL = async (queryToRun: string) => {
    setRunningSQL(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      const res = await fetch('/api/energy/query-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryToRun })
      });
      const data = await res.json();
      if (data.success) {
        setSqlResult(data);
      } else {
        setSqlError(data.error);
      }
    } catch (e: any) {
      setSqlError(e.message || 'Erro de execução da consulta SQL.');
    } finally {
      setRunningSQL(false);
    }
  };

  // Execute ETL Sync on user-entered raw project
  const handleSyncRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setSyncSuccessMessage(null);
    setSyncErrorMessage(null);
    try {
      const res = await fetch('/api/energy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      const data = await res.json();
      if (data.success) {
        setSyncSuccessMessage(`Sucesso! ${data.message} HASH: ${data.data.fato.hash}`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
        
        // Refresh local memory and charts
        await fetchStatsAndUF();
        await fetchDBAndRunQuery();
      } else {
        setSyncErrorMessage(data.error);
      }
    } catch (err: any) {
      setSyncErrorMessage(err.message || 'Erro ao processar sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  // Chat with Gemini
  const handleSendChat = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const messageToSend = customMsg || chatMessage;
    if (!messageToSend.trim()) return;

    // Append user message
    const updatedHistory = [...chatHistory, { role: 'user' as const, text: messageToSend }];
    setChatHistory(updatedHistory);
    if (!customMsg) setChatMessage('');
    setSendingChat(true);

    // If local RAG fallback simulation is active, bypass server call
    if (fallbackRAG) {
      setTimeout(() => {
        const localReply = searchLocalKnowledgeBase(messageToSend);
        setChatHistory(prev => [...prev, { role: 'model', text: localReply }]);
        setSendingChat(false);
      }, 750); // simulate 750ms offline RAG lookup delay
      return;
    }

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend })
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: `Erro: ${data.error}` }]);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'model', text: `Erro ao se conectar ao Gemini: ${err.message}` }]);
    } finally {
      setSendingChat(false);
    }
  };

  // Run initial state fetches and register global observability listeners
  useEffect(() => {
    fetchStatsAndUF();
    fetchONSCurves();
    fetchDBAndRunQuery();
    handleCalculate();
    fetchDiagnostics();

    // Intercept uncaught exceptions and render failures to register in our Public Failure Log
    const handleRuntimeError = (event: ErrorEvent) => {
      const errorMsg = event.message || 'Erro de execução desconhecido.';
      const rawFile = event.filename ? event.filename.split('/').pop() : 'App.tsx';
      const fileContext = rawFile ? rawFile.split('?')[0] : 'App.tsx';
      setUncaughtErrors(prev => [
        {
          time: new Date().toLocaleTimeString('pt-BR'),
          level: 'CRITICAL',
          message: errorMsg,
          component: `Runtime Exception (${fileContext}:${event.lineno || 0}:${event.colno || 0})`
        },
        ...prev.slice(0, 8)
      ]);
    };

    window.addEventListener('error', handleRuntimeError);
    return () => {
      window.removeEventListener('error', handleRuntimeError);
    };
  }, []);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, sendingChat]);

  // Selected State Details Memo
  const selectedUFDetails = useMemo(() => {
    return ufStats.find(u => u.uf === selectedUF) || null;
  }, [selectedUF, ufStats]);

  // Top 10 States for charts
  const top10StatesByMW = useMemo(() => {
    return [...ufStats]
      .sort((a, b) => b.mmgd_mw - a.mmgd_mw)
      .slice(0, 10);
  }, [ufStats]);

  // National metrics aggregation by source
  const nationalSourceAggregation = useMemo(() => {
    let ufv = 0;
    let eol = 0;
    let cgh = 0;
    let ute = 0;
    ufStats.forEach(s => {
      ufv += s.ufv_mw;
      eol += s.eol_mw;
      cgh += s.cgh_mw;
      ute += s.ute_mw;
    });
    return [
      { name: 'Solar UFV', value: Number(ufv.toFixed(1)), color: '#eab308' },
      { name: 'Eólica EOL', value: Number(eol.toFixed(1)), color: '#06b6d4' },
      { name: 'Hídrica CGH', value: Number(cgh.toFixed(1)), color: '#3b82f6' },
      { name: 'Térmica UTE', value: Number(ute.toFixed(1)), color: '#f97316' }
    ];
  }, [ufStats]);

  // Parser for the selected ONS Date
  const parsedONSDate = useMemo(() => {
    try {
      const d = new Date(selectedONSDate + 'T00:00:00');
      if (isNaN(d.getTime())) return new Date('2023-08-15T00:00:00');
      return d;
    } catch {
      return new Date('2023-08-15T00:00:00');
    }
  }, [selectedONSDate]);

  // Unified ONS demand data based on timeframe ('diario', 'mensal', 'anual', 'maximo')
  const displayedCargaData = useMemo(() => {
    if (onsTimeframe === 'maximo') {
      return [
        { label: '2018', verificada_mw: 88300, programada_mw: 87500, desc: 'Recorde SE/CO' },
        { label: '2019', verificada_mw: 91500, programada_mw: 91000, desc: 'Pico comercial pré-pandemia' },
        { label: '2020', verificada_mw: 89800, programada_mw: 92000, desc: 'Impacto COVID-19' },
        { label: '2021', verificada_mw: 92200, programada_mw: 91800, desc: 'Recuperação pós-crise hídrica' },
        { label: '2022', verificada_mw: 95800, programada_mw: 95000, desc: 'Expansão de Microgeração (GD)' },
        { label: '2023', verificada_mw: 101400, programada_mw: 99500, desc: 'Onda histórica de calor (Nov)' },
        { label: '2024', verificada_mw: 102470, programada_mw: 101800, desc: 'Pico extremo de calor em Março (42ºC)' },
        { label: '2025', verificada_mw: 103900, programada_mw: 103200, desc: 'Alta de Data Centers & IA' },
        { label: '2026', verificada_mw: 105200, programada_mw: 104500, desc: 'Projeção ONS de Demanda Máxima' }
      ];
    }

    if (onsTimeframe === 'anual') {
      const year = Math.max(2018, Math.min(2026, parsedONSDate.getFullYear()));
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const baseYearlyPeak = 74000;
      const seasonalEffects = [4800, 5200, 4100, 1200, -1200, -2800, -3100, -1400, 900, 2700, 3800, 4500];
      const growthFactor = 1 + (year - 2023) * 0.035;

      return monthNames.map((name, index) => {
        const baseOffset = seasonalEffects[index];
        const avgLoad = (baseYearlyPeak + baseOffset) * growthFactor;
        const seed = year * 100 + index;
        const noise = Math.cos(seed) * 500;

        let verificada_mw = Math.round(avgLoad + noise);
        let programada_mw = Math.round(avgLoad * 1.008);

        if (year === 2023 && index === 7) {
          verificada_mw = Math.round(verificada_mw - 350); // August blackout drop
        }

        return {
          label: name,
          verificada_mw,
          programada_mw,
          desc: `Média de ${name}/${year}`
        };
      });
    }

    if (onsTimeframe === 'mensal') {
      const year = Math.max(2018, Math.min(2026, parsedONSDate.getFullYear()));
      const month = parsedONSDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const seasonalEffects = [4500, 5000, 3800, 1500, -1000, -2500, -2800, -1200, 800, 2500, 3500, 4200];
      const baseOffset = seasonalEffects[month] || 0;
      const growthFactor = 1 + (year - 2023) * 0.035;

      const list = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDayDate = new Date(year, month, day);
        const dayOfWeek = currentDayDate.getDay();

        let scaleFactor = 1.0;
        if (dayOfWeek === 0) scaleFactor = 0.77; // Sunday
        else if (dayOfWeek === 6) scaleFactor = 0.87; // Saturday

        const baseDailyLoad = (72000 * scaleFactor + baseOffset) * growthFactor;
        const daySeed = year * 1000 + month * 100 + day;
        const noise = Math.sin(daySeed) * 1200;

        let verificada_mw = Math.round(baseDailyLoad + noise);
        let programada_mw = Math.round(baseDailyLoad * 1.012);

        if (year === 2023 && month === 7 && day === 15) {
          verificada_mw = Math.round(verificada_mw - 8500); // 15/08/2023 average load crash
        }

        list.push({
          label: `${day.toString().padStart(2, '0')}`,
          verificada_mw,
          programada_mw,
          fullDateStr: `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        });
      }
      return list;
    }

    // Default: 'diario'
    const dayOfWeek = parsedONSDate.getDay();
    const month = parsedONSDate.getMonth();
    const year = Math.max(2018, Math.min(2026, parsedONSDate.getFullYear()));
    
    let scaleFactor = 1.0;
    if (dayOfWeek === 0) scaleFactor = 0.76;
    else if (dayOfWeek === 6) scaleFactor = 0.86;

    const seasonalEffects = [4500, 5000, 3800, 1500, -1000, -2500, -2800, -1200, 800, 2500, 3500, 4200];
    const baseOffset = seasonalEffects[month] || 0;

    // Load growth factor by year (e.g. 2018 is much lower, 2026 is higher)
    const yearGrowthFactor = 1 + (year - 2023) * 0.035;

    // Solar generation penetration based on year (very low in 2018, extremely high in 2026)
    const solarPenetration = Math.max(0.005, Math.min(0.35, 0.005 + Math.pow(Math.max(0, year - 2018) / 8, 2.5) * 0.345));

    return cargaData.map(item => {
      if (!item.hora) return item;
      
      const [hStr, mStr] = item.hora.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const hourFloat = h + (m === 30 ? 0.5 : 0);

      let valVerificada = item.verificada_mw * scaleFactor * yearGrowthFactor + baseOffset;
      let valProgramada = item.programada_mw * scaleFactor * yearGrowthFactor + baseOffset;

      // Calculate Solar dip (creates the actual net load "duck curve" or "curva do pato")
      let solarFactor = 0;
      if (hourFloat >= 6.5 && hourFloat <= 17.5) {
        solarFactor = Math.sin((hourFloat - 6.5) * Math.PI / 11); // peaks at 12:00 with value 1
      }
      const peakLoadAtNoon = 70000 * scaleFactor * yearGrowthFactor;
      const solarDip = peakLoadAtNoon * solarPenetration * solarFactor;

      valVerificada = Math.max(25000, Math.round(valVerificada - solarDip));
      valProgramada = Math.max(25000, Math.round(valProgramada - solarDip * 0.95));

      const dateStr = selectedONSDate;
      let hash = 0;
      for (let i = 0; i < dateStr.length; i++) {
        hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      const noiseFactor = (hash % 100) / 100;
      const randomVariation = noiseFactor * 800;
      
      valVerificada = Math.round(valVerificada + randomVariation);
      valProgramada = Math.round(valProgramada + randomVariation * 0.9);

      if (selectedONSDate === '2023-08-15' && onsViewMode === 'apagao') {
        const t = hourFloat;
        if (t >= 8.5 && t <= 15.0) {
          const hoursSinceEvent = t - 8.5;
          const recoveryFactor = Math.min(1, hoursSinceEvent / 6);
          const dropAmount = 19000 * (1 - recoveryFactor);
          valVerificada = Math.max(20000, Math.round(valVerificada - dropAmount));
        }
      }

      return {
        hora: item.hora,
        verificada_mw: valVerificada,
        programada_mw: valProgramada
      };
    });
  }, [cargaData, onsTimeframe, parsedONSDate, selectedONSDate, onsViewMode]);

  // Dynamic ONS DESSEM Energy Balance based on year & date (exhibits real duck curve development)
  const displayedDessemData = useMemo(() => {
    const year = Math.max(2018, Math.min(2026, parsedONSDate.getFullYear()));
    const month = parsedONSDate.getMonth();
    const dayOfWeek = parsedONSDate.getDay();

    let scaleFactor = 1.0;
    if (dayOfWeek === 0) scaleFactor = 0.76;
    else if (dayOfWeek === 6) scaleFactor = 0.86;

    const seasonalEffects = [4500, 5000, 3800, 1500, -1000, -2500, -2800, -1200, 800, 2500, 3500, 4200];
    const baseOffset = seasonalEffects[month] || 0;

    // Load growth factor by year:
    const yearGrowthFactor = 1 + (year - 2023) * 0.035;

    // Solar peak generation in MW by year (reflects real explosive solar capacity growth)
    let peakSolar = 12000;
    if (year === 2018) peakSolar = 150;
    else if (year === 2019) peakSolar = 450;
    else if (year === 2020) peakSolar = 1200;
    else if (year === 2021) peakSolar = 2800;
    else if (year === 2022) peakSolar = 6500;
    else if (year === 2023) peakSolar = 12000;
    else if (year === 2024) peakSolar = 15500;
    else if (year === 2025) peakSolar = 19000;
    else if (year === 2026) peakSolar = 23000;

    // Wind peak generation in MW by year
    let peakWind = 14000;
    if (year === 2018) peakWind = 7500;
    else if (year === 2019) peakWind = 9000;
    else if (year === 2020) peakWind = 10500;
    else if (year === 2021) peakWind = 11800;
    else if (year === 2022) peakWind = 13000;
    else if (year === 2023) peakWind = 14500;
    else if (year === 2024) peakWind = 15800;
    else if (year === 2025) peakWind = 17200;
    else if (year === 2026) peakWind = 18800;

    const list = [];
    for (let h = 0; h < 24; h++) {
      // Total load curve formulation
      let load = (68000 + 12000 * Math.sin((h - 9) * Math.PI / 12)) * scaleFactor * yearGrowthFactor + baseOffset;
      if (h >= 18 && h <= 21) load += 5000;

      // Solar output peaking at 12:00
      let solar = 0;
      if (h >= 6 && h <= 18) {
        solar = peakSolar * Math.sin((h - 6) * Math.PI / 12);
      }

      // Wind output (typically higher at night/morning and late afternoon)
      const wind = peakWind + 4000 * Math.sin((h - 22) * Math.PI / 10);

      // Thermal output (flexible base/peak load dispatcher)
      let thermal = 8000 * yearGrowthFactor;
      if (h >= 18 && h <= 22) {
        thermal += 4000;
      } else if (h < 6) {
        thermal -= 2000;
      }

      // Hydro output is the swing producer that balances total load after other resources
      let hydro = load - solar - wind - thermal;
      if (hydro < 6000) {
        hydro = 6000; // minimum must-run hydro requirements
      }

      // Readjust total load as the exact sum of parts
      const totalCarga = hydro + solar + wind + thermal;

      list.push({
        hora: h,
        hidraulica_mw: Math.round(hydro),
        termica_mw: Math.round(thermal),
        eolica_mw: Math.round(wind),
        solar_mw: Math.round(solar),
        carga_total_mw: Math.round(totalCarga)
      });
    }
    return list;
  }, [dessemData, parsedONSDate]);

  // Integrated Treemap Data (Proportional to MW load) - combining ONS Centralized and MMGD
  const treemapData = useMemo(() => {
    let ufv = 0;
    let eol = 0;
    let cgh = 0;
    let ute = 0;
    ufStats.forEach(s => {
      ufv += s.ufv_mw;
      eol += s.eol_mw;
      cgh += s.cgh_mw;
      ute += s.ute_mw;
    });

    const handleItemClick = (props: any) => {
      setSelectedTreemapItem(props);
      setShowTreemapDetailModal(true);
    };

    let baseData = [];

    if (mapView === 'live') {
      // Define change percentages based on timeframe (Finviz Style performance scale)
      const timeframeChanges = {
        '1h': {
          'ONS.HIDR': 0.45,
          'ONS.EOL': 3.80,
          'ONS.TERM': -5.12,
          'ONS.SOL': 8.40,
          'GD.SOLAR': 11.20,
          'GD.TERM': -1.80,
          'GD.CGH': 0.12,
          'GD.EOL': 2.30,
        },
        '1d': {
          'ONS.HIDR': -1.20,
          'ONS.EOL': 12.45,
          'ONS.TERM': 4.10,
          'ONS.SOL': -2.30,
          'GD.SOLAR': -3.50,
          'GD.TERM': 1.15,
          'GD.CGH': 0.85,
          'GD.EOL': 9.80,
        },
        '1w': {
          'ONS.HIDR': 0.00,
          'ONS.EOL': 0.15,
          'ONS.TERM': -0.10,
          'ONS.SOL': 0.42,
          'GD.SOLAR': 3.15,
          'GD.TERM': 0.05,
          'GD.CGH': 0.02,
          'GD.EOL': 0.80,
        }
      };

      const activeChanges = timeframeChanges[mapTimeframe] || timeframeChanges['1h'];

      baseData = [
        { name: 'Hidrelétrica Central (ONS SIN)', ticker: 'ONS.HIDR', size: 68000, category: 'Centralizada', change: activeChanges['ONS.HIDR'], fullName: 'Hidrelétrica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Eólica Central (ONS SIN)', ticker: 'ONS.EOL', size: 16000, category: 'Centralizada', change: activeChanges['ONS.EOL'], fullName: 'Eólica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Térmica Central (ONS SIN)', ticker: 'ONS.TERM', size: 10000, category: 'Centralizada', change: activeChanges['ONS.TERM'], fullName: 'Térmica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Solar Central (ONS SIN)', ticker: 'ONS.SOL', size: 8000, category: 'Centralizada', change: activeChanges['ONS.SOL'], fullName: 'Solar Central ONS', onDoubleClickItem: handleItemClick },
        
        { name: 'Solar MMGD', ticker: 'GD.SOLAR', size: Number(ufv.toFixed(0)), category: 'MMGD', change: activeChanges['GD.SOLAR'], fullName: 'Geração Distribuída Solar', onDoubleClickItem: handleItemClick },
        { name: 'Térmica MMGD', ticker: 'GD.TERM', size: Number(ute.toFixed(0)), category: 'MMGD', change: activeChanges['GD.TERM'], fullName: 'Geração Distribuída Térmica', onDoubleClickItem: handleItemClick },
        { name: 'Hidro CGH MMGD', ticker: 'GD.CGH', size: Number(cgh.toFixed(0)), category: 'MMGD', change: activeChanges['GD.CGH'], fullName: 'Geração Distribuída Central Hidrelétrica', onDoubleClickItem: handleItemClick },
        { name: 'Eólica MMGD', ticker: 'GD.EOL', size: Number(eol.toFixed(0)), category: 'MMGD', change: activeChanges['GD.EOL'], fullName: 'Geração Distribuída Eólica', onDoubleClickItem: handleItemClick },
      ];
    } else if (mapView === 'mensal') {
      baseData = [
        { name: 'Hidrelétrica Central (ONS SIN)', ticker: 'ONS.HIDR', size: 72000, category: 'Centralizada', change: 4.50, fullName: 'Hidrelétrica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Eólica Central (ONS SIN)', ticker: 'ONS.EOL', size: 18500, category: 'Centralizada', change: 15.60, fullName: 'Eólica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Térmica Central (ONS SIN)', ticker: 'ONS.TERM', size: 12000, category: 'Centralizada', change: 20.00, fullName: 'Térmica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Solar Central (ONS SIN)', ticker: 'ONS.SOL', size: 9200, category: 'Centralizada', change: 14.80, fullName: 'Solar Central ONS', onDoubleClickItem: handleItemClick },
        
        { name: 'Solar MMGD', ticker: 'GD.SOLAR', size: Number((ufv * 1.08).toFixed(0)), category: 'MMGD', change: 22.10, fullName: 'Geração Distribuída Solar', onDoubleClickItem: handleItemClick },
        { name: 'Térmica MMGD', ticker: 'GD.TERM', size: Number((ute * 1.02).toFixed(0)), category: 'MMGD', change: 2.50, fullName: 'Geração Distribuída Térmica', onDoubleClickItem: handleItemClick },
        { name: 'Hidro CGH MMGD', ticker: 'GD.CGH', size: Number((cgh * 0.95).toFixed(0)), category: 'MMGD', change: -8.40, fullName: 'Geração Distribuída Central Hidrelétrica', onDoubleClickItem: handleItemClick },
        { name: 'Eólica MMGD', ticker: 'GD.EOL', size: Number((eol * 1.05).toFixed(0)), category: 'MMGD', change: 10.50, fullName: 'Geração Distribuída Eólica', onDoubleClickItem: handleItemClick },
      ];
    } else if (mapView === 'anual') {
      baseData = [
        { name: 'Hidrelétrica Central (ONS SIN)', ticker: 'ONS.HIDR', size: 68000, category: 'Centralizada', change: 0.50, fullName: 'Hidrelétrica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Eólica Central (ONS SIN)', ticker: 'ONS.EOL', size: 19000, category: 'Centralizada', change: 18.40, fullName: 'Eólica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Térmica Central (ONS SIN)', ticker: 'ONS.TERM', size: 9800, category: 'Centralizada', change: -2.00, fullName: 'Térmica Central ONS', onDoubleClickItem: handleItemClick },
        { name: 'Solar Central (ONS SIN)', ticker: 'ONS.SOL', size: 11500, category: 'Centralizada', change: 28.00, fullName: 'Solar Central ONS', onDoubleClickItem: handleItemClick },
        
        { name: 'Solar MMGD', ticker: 'GD.SOLAR', size: Number((ufv * 1.28).toFixed(0)), category: 'MMGD', change: 38.20, fullName: 'Geração Distribuída Solar', onDoubleClickItem: handleItemClick },
        { name: 'Térmica MMGD', ticker: 'GD.TERM', size: Number((ute * 1.08).toFixed(0)), category: 'MMGD', change: 8.50, fullName: 'Geração Distribuída Térmica', onDoubleClickItem: handleItemClick },
        { name: 'Hidro CGH MMGD', ticker: 'GD.CGH', size: Number((cgh * 1.01).toFixed(0)), category: 'MMGD', change: 1.20, fullName: 'Geração Distribuída Central Hidrelétrica', onDoubleClickItem: handleItemClick },
        { name: 'Eólica MMGD', ticker: 'GD.EOL', size: Number((eol * 1.14).toFixed(0)), category: 'MMGD', change: 14.00, fullName: 'Geração Distribuída Eólica', onDoubleClickItem: handleItemClick },
      ];
    } else if (mapView === 'vision2030') {
      // BR Vision 2030 - Matriz de Potência para 20.000 kWh per Capita (Alvo Intermediário 2030)
      baseData = [
        { name: 'Solar MMGD', ticker: 'GD.SOLAR', size: 190000, category: 'MMGD', change: 35.40, fullName: 'Geração Distribuída Solar (Visão 2030)', onDoubleClickItem: handleItemClick },
        { name: 'Eólica Central (ONS SIN)', ticker: 'ONS.EOL', size: 120000, category: 'Centralizada', change: 24.10, fullName: 'Eólica Central ONS (Visão 2030)', onDoubleClickItem: handleItemClick },
        { name: 'Hidrelétrica Central (ONS SIN)', ticker: 'ONS.HIDR', size: 105000, category: 'Centralizada', change: 2.10, fullName: 'Hidrelétrica Central ONS (Visão 2030)', onDoubleClickItem: handleItemClick },
        { name: 'Solar Central (ONS SIN)', ticker: 'ONS.SOL', size: 95000, category: 'Centralizada', change: 31.80, fullName: 'Solar Central ONS (Visão 2030)', onDoubleClickItem: handleItemClick },
        { name: 'Térmica MMGD', ticker: 'GD.TERM', size: 25000, category: 'MMGD', change: 12.50, fullName: 'Geração Distribuída Térmica (Visão 2030)', onDoubleClickItem: handleItemClick },
        { name: 'Térmica Central (ONS SIN)', ticker: 'ONS.TERM', size: 18000, category: 'Centralizada', change: -1.50, fullName: 'Térmica Central ONS (Visão 2030)', onDoubleClickItem: handleItemClick },
        { name: 'Hidro CGH MMGD', ticker: 'GD.CGH', size: 8000, category: 'MMGD', change: 5.20, fullName: 'Geração Distribuída Central Hidrelétrica (Visão 2030)', onDoubleClickItem: handleItemClick },
        { name: 'Eólica MMGD', ticker: 'GD.EOL', size: 6000, category: 'MMGD', change: 18.00, fullName: 'Geração Distribuída Eólica (Visão 2030)', onDoubleClickItem: handleItemClick },
      ];
    } else { // 'vision2040'
      // BR Vision 3040/2040 potentia for 20000 kWh per capita consumption
      baseData = [
        { name: 'Solar MMGD', ticker: 'GD.SOLAR', size: 320000, category: 'MMGD', change: 19.50, fullName: 'Geração Distribuída Solar (Visão 2040)', onDoubleClickItem: handleItemClick },
        { name: 'Eólica Central (ONS SIN)', ticker: 'ONS.EOL', size: 240000, category: 'Centralizada', change: 21.30, fullName: 'Eólica Central ONS (Visão 2040)', onDoubleClickItem: handleItemClick },
        { name: 'Solar Central (ONS SIN)', ticker: 'ONS.SOL', size: 180000, category: 'Centralizada', change: 24.80, fullName: 'Solar Central ONS (Visão 2040)', onDoubleClickItem: handleItemClick },
        { name: 'Hidrelétrica Central (ONS SIN)', ticker: 'ONS.HIDR', size: 135000, category: 'Centralizada', change: 4.10, fullName: 'Hidrelétrica Central ONS (Visão 2040)', onDoubleClickItem: handleItemClick },
        { name: 'Térmica MMGD', ticker: 'GD.TERM', size: 45000, category: 'MMGD', change: 18.20, fullName: 'Geração Distribuída Térmica (Visão 2040)', onDoubleClickItem: handleItemClick },
        { name: 'Térmica Central (ONS SIN)', ticker: 'ONS.TERM', size: 35000, category: 'Centralizada', change: 8.90, fullName: 'Térmica Central ONS (Visão 2040)', onDoubleClickItem: handleItemClick },
        { name: 'Hidro CGH MMGD', ticker: 'GD.CGH', size: 15000, category: 'MMGD', change: 14.40, fullName: 'Geração Distribuída Central Hidrelétrica (Visão 2040)', onDoubleClickItem: handleItemClick },
        { name: 'Eólica MMGD', ticker: 'GD.EOL', size: 10000, category: 'MMGD', change: 12.50, fullName: 'Geração Distribuída Eólica (Visão 2040)', onDoubleClickItem: handleItemClick },
      ];
    }

    // Explicitly sort from largest size to smallest size, descending:
    // "maior da esquerda para direita, de cima para baixo"
    return [...baseData].sort((a, b) => b.size - a.size);
  }, [ufStats, mapTimeframe, mapView]);

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] font-sans antialiased relative selection:bg-cyan-500 selection:text-black">
      
      {/* Visual background ambient lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-yellow-900/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Real-time sync CSS confetti blast */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="w-full h-full relative">
            {[...Array(60)].map((_, i) => {
              const left = Math.random() * 100;
              const delay = Math.random() * 1.5;
              const size = Math.random() * 12 + 6;
              const color = ['#06b6d4', '#eab308', '#22c55e', '#3b82f6', '#f43f5e'][Math.floor(Math.random() * 5)];
              return (
                <div 
                  key={i} 
                  className="absolute animate-bounce"
                  style={{
                    left: `${left}%`,
                    top: `-20px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    borderRadius: '50%',
                    opacity: 0.8,
                    animation: `fall 3s linear infinite`,
                    animationDelay: `${delay}s`
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Styled inline animation keyframes */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

      {/* TOP HEADER BAR */}
      <header className="border-b border-slate-800 bg-[#0c1222]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-[#f1f5f9] to-[#94a3b8] bg-clip-text text-transparent">
                MEx Energy Data BR
              </h1>
              <p className="text-xs text-[#94a3b8] flex items-center gap-1.5 mt-0.5">
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                Pipeline ETL Canônico + SQLite + ONS Carga & DESSEM
              </p>
            </div>
          </div>

          {/* Database & system health stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="bg-[#11192e] border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-slate-400">Banco de Dados</div>
                <div className="font-semibold text-emerald-300">SQLite3 Simulado</div>
              </div>
            </div>

            {dbStats ? (
              <div className="bg-[#11192e] border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-slate-400">MMGD Ativos (MEx)</div>
                  <div className="font-bold text-cyan-300">{(dbStats.mmgd_mw / 1000).toFixed(2)} GW</div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse bg-slate-800 h-8 w-24 rounded-lg" />
            )}

            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              <span className="font-medium">Servidor Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* APP CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* TABS SELECTOR */}
        <div className="flex overflow-x-auto border-b border-slate-800 gap-2 pb-px mb-8 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all shrink-0 ${
              activeTab === 'dashboard' 
                ? 'border-cyan-500 text-white bg-cyan-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-4.5 h-4.5" />
            SIN GD + GC
          </button>
          
          <button
            onClick={() => setActiveTab('ons')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all shrink-0 ${
              activeTab === 'ons' 
                ? 'border-cyan-500 text-white bg-cyan-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Activity className="w-4.5 h-4.5" />
            ONS & DESSEM Operacional
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all shrink-0 ${
              activeTab === 'db' 
                ? 'border-cyan-500 text-white bg-cyan-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Database className="w-4.5 h-4.5" />
            Simulador de ETL e SQL
          </button>

          <button
            onClick={() => setActiveTab('calc')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all shrink-0 ${
              activeTab === 'calc' 
                ? 'border-cyan-500 text-white bg-cyan-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Calculator className="w-4.5 h-4.5" />
            Calculadora Lei 14.300
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all shrink-0 ${
              activeTab === 'ai' 
                ? 'border-cyan-500 text-white bg-cyan-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <MessageSquare className="w-4.5 h-4.5" />
            MEx Assistente AI
          </button>
        </div>

        {/* TAB CONTENTS */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD NACIONAL */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >

              {/* ONS Centralized and MMGD Proportional Load Treemap - Finviz Style */}
              <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 shadow-2xl">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5 pb-4 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 animate-pulse rounded-full" />
                      <h2 className="text-base font-extrabold text-white tracking-tight uppercase font-sans">
                        {mapView === 'live' && "Mapa de Calor de Capacidade & Performance (Estilo Finviz)"}
                        {mapView === 'mensal' && "Mapa de Calor - Sazonalidade & Despacho Mensal"}
                        {mapView === 'anual' && "Mapa de Calor - Expansão de Capacidade & Crescimento Anual"}
                        {mapView === 'vision2030' && "BR Vision 2030 - Matriz de Potência para 20.000 kWh per Capita"}
                        {mapView === 'vision2040' && "BR Vision 2040 - Matriz de Potência para 20.000 kWh per Capita"}
                      </h2>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-1 font-mono">
                      {mapView === 'live' && `Área total = Capacidade Operacional (MW) • Cor do Bloco = Variação de Despacho & Crescimento GD (st=${mapTimeframe})`}
                      {mapView === 'mensal' && "Área total = Capacidade Operacional Diária Média (MW) • Cor do Bloco = Desvio Percentual vs Média Sazonal de Longo Termo"}
                      {mapView === 'anual' && "Área total = Projeção de Capacidade Instalada Anual (MW) • Cor do Bloco = Taxa de Crescimento Anual YoY (%)"}
                      {mapView === 'vision2030' && "Área total = Potência Instalada Alvo 2030 (GW) • Cor do Bloco = CAGR (%) Projetado para Abundância Elétrica"}
                      {mapView === 'vision2040' && "Área total = Potência Instalada Necessária (GW) • Cor do Bloco = CAGR (%) Projetado para Abundância Elétrica"}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* View selector */}
                    <div className="flex flex-wrap items-center gap-1 bg-[#060911] border border-slate-800 rounded-lg p-1 font-mono text-[10px]">
                      <button
                        type="button"
                        onClick={() => setMapView('live')}
                        className={`px-3 py-1.5 rounded font-extrabold cursor-pointer transition-all ${
                          mapView === 'live'
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-md shadow-cyan-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        LIVE (DESSEM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapView('mensal')}
                        className={`px-3 py-1.5 rounded font-extrabold cursor-pointer transition-all ${
                          mapView === 'mensal'
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        MENSAL (Sazonal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapView('anual')}
                        className={`px-3 py-1.5 rounded font-extrabold cursor-pointer transition-all ${
                          mapView === 'anual'
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        ANUAL (YoY)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapView('vision2030')}
                        className={`px-3 py-1.5 rounded font-extrabold cursor-pointer transition-all ${
                          mapView === 'vision2030'
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-md shadow-yellow-500/15'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        ⚡ BR VISION 2030 (20k kWh)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapView('vision2040')}
                        className={`px-3 py-1.5 rounded font-extrabold cursor-pointer transition-all ${
                          mapView === 'vision2040'
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-md shadow-yellow-500/15'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        ⚡ BR VISION 2040 (20k kWh)
                      </button>
                    </div>

                    {/* Timeframe selector (st=1h, st=1d, st=1w) */}
                    {mapView === 'live' && (
                      <div className="flex items-center gap-1 bg-[#060911] border border-slate-800 rounded-lg p-1 shrink-0 font-mono text-[10px]">
                        <span className="text-slate-500 font-bold px-1.5 uppercase">st:</span>
                        <button
                          type="button"
                          onClick={() => setMapTimeframe('1h')}
                          className={`px-2.5 py-1 rounded font-extrabold cursor-pointer transition-all ${
                            mapTimeframe === '1h'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-black shadow-md'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          1H
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapTimeframe('1d')}
                          className={`px-2.5 py-1 rounded font-extrabold cursor-pointer transition-all ${
                            mapTimeframe === '1d'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-black shadow-md'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          1D
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapTimeframe('1w')}
                          className={`px-2.5 py-1 rounded font-extrabold cursor-pointer transition-all ${
                            mapTimeframe === '1w'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-black shadow-md'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          1W
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* BR Vision 2030 explanatory banner */}
                {mapView === 'vision2030' && (
                  <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-4 rounded-xl text-xs flex gap-3 shadow-lg">
                    <Sparkles className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold uppercase tracking-wider block mb-1">PROJEÇÃO BRASIL VISION 2030 (POTÊNCIA PARA 20.000 kWh CONSUMO PER CAPITA - ALVO INTERMEDIÁRIO)</span>
                      Para colocar o Brasil no rumo de uma matriz elétrica apta a fornecer <strong>20.000 kWh de consumo per capita</strong>, a meta para 2030 estabelece um parque instalatório intermediário de <strong>612 GW de potência instalada total</strong> (cerca de 3x a potência atual).
                      <div className="mt-2 text-slate-400 font-mono text-[10px]">
                        Cálculo de Base: Direcionamento focado em infraestrutura eletrointensiva de transição, com forte expansão da Geração Distribuída (Solar MMGD com 190 GW) e Eólica Centralizada (120 GW) com microrredes locais integradas.
                      </div>
                    </div>
                  </div>
                )}

                {/* BR Vision 2040 explanatory banner */}
                {mapView === 'vision2040' && (
                  <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-4 rounded-xl text-xs flex gap-3 shadow-lg">
                    <Sparkles className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold uppercase tracking-wider block mb-1">PROJEÇÃO BRASIL VISION 2040 (POTÊNCIA PARA 20.000 kWh CONSUMO PER CAPITA)</span>
                      Para que o Brasil atinja um padrão de vida de abundância eletrointensiva com <strong>20.000 kWh de consumo anual per capita</strong> (comparável aos países de maior PIB tecnológico do mundo, como Noruega, Islândia e hubs de datacenter avançados), o sistema elétrico nacional precisará escalar dos atuais ~210 GW para <strong>980 GW de potência instalada total</strong>.
                      <div className="mt-2 text-slate-400 font-mono text-[10px]">
                        Cálculo de Base: 215M habitantes × 20.000 kWh/ano = 4.300 TWh consumidos ao ano. Considerando o mix de fontes com capacidade média ponderada de 50%, requer ~980.000 MW operacionais, impulsionados pela expansão astronômica da Geração Distribuída (Solar MMGD com 320 GW) e Eólica Centralizada (240 GW).
                      </div>
                    </div>
                  </div>
                )}

                {/* Dense Treemap Container */}
                <div className="h-80 bg-[#05080e] border border-slate-900/80 p-0.5 rounded overflow-hidden relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      stroke="#05080e"
                      fill="#121722"
                      content={<CustomTreemapContent />}
                    >
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#0c1222', 
                          borderColor: '#1e293b', 
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px'
                        }}
                        formatter={(value, name, item) => {
                          const payload = item?.payload || {};
                          const displayChange = typeof payload.change === 'number' ? `${payload.change >= 0 ? '+' : ''}${payload.change.toFixed(2)}%` : '0.00%';
                          let metricName = `Variabilidade (${mapTimeframe})`;
                          if (mapView === 'mensal') metricName = "Desvio Sazonal";
                          if (mapView === 'anual') metricName = "Crescimento YoY";
                          if (mapView === 'vision2040') metricName = "CAGR Requerido (Até 2040)";

                          return [
                            <div className="space-y-1">
                              <div className="font-sans font-bold text-slate-100">{payload.fullName || name}</div>
                              <div className="text-yellow-400">Potência: <strong className="text-white">{Number(value).toLocaleString('pt-BR')} MW</strong></div>
                              <div className={payload.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{metricName}: <strong>{displayChange}</strong></div>
                              <div className="text-slate-400 text-[10px]">Segmento: {payload.category}</div>
                              <div className="text-cyan-400 text-[9px] mt-1 border-t border-slate-800/80 pt-1 flex items-center gap-1 animate-pulse font-mono">
                                🖱️ Clique duplo: todos componentes & detalhes
                              </div>
                            </div>,
                            null
                          ];
                        }}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
                
                {/* Finviz style gradient and label footer */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mt-5 pt-4 border-t border-slate-800/80 text-[10px] font-mono">
                  {/* Legend Map Tickers Mapping */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-slate-400 shrink-0">
                    <span className="font-extrabold text-slate-300">Filtro de Legendas:</span>
                    <span className="hover:text-white transition-colors">⚡ ONS.HIDR (Hidro SIN)</span>
                    <span className="hover:text-white transition-colors">💨 ONS.EOL (Eólica SIN)</span>
                    <span className="hover:text-white transition-colors">🔥 ONS.TERM (Térmica SIN)</span>
                    <span className="hover:text-white transition-colors">☀️ ONS.SOL (Solar SIN)</span>
                    <span className="hover:text-white transition-colors">☀️ GD.SOLAR (Geração Distribuída)</span>
                  </div>

                  {/* Finviz-style linear color bar */}
                  <div className="flex items-center gap-2 max-w-sm w-full md:w-64 self-end md:self-auto">
                    <span className="text-rose-500 font-extrabold shrink-0">-5%</span>
                    <div className="flex-1 h-3 rounded border border-slate-800 overflow-hidden flex bg-gradient-to-r from-[#ba0707] via-[#820b0b] via-[#4f0a0a] via-[#171e2e] via-[#004213] via-[#006c21] to-[#00a334]" />
                    <span className="text-emerald-500 font-extrabold shrink-0">+5%</span>
                  </div>
                </div>
              </div>

              {/* Interactive map and details row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-all duration-300" />
                  <div className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Capacidade Total MMGD</div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {dbStats ? `${(dbStats.mmgd_mw / 1000).toFixed(3)}` : '...'} <span className="text-sm font-semibold text-yellow-400">GW</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Conexões micro e minigeração</p>
                </div>

                <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all duration-300" />
                  <div className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Micro e Mini Usinas</div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {dbStats ? dbStats.mmgd_count.toLocaleString('pt-BR') : '...'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Sistemas conectados à rede</p>
                </div>

                <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300" />
                  <div className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Usinas Centralizadas (SIGA)</div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {dbStats ? `${(dbStats.siga_mw / 1000).toFixed(1)}` : '...'} <span className="text-sm font-semibold text-blue-400">GW</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Geração centralizada utility-scale</p>
                </div>

                <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
                  <div className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Geração Limpa (MEx Foco)</div>
                  <div className="text-3xl font-extrabold text-white mt-2">94.2%</div>
                  <p className="text-xs text-emerald-400 mt-1">Fontes renováveis integradas</p>
                </div>
              </div>

              {/* SECTION: INTEGRATED REAL-TIME DATA FLOW & ONS/DESSEM SYNCHRONIZER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                
                {/* ONS DESSEM Synchronizer & SQLite Array Generator */}
                <div className="lg:col-span-5 bg-[#0b0f19] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="border-b border-slate-800 pb-3 mb-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                          <Database className="w-4.5 h-4.5 text-cyan-400" />
                          Sincronizador ONS DESSEM & SQLite3
                        </h3>
                        <span className="bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono">
                          NTP Sincronizado
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Sincronização diária de dados legados do SIN. Geração de vetores JSON via SQLite real sem mock dinâmico de LLM.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Connection status pills */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-[#05080e] border border-slate-800 p-2.5 rounded-lg">
                          <span className="text-slate-500 block uppercase text-[8px] tracking-wider">Último Fechamento</span>
                          <span className="text-slate-200 font-bold">DESSEM diário ativo</span>
                        </div>
                        <div className="bg-[#05080e] border border-slate-800 p-2.5 rounded-lg">
                          <span className="text-slate-500 block uppercase text-[8px] tracking-wider">Origem das Tabelas</span>
                          <span className="text-yellow-400 font-bold">SQLite In-Memory</span>
                        </div>
                      </div>

                      {/* Manual Trigger & Logs */}
                      <div className="bg-[#05080e]/60 border border-slate-900 rounded-lg p-3.5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300">Atualização do Planejamento</span>
                          <button
                            type="button"
                            onClick={() => handleTriggerCron('ONS_PULL')}
                            disabled={triggeringCron}
                            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                          >
                            <RefreshCw className={`w-3 h-3 ${triggeringCron ? 'animate-spin' : ''}`} />
                            Sincronizar ONS DESSEM
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono space-y-1 bg-slate-950 p-2 rounded border border-slate-900 leading-normal">
                          <div><span className="text-emerald-400">● [INFO]</span> Conexão ativa com o barramento do ONS DESSEM.</div>
                          <div><span className="text-emerald-400">● [SUCCESS]</span> Carregado {ufStats.length} registros de estados no SQLite.</div>
                          {triggeringCron && <div><span className="text-cyan-400">● [PULLING]</span> Buscando novos vetores de carga diária...</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive JSON Vector Viewer */}
                  <div className="mt-5 border-t border-slate-800/80 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Vetores JSON Gerados pelo SQLite3</span>
                      <button
                        onClick={() => {
                          const codeText = jsonVectorTab === 'treemap' 
                            ? JSON.stringify(treemapData, null, 2)
                            : jsonVectorTab === 'uf_stats'
                              ? JSON.stringify(ufStats, null, 2)
                              : JSON.stringify(displayedDessemData, null, 2);
                          navigator.clipboard.writeText(codeText);
                          setJsonCopied(true);
                          setTimeout(() => setJsonCopied(false), 2000);
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
                      >
                        {jsonCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {jsonCopied ? 'Copiado!' : 'Copiar JSON'}
                      </button>
                    </div>

                    {/* Vector selector tabs */}
                    <div className="flex gap-1 mb-2 bg-[#05080e] p-1 rounded-lg border border-slate-900 text-[10px] font-mono">
                      <button
                        onClick={() => setJsonVectorTab('treemap')}
                        className={`flex-1 py-1 rounded text-center transition-all ${jsonVectorTab === 'treemap' ? 'bg-slate-800 text-white font-extrabold' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        treemapData []
                      </button>
                      <button
                        onClick={() => setJsonVectorTab('uf_stats')}
                        className={`flex-1 py-1 rounded text-center transition-all ${jsonVectorTab === 'uf_stats' ? 'bg-slate-800 text-white font-extrabold' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        ufStats []
                      </button>
                      <button
                        onClick={() => setJsonVectorTab('dessem')}
                        className={`flex-1 py-1 rounded text-center transition-all ${jsonVectorTab === 'dessem' ? 'bg-slate-800 text-white font-extrabold' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        dessemData []
                      </button>
                    </div>

                    {/* Code Display */}
                    <div className="bg-[#05080e] border border-slate-900 rounded-lg p-3 h-40 overflow-y-auto font-mono text-[9px] text-[#06b6d4] scrollbar-none select-all whitespace-pre-wrap leading-normal">
                      {jsonVectorTab === 'treemap' && JSON.stringify(treemapData, null, 2)}
                      {jsonVectorTab === 'uf_stats' && JSON.stringify(ufStats, null, 2)}
                      {jsonVectorTab === 'dessem' && JSON.stringify(displayedDessemData.slice(0, 8), null, 2)}
                    </div>
                  </div>
                </div>

                {/* Amplified Families Asset View */}
                <div className="lg:col-span-7 bg-[#0b0f19] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="border-b border-slate-800 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4.5 h-4.5 text-cyan-400" />
                          Ativos Ampliados por Família (SIN GD + GC)
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Cada família do SIN GD + GC ampliada mostrando seus ativos de geração correspondentes.
                        </p>
                      </div>
                      
                      {/* Search across sub-assets */}
                      <div className="relative shrink-0">
                        <input
                          type="text"
                          placeholder="Buscar ativos..."
                          value={assetFilter}
                          onChange={(e) => setAssetFilter(e.target.value)}
                          className="bg-[#11192e] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-500 font-sans w-full sm:w-44"
                        />
                        <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    {/* Scrollable list of families */}
                    <div className="space-y-2.5 max-h-[385px] overflow-y-auto pr-1">
                      {Object.keys(treemapDetailsLookup).map((ticker) => {
                        const family = treemapDetailsLookup[ticker];
                        const isExpanded = expandedFamily === ticker;
                        const combinedSize = family.subComponents.reduce((acc, c) => acc + c.size, 0);
                        const isGD = ticker.startsWith('GD');
                        
                        // Filter subcomponents
                        const filteredSubs = family.subComponents.filter(sub => 
                          sub.name.toLowerCase().includes(assetFilter.toLowerCase()) ||
                          sub.operator.toLowerCase().includes(assetFilter.toLowerCase()) ||
                          (sub.location && sub.location.toLowerCase().includes(assetFilter.toLowerCase()))
                        );

                        if (assetFilter && filteredSubs.length === 0) return null;

                        return (
                          <div 
                            key={ticker}
                            className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                              isExpanded 
                                ? 'border-cyan-500/50 bg-[#0c1222] shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                                : 'border-slate-800/80 bg-[#05080e]/40 hover:bg-[#0c1222]/50 hover:border-slate-700/60'
                            }`}
                          >
                            {/* Family Header */}
                            <div 
                              onClick={() => setExpandedFamily(isExpanded ? null : ticker)}
                              className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-lg shrink-0 ${isGD ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                                  {isGD ? <TrendingUp className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                                    <span className="truncate">{family.title}</span>
                                    <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded shrink-0">
                                      {ticker}
                                    </span>
                                  </h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className="text-xs font-black text-slate-300 font-mono">
                                    {combinedSize >= 1000 ? `${(combinedSize / 1000).toFixed(1)} GW` : `${combinedSize.toLocaleString('pt-BR')} MW`}
                                  </div>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-cyan-400' : ''}`} />
                              </div>
                            </div>

                            {/* Expanded Asset List */}
                            {isExpanded && (
                              <div className="border-t border-slate-800/80 bg-slate-950 p-3 space-y-3">
                                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{family.description}</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {filteredSubs.map((sub, sIdx) => (
                                    <div 
                                      key={sub.ticker || sIdx}
                                      className="bg-[#0b101d] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between transition-all"
                                    >
                                      <div>
                                        <div className="flex justify-between items-center gap-2 mb-1.5">
                                          <span className="text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-900/40 px-1.5 py-0.2 rounded font-bold uppercase">
                                            {sub.ticker}
                                          </span>
                                          <span className={`px-1.5 py-0.2 rounded-full font-bold text-[8px] font-mono ${
                                            sub.status === 'Operacional' || sub.status === 'Crescendo'
                                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                                              : 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                                          }`}>
                                            {sub.status}
                                          </span>
                                        </div>
                                        <h5 className="text-[11px] font-black text-white">{sub.name}</h5>
                                        <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">
                                          {sub.description}
                                        </p>
                                      </div>

                                      <div className="mt-2 pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                                        <div>
                                          <span className="text-slate-500 block text-[7px] uppercase">Capacidade</span>
                                          <span className="text-slate-200 font-extrabold text-[10px]">
                                            {sub.size >= 1000 ? `${(sub.size / 1000).toFixed(1)} GW` : `${sub.size.toLocaleString('pt-BR')} MW`}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500 block text-[7px] uppercase">Fatia</span>
                                          <span className="text-cyan-400 font-extrabold text-[10px]">{sub.share}</span>
                                        </div>
                                        <div className="col-span-2 mt-0.5">
                                          <span className="text-slate-300 truncate block text-[8px]">
                                            {sub.operator} • {sub.location}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive map and details row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* State selector grid map (D3 tree-like bento map style, highly polished and responsive) */}
                <div className="lg:col-span-8 bg-[#0c1222] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-cyan-400" />
                          Geração por Estado (UF)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Selecione uma UF para ver detalhes das faixas, fontes e conexões.</p>
                      </div>
                      <div className="bg-[#11192e] px-2.5 py-1 text-slate-400 font-semibold border border-slate-800 text-xs rounded-lg uppercase">
                        Brasil
                      </div>
                    </div>

                    {/* Interactive Grid Map representing Brazil */}
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 mt-6 mb-6">
                      {ufStats.map((ufItem) => {
                        const isSelected = selectedUF === ufItem.uf;
                        // Color intensity based on capacity
                        const mw = ufItem.mmgd_mw;
                        let bgClass = 'bg-slate-900/60 border-slate-800 hover:bg-slate-800';
                        if (mw > 3000) {
                          bgClass = isSelected ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-cyan-950/60 text-cyan-200 border-cyan-900 hover:bg-cyan-900';
                        } else if (mw > 1500) {
                          bgClass = isSelected ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-blue-950/60 text-blue-200 border-blue-900 hover:bg-blue-900';
                        } else if (mw > 500) {
                          bgClass = isSelected ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800';
                        }

                        return (
                          <button
                            key={ufItem.uf}
                            onClick={() => setSelectedUF(ufItem.uf)}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative group flex flex-col justify-between min-h-[70px] ${
                              isSelected ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold border-cyan-300 scale-105 shadow-lg shadow-cyan-500/20' : bgClass
                            }`}
                          >
                            <span className="text-sm tracking-wide block">{ufItem.uf}</span>
                            <span className={`text-[10px] font-medium block mt-1 ${isSelected ? 'text-black' : 'text-[#94a3b8]'}`}>
                              {mw > 1000 ? `${(mw / 1000).toFixed(1)} GW` : `${mw.toFixed(0)} MW`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top 10 UFs horizontal chart */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Top 10 UFs por Capacidade MMGD</h3>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={top10StatesByMW} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                          <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                          <YAxis dataKey="uf" type="category" stroke="#64748b" fontSize={10} width={25} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#1e293b', opacity: 0.3 }}
                            contentStyle={{ backgroundColor: '#0c1222', borderColor: '#334155', color: '#f8fafc' }}
                            formatter={(value) => [`${Number(value).toFixed(1)} MW`, 'Capacidade']}
                          />
                          <Bar dataKey="mmgd_mw" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={12}>
                            {top10StatesByMW.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.uf === selectedUF ? '#eab308' : '#06b6d4'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* State focus card details */}
                <div className="lg:col-span-4 bg-[#0c1222] border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between">
                  {selectedUFDetails && (
                    <>
                      <div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                          <div>
                            <h3 className="text-xl font-extrabold text-white">{selectedUFDetails.uf_name}</h3>
                            <span className="text-xs text-slate-400">Dados Consolidados ANEEL</span>
                          </div>
                          <span className="bg-cyan-500/10 text-cyan-400 font-bold px-3 py-1 text-sm border border-cyan-500/20 rounded-xl">
                            {selectedUFDetails.uf}
                          </span>
                        </div>

                        {/* Stats list */}
                        <div className="space-y-3.5 mt-5">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Total Conexões MMGD:</span>
                            <span className="font-bold text-white">{selectedUFDetails.mmgd_count.toLocaleString('pt-BR')}</span>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Capacidade Total MMGD:</span>
                            <span className="font-bold text-yellow-400">{selectedUFDetails.mmgd_mw.toLocaleString('pt-BR')} MW</span>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Conexões Utility (SIGA):</span>
                            <span className="font-bold text-white">{selectedUFDetails.siga_count.toLocaleString('pt-BR')}</span>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Geração Centralizada:</span>
                            <span className="font-bold text-blue-400">{selectedUFDetails.siga_mw.toLocaleString('pt-BR')} MW</span>
                          </div>
                        </div>

                        {/* Source breakdown chart of selected State */}
                        <div className="mt-6">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Fontes de Geração Distribuída</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800/60">
                              <span className="text-[10px] text-yellow-400 block font-semibold">☀️ Solar UFV</span>
                              <span className="text-sm font-bold text-white mt-1 block">{selectedUFDetails.ufv_mw.toFixed(1)} MW</span>
                            </div>
                            <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800/60">
                              <span className="text-[10px] text-cyan-400 block font-semibold">💨 Eólica EOL</span>
                              <span className="text-sm font-bold text-white mt-1 block">{selectedUFDetails.eol_mw.toFixed(1)} MW</span>
                            </div>
                            <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800/60">
                              <span className="text-[10px] text-blue-400 block font-semibold">💧 Hidro CGH</span>
                              <span className="text-sm font-bold text-white mt-1 block">{selectedUFDetails.cgh_mw.toFixed(1)} MW</span>
                            </div>
                            <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800/60">
                              <span className="text-[10px] text-orange-400 block font-semibold">🔥 Térmica UTE</span>
                              <span className="text-sm font-bold text-white mt-1 block">{selectedUFDetails.ute_mw.toFixed(1)} MW</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#11192e] border border-slate-800 p-4 rounded-xl mt-4">
                        <div className="flex gap-2 items-start">
                          <Sparkles className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-slate-300 leading-relaxed">
                            <strong>MEx Analítico:</strong> {selectedUFDetails.uf_name} lidera em potência de micro e minigeração solar. Oferece alta viabilidade para soluções BESS devido à tarifa regional e sobrecarga de transformadores comerciais.
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setActiveTab('ai');
                            handleSendChat(undefined, `Como está o mercado de BESS industrial e GD em ${selectedUFDetails.uf_name}?`);
                          }}
                          className="mt-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group cursor-pointer"
                        >
                          Consultar no Chat MEx
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* National Pie Source Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Layers className="w-4.5 h-4.5 text-cyan-400" />
                    Distribuição por Fonte Geração Distribuída (Brasil)
                  </h3>
                  <div className="h-64 flex flex-col sm:flex-row justify-center items-center gap-6">
                    <div className="w-full h-44 sm:h-full sm:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={nationalSourceAggregation}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {nationalSourceAggregation.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0c1222', borderColor: '#334155', color: '#f8fafc' }}
                            formatter={(value) => [`${Number(value).toLocaleString('pt-BR')} MW`, 'Total']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-1/2">
                      {nationalSourceAggregation.map((src) => (
                        <div key={src.name} className="flex justify-between items-center text-xs bg-[#11192e] px-3 py-2 rounded-lg border border-slate-800/40">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: src.color }} />
                            <span className="text-slate-300 font-medium">{src.name}</span>
                          </div>
                          <span className="font-bold text-white">{src.value.toLocaleString('pt-BR')} MW</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Faixa estratégica MEx distribution (Bento lists) */}
                <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <BarChart3 className="w-4.5 h-4.5 text-cyan-400" />
                      Régua de Faixas de Interesse MEx Energia
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Mapeamento estratégico de mercado para BESS Modular e 800VDC.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-yellow-400 font-bold">INDUSTRIAL_ALVO (1 MW – 5 MW)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Alvo primário: mini-datacenters, HVAC, barramento 800VDC nativo</div>
                      </div>
                      <span className="bg-yellow-500/10 text-yellow-400 text-xs font-bold px-2.5 py-1 border border-yellow-500/20 rounded-lg">Prioridade Alta</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-cyan-400 font-bold">MINIGERACAO_ALVO (75 kW – 1000 kW)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Zona de entrada: comércio/indústria média, BESS modular</div>
                      </div>
                      <span className="bg-cyan-500/10 text-cyan-400 text-xs font-bold px-2.5 py-1 border border-cyan-500/20 rounded-lg">Prioridade Média</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-slate-300 font-bold">COMERCIAL_PEQUENO (15 kW – 75 kW)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">GD tradicional de baixo ticket, pouca margem BESS</div>
                      </div>
                      <span className="bg-slate-800 text-slate-400 text-xs font-bold px-2.5 py-1 rounded-lg">Baixa Prioridade</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ONS & DESSEM OPERACIONAL */}
          {activeTab === 'ons' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {loadingONS ? (
                <div className="text-center py-24">
                  <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-slate-400">Carregando dados operacionais do ONS...</p>
                </div>
              ) : (
                <>
                  {/* ONS Intro bar */}
                  <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Operação em Tempo Real (ONS)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Acompanhamento da carga horária e despacho do Balanço DESSEM brasileiro.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="bg-slate-900 border border-slate-800 text-[#e2e8f0] text-xs font-semibold px-3 py-1.5 rounded-lg">
                        Atualização: Diária
                      </span>
                      <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        Despacho DESSEM Ativo
                      </span>
                    </div>
                  </div>

                  {/* 1. ONS Load Curve (Line Chart) */}
                  <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5">
                    <div className="mb-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          Curva de Demanda de Carga ONS ({
                            onsTimeframe === 'diario' ? 'Semi-horária' :
                            onsTimeframe === 'mensal' ? 'Diária' :
                            onsTimeframe === 'anual' ? 'Mensal' : 'Série Máxima Histórica'
                          })
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {
                            onsTimeframe === 'diario' ? 'Acompanhamento da carga horária verificada contra programada pelo operador nacional.' :
                            onsTimeframe === 'mensal' ? 'Comportamento da carga diária média ao longo do mês selecionado.' :
                            onsTimeframe === 'anual' ? 'Evolução sazonal da demanda média mensal ao longo do ano selecionado.' :
                            'Pico máximo histórico de potência instantânea atingido no SIN por ano (MW).'
                          }
                        </p>
                      </div>

                      {/* Timeframe pill selector */}
                      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start xl:self-auto">
                        <button
                          onClick={() => setOnsTimeframe('diario')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            onsTimeframe === 'diario'
                              ? 'bg-cyan-500 text-black shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Diário
                        </button>
                        <button
                          onClick={() => setOnsTimeframe('mensal')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            onsTimeframe === 'mensal'
                              ? 'bg-cyan-500 text-black shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Mensal
                        </button>
                        <button
                          onClick={() => setOnsTimeframe('anual')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            onsTimeframe === 'anual'
                              ? 'bg-cyan-500 text-black shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Anual
                        </button>
                        <button
                          onClick={() => setOnsTimeframe('maximo')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            onsTimeframe === 'maximo'
                              ? 'bg-cyan-500 text-black shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Máximo
                        </button>
                      </div>
                    </div>

                    {/* Controls Row: Date Query, Quick Actions & Toggle */}
                    <div className="mb-6 bg-slate-950/50 border border-slate-800/60 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        {onsTimeframe !== 'maximo' && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              Consulta por Data
                              <span className="text-[9px] text-cyan-400 font-mono normal-case">(Disponibilidade real: 2018 a 2026)</span>
                            </span>
                            <div className="relative">
                              <Calendar className="w-3.5 h-3.5 text-cyan-500 absolute left-3 top-2.5 pointer-events-none" />
                              <input
                                type="date"
                                min="2018-01-01"
                                max="2026-12-31"
                                value={selectedONSDate}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (val) {
                                    const y = parseInt(val.split('-')[0], 10);
                                    if (y < 2018) val = '2018-01-01';
                                    if (y > 2026) val = '2026-12-31';
                                  }
                                  setSelectedONSDate(val);
                                }}
                                className="bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 font-mono transition-all focus:outline-none cursor-pointer"
                              />
                            </div>
                          </div>
                        )}

                        {/* Quick teleport buttons */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Atalhos</span>
                          <div className="flex gap-1.5 py-1">
                            <button
                              onClick={() => {
                                setSelectedONSDate('2023-08-15');
                                setOnsTimeframe('diario');
                                setOnsViewMode('apagao');
                              }}
                              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-all active:scale-95"
                            >
                              Apagão (15/08/23)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedONSDate('2026-07-14');
                                if (onsTimeframe === 'maximo') setOnsTimeframe('diario');
                              }}
                              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-all active:scale-95"
                            >
                              Tempo Real (Hoje)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Blackout status simulator only in Daily mode with 15/08/2023 selected */}
                      {onsTimeframe === 'diario' && (
                        <div className="flex flex-col items-end gap-1.5 shrink-0 w-full md:w-auto">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Simulador de Instabilidade</span>
                          <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 w-full md:w-auto">
                            {selectedONSDate === '2023-08-15' ? (
                              <>
                                <button
                                  onClick={() => setOnsViewMode('normal')}
                                  className={`flex-1 md:flex-none px-3 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                                    onsViewMode === 'normal'
                                      ? 'bg-cyan-500 text-black shadow'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Carga Regular
                                </button>
                                <button
                                  onClick={() => setOnsViewMode('apagao')}
                                  className={`flex-1 md:flex-none px-3 py-1 text-[11px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                    onsViewMode === 'apagao'
                                      ? 'bg-rose-500 text-white shadow animate-pulse'
                                      : 'text-slate-400 hover:text-rose-400'
                                  }`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  Queda SIN (15/08)
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedONSDate('2023-08-15');
                                  setOnsTimeframe('diario');
                                  setOnsViewMode('apagao');
                                }}
                                className="px-3 py-1 text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-all w-full justify-center"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                Carregar Data do Apagão para Simular
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Monthly info message */}
                      {onsTimeframe === 'mensal' && (
                        <div className="text-right hidden md:block text-slate-400 text-[11px]">
                          Mostrando dias de <strong className="text-cyan-400">{parsedONSDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong>.
                        </div>
                      )}

                      {/* Annual info message */}
                      {onsTimeframe === 'anual' && (
                        <div className="text-right hidden md:block text-slate-400 text-[11px]">
                          Mostrando perfil sazonal do ano de <strong className="text-cyan-400">{parsedONSDate.getFullYear()}</strong>.
                        </div>
                      )}

                      {/* Maximo info message */}
                      {onsTimeframe === 'maximo' && (
                        <div className="text-right hidden md:block text-slate-400 text-[11px]">
                          Picos de potência instantânea do SIN brasileira.
                        </div>
                      )}
                    </div>

                    {/* Chart area */}
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={displayedCargaData} 
                          margin={{ top: 15, right: 15, left: 15, bottom: 5 }}
                          onClick={(state: any) => {
                            // If mensal timeframe, user can click a day to jump to daily view!
                            if (onsTimeframe === 'mensal' && state && state.activePayload && state.activePayload[0]) {
                              const clickedItem = state.activePayload[0].payload;
                              if (clickedItem && clickedItem.fullDateStr) {
                                setSelectedONSDate(clickedItem.fullDateStr);
                                setOnsTimeframe('diario');
                              }
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis 
                            dataKey={onsTimeframe === 'diario' ? 'hora' : 'label'} 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            domain={
                              onsTimeframe === 'diario' ? ['dataMin - 3000', 'dataMax + 1000'] :
                              onsTimeframe === 'mensal' ? ['dataMin - 5000', 'dataMax + 2000'] :
                              onsTimeframe === 'anual' ? ['dataMin - 6000', 'dataMax + 3000'] :
                              ['dataMin - 8000', 'dataMax + 2000']
                            }
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0c1222', borderColor: '#334155', color: '#f8fafc' }}
                            formatter={(value) => [`${Number(value).toLocaleString('pt-BR')} MW`, '']}
                            labelFormatter={(label) => {
                              if (onsTimeframe === 'diario') return `Hora: ${label}`;
                              if (onsTimeframe === 'mensal') return `Dia ${label} de ${parsedONSDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
                              if (onsTimeframe === 'anual') return `Mês: ${label}/${parsedONSDate.getFullYear()}`;
                              return `Ano: ${label}`;
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="verificada_mw" 
                            name={onsTimeframe === 'maximo' ? "Demanda de Pico (MW)" : "Carga Verificada (MW)"} 
                            stroke={
                              onsTimeframe === 'diario' && selectedONSDate === '2023-08-15' && onsViewMode === 'apagao' 
                                ? '#ef4444' 
                                : '#22c55e'
                            } 
                            strokeWidth={2.5} 
                            dot={onsTimeframe !== 'diario'} 
                            activeDot={{ r: 6 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="programada_mw" 
                            name={onsTimeframe === 'maximo' ? "Previsão ONS Histórica (MW)" : "Carga Programada (MW)"} 
                            stroke="#94a3b8" 
                            strokeDasharray="5 5" 
                            strokeWidth={1.5} 
                            dot={false} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Informative Sub-Captions and Interactive elements */}
                    <div className="mt-4 p-3 bg-slate-950/40 rounded-lg border border-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-400">
                      <div>
                        {onsTimeframe === 'diario' && (
                          <span>
                            Exibindo dados para <strong className="text-white font-mono">{parsedONSDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                            {parsedONSDate.getDay() === 0 || parsedONSDate.getDay() === 6 ? ' (Fim de semana: demanda industrial reduzida)' : ' (Dia útil comercial standard)'}
                          </span>
                        )}
                        {onsTimeframe === 'mensal' && (
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Dica de Interação: <strong>Clique em qualquer ponto do gráfico</strong> para detalhar a curva semi-horária daquele dia.</span>
                          </span>
                        )}
                        {onsTimeframe === 'anual' && (
                          <span>Exibindo médias mensais. Os meses de verão (Jan-Mar, Nov-Dez) apresentam picos extremos de ar-condicionado.</span>
                        )}
                        {onsTimeframe === 'maximo' && (
                          <span>Série de recordes absolutos do SIN. A expansão acelerada de microgeração solar atenua a carga verificada líquida durante o dia.</span>
                        )}
                      </div>
                      
                      {onsTimeframe === 'maximo' && (
                        <div className="text-amber-400 font-mono text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          Pico Histórico Máximo: 102.470 MW (Março/2024)
                        </div>
                      )}
                    </div>

                    {onsViewMode === 'apagao' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 border border-rose-500/20 bg-rose-950/10 rounded-xl p-5 space-y-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                              Relatório Operacional: Apagão de Referência no SIN
                              <span className="text-[10px] bg-rose-500/20 text-rose-400 font-mono px-2 py-0.5 rounded-full font-bold">
                                15/08/2023 08:30
                              </span>
                            </h4>
                            <p className="text-xs text-rose-300/80 mt-1">
                              Análise técnica do evento de desconexão em massa e rebaixamento severo da curva de carga verificado no Sistema Interligado Nacional (SIN).
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 space-y-1.5">
                            <span className="text-[10px] text-rose-400 font-mono uppercase tracking-wider block font-bold">Causa Raiz</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              O evento iniciou-se às <strong>08:30:13 BRT</strong> com a abertura automática da linha de transmissão de <strong>500 kV Quixadá-Fortaleza II (CE)</strong> no Nordeste. A perturbação ocorreu sob condições de alta exportação de energia renovável (eólica e solar) da região para o resto do país. Dispositivos de controle de tensão e reguladores de velocidade de geradores renováveis não responderam de forma estável, gerando uma oscilação generalizada de frequência (perda de estabilidade angular) em cascata.
                            </p>
                          </div>

                          <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 space-y-1.5">
                            <span className="text-[10px] text-rose-400 font-mono uppercase tracking-wider block font-bold">Consequência & Efeito (Causa-Efeito)</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              Para mitigar o colapso físico e colapso de frequência da rede elétrica, foi acionada a atuação automática do <strong>ERAC (Esquema Regional de Alívio de Carga)</strong>. Isso resultou na desconexão instantânea de cerca de <strong>19.000 MW de demanda</strong> (25% da carga do país na hora), provocando desligamentos automáticos em 25 estados e Distrito Federal. Metrôs paralisaram, semáforos falharam e serviços vitais caíram. A recomposição total do SIN estendeu-se por cerca de 6 horas.
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-rose-950/30 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-slate-400 font-mono">
                          <div>
                            Métrica no Gráfico: Queda abrupta de <span className="text-rose-400 font-bold">-26.0%</span> na Carga Verificada às 08:30 AM
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab('ai');
                              setTimeout(() => {
                                handleSendChat(undefined, "Quais foram as lições aprendidas e as novas diretrizes regulatórias e tecnológicas adotadas pelo ONS após o apagão nacional de 15 de agosto de 2023? Fale sobre o comportamento de geradores eólicos/solares.");
                              }, 100);
                            }}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Aprofundar via Chat de IA
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* 2. DESSEM Balance stacked area chart */}
                  <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Balanço Energético DESSEM (Hourly Dispatch)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Previsão de despacho físico de potência do SIN por tipo de fonte.</p>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={displayedDessemData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="hora" stroke="#64748b" fontSize={10} tickFormatter={(h) => `${h}h`} />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#0c1222', borderColor: '#334155', color: '#f8fafc' }} />
                          <Legend />
                          <Area type="monotone" dataKey="hidraulica_mw" name="Hidro" stackId="1" stroke="#2563eb" fill="#2563eb" opacity={0.8} />
                          <Area type="monotone" dataKey="termica_mw" name="Térmica" stackId="1" stroke="#f97316" fill="#f97316" opacity={0.8} />
                          <Area type="monotone" dataKey="eolica_mw" name="Eólica" stackId="1" stroke="#06b6d4" fill="#06b6d4" opacity={0.8} />
                          <Area type="monotone" dataKey="solar_mw" name="Solar" stackId="1" stroke="#eab308" fill="#eab308" opacity={0.8} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TAB 3: SIMULADOR DE ETL E SQL (DATABASE) */}
          {activeTab === 'db' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left pane: New raw record sync pipeline (The ETL trigger) */}
                <div className="lg:col-span-4 bg-[#0c1222] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="border-b border-slate-800 pb-3 mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4.5 h-4.5 text-cyan-400" />
                        Sincronizador ETL MMGD
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Cadastre um empreendimento bruto para rodar as regras de classificação e obter o canônico checksum hash.</p>
                    </div>

                    <form onSubmit={handleSyncRecord} className="space-y-3.5">
                      <div>
                        <label className="text-xs text-slate-400 block font-semibold mb-1">Nome do Empreendimento</label>
                        <input 
                          type="text" 
                          required
                          value={newRecord.nom_empreendimento}
                          onChange={(e) => setNewRecord({...newRecord, nom_empreendimento: e.target.value})}
                          className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block font-semibold mb-1">Cód GD (ANEEL)</label>
                          <input 
                            type="text" 
                            required
                            value={newRecord.cod_geracao_distribuida}
                            onChange={(e) => setNewRecord({...newRecord, cod_geracao_distribuida: e.target.value})}
                            className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block font-semibold mb-1">Sigla UF</label>
                          <input 
                            type="text" 
                            required
                            maxLength={2}
                            value={newRecord.sig_uf}
                            onChange={(e) => setNewRecord({...newRecord, sig_uf: e.target.value.toUpperCase()})}
                            className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block font-semibold mb-1">Potência (kW)</label>
                          <input 
                            type="number" 
                            required
                            min={1}
                            value={newRecord.potencia_instalada_kw}
                            onChange={(e) => setNewRecord({...newRecord, potencia_instalada_kw: Number(e.target.value)})}
                            className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block font-semibold mb-1">Cidade</label>
                          <input 
                            type="text" 
                            required
                            value={newRecord.nom_municipio}
                            onChange={(e) => setNewRecord({...newRecord, nom_municipio: e.target.value})}
                            className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block font-semibold mb-1">Fonte Bruta ANEEL</label>
                        <select 
                          value={newRecord.fonte_bruta}
                          onChange={(e) => setNewRecord({...newRecord, fonte_bruta: e.target.value})}
                          className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Solar Fotovoltaica (UFV)">Solar Fotovoltaica (UFV)</option>
                          <option value="Central Geradora Hidrelétrica (CGH)">Central Geradora Hidrelétrica (CGH)</option>
                          <option value="Energia Eólica (EOL)">Energia Eólica (EOL)</option>
                          <option value="Usina Termelétrica (UTE) Biogás">Usina Termelétrica (UTE) Biogás</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block font-semibold mb-1">Modalidade ANEEL</label>
                        <select 
                          value={newRecord.modalidade_bruta}
                          onChange={(e) => setNewRecord({...newRecord, modalidade_bruta: e.target.value})}
                          className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Autoconsumo Remoto">Autoconsumo Remoto</option>
                          <option value="Geração na Própria UC">Geração na Própria UC</option>
                          <option value="Geração Compartilhada">Geração Compartilhada</option>
                          <option value="Múltiplas Unidades Consumidoras">Múltiplas Unidades Consumidoras</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={syncing}
                        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold p-2.5 rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Executando ETL...' : 'Executar Sincronização / ETL'}
                      </button>
                    </form>
                  </div>

                  {/* Feedback sync success / error */}
                  <div className="mt-4">
                    {syncSuccessMessage && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs flex gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <div>{syncSuccessMessage}</div>
                      </div>
                    )}
                    {syncErrorMessage && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs flex gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>{syncErrorMessage}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right pane: Interactive SQL console & Schema */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* SQL Terminal Console */}
                  <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-5">
                    <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Database className="w-4.5 h-4.5 text-cyan-400" />
                          Terminal SQL SQLite3
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Consulte as tabelas mmgd_raw (landing zone) e mmgd_fato (estruturado).</p>
                      </div>
                      <div className="text-xs bg-[#11192e] px-2.5 py-1 text-slate-400 rounded border border-slate-800 font-mono">
                        sqlite&gt;
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Query Editor Box */}
                      <div className="relative">
                        <textarea
                          value={sqlQuery}
                          onChange={(e) => setSqlQuery(e.target.value)}
                          className="w-full bg-[#11192e] font-mono border border-slate-800 rounded-lg p-3 text-sm text-cyan-300 focus:outline-none focus:border-cyan-500 min-h-[80px]"
                          placeholder="SELECT * FROM mmgd_fato LIMIT 5"
                        />
                        <button
                          onClick={() => executeSQL(sqlQuery)}
                          disabled={runningSQL}
                          className="absolute bottom-4 right-4 bg-cyan-500 text-black font-bold px-3 py-1.5 rounded text-xs transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-black" />
                          {runningSQL ? 'Processando...' : 'Executar Query'}
                        </button>
                      </div>

                      {/* SQL Query suggestions shortcut */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button 
                          onClick={() => { setSqlQuery("SELECT * FROM mmgd_fato WHERE sig_uf = 'MG'"); executeSQL("SELECT * FROM mmgd_fato WHERE sig_uf = 'MG'"); }}
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg font-mono cursor-pointer"
                        >
                          Fatos de MG
                        </button>
                        <button 
                          onClick={() => { setSqlQuery("SELECT * FROM mmgd_raw WHERE sig_uf = 'SP' LIMIT 3"); executeSQL("SELECT * FROM mmgd_raw WHERE sig_uf = 'SP' LIMIT 3"); }}
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg font-mono cursor-pointer"
                        >
                          Landing de SP
                        </button>
                        <button 
                          onClick={() => { setSqlQuery("SELECT * FROM mmgd_fato WHERE is_outlier = 1"); executeSQL("SELECT * FROM mmgd_fato WHERE is_outlier = 1"); }}
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg font-mono cursor-pointer"
                        >
                          Buscar Outliers
                        </button>
                        <button 
                          onClick={() => { setSqlQuery("SELECT count(*), sum(potencia_kw) FROM mmgd_fato"); executeSQL("SELECT count(*), sum(potencia_kw) FROM mmgd_fato"); }}
                          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg font-mono cursor-pointer"
                        >
                          Totalização
                        </button>
                      </div>

                      {/* Query Results Console Display */}
                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#0c1222]">
                        {sqlError && (
                          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs font-mono">
                            ERROR: {sqlError}
                          </div>
                        )}

                        {sqlResult ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-[#11192e] border-b border-slate-800 font-mono text-slate-300">
                                  {sqlResult.columns.map((col: string) => (
                                    <th key={col} className="p-2.5 font-bold uppercase">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 font-mono">
                                {sqlResult.rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={sqlResult.columns.length} className="p-4 text-center text-slate-400">
                                      Nenhum registro retornado.
                                    </td>
                                  </tr>
                                ) : (
                                  sqlResult.rows.map((row: any, i: number) => (
                                    <tr key={row.id || i} className="hover:bg-slate-900/40 text-slate-300">
                                      {sqlResult.columns.map((col: string) => (
                                        <td key={col} className="p-2.5 whitespace-nowrap">
                                          {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-xs text-slate-400 font-mono">
                            Execute uma consulta SQL para visualizar os registros persistidos.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schema Info Bento Card */}
                  <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Definição do Esquema de Tabelas (DCD / DDL)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-[#11192e] p-3.5 rounded-xl border border-slate-800">
                        <span className="font-bold text-yellow-400 font-mono">mmgd_raw</span>
                        <p className="text-slate-400 mt-1">Dados cruas extraídos da ANEEL MMGD. Landing zone.</p>
                        <div className="text-[10px] text-slate-500 font-mono mt-2">
                          Colunas: nom_empreendimento, cod_geracao_distribuida, potencia_instalada_kw, fonte_bruta, modalidade_bruta
                        </div>
                      </div>

                      <div className="bg-[#11192e] p-3.5 rounded-xl border border-slate-800">
                        <span className="font-bold text-cyan-400 font-mono">mmgd_fato</span>
                        <p className="text-slate-400 mt-1">Fato estruturado e saneado pelo ETL. Contém o canônico HASH único.</p>
                        <div className="text-[10px] text-slate-500 font-mono mt-2">
                          Colunas: id, potencia_kw, fonte_norm, modalidade_norm, faixa_regulatoria, is_outlier, hash, data_conexao
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: EVIDENCE AUDIT & CRON AUTOMATION */}
              <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-5 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                      Auditoria de Evidências, RAM e Sincronização de Horário (A23 / Brasil)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitoramento em tempo real do consumo físico, arquivos persistidos, offset de relógio do dispositivo A23 e disparo de Cron.
                    </p>
                  </div>
                  <button
                    onClick={fetchDiagnostics}
                    disabled={loadingDiagnostics}
                    className="bg-[#11192e] hover:bg-[#1a2542] border border-slate-700 text-slate-300 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
                    Atualizar Auditoria
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: RAM & Heap */}
                  <div className="bg-[#0c1222] border border-slate-800/80 p-4 rounded-xl">
                    <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider block mb-1">Consumo de Memória RAM</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      {diagnostics?.ram_consumption ? `${diagnostics.ram_consumption.heap_used_mb.toFixed(1)}` : '...'} <span className="text-xs font-normal text-slate-400">MB</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${diagnostics?.ram_consumption ? Math.min(100, (diagnostics.ram_consumption.heap_used_mb / 250) * 100) : 15}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5 font-mono">
                      <span>Heap Utilizado</span>
                      <span>Max Container limit: 512MB</span>
                    </div>
                  </div>

                  {/* Card 2: Database Size */}
                  <div className="bg-[#0c1222] border border-slate-800/80 p-4 rounded-xl">
                    <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider block mb-1">Tamanho & Tipo de Banco</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      {diagnostics?.database ? `${diagnostics.database.database_size_kb.toFixed(1)}` : '...'} <span className="text-xs font-normal text-slate-400">KB</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-2 block">
                      Engine: <strong className="text-yellow-400">{diagnostics?.database?.engine || 'SQLite3 Simulada'}</strong>
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                      <span>Usinas Fato Gravadas:</span>
                      <span>{diagnostics?.database ? diagnostics.database.fato_records_count : '...'} rows</span>
                    </div>
                  </div>

                  {/* Card 3: Clock Sync Device A23 */}
                  <div className="bg-[#0c1222] border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block mb-1">Sincronia Relógio A23 / Brasil</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm font-bold text-white">Sincronizado (NTP)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                        Servidor: <span className="text-[#a5f3fc]">{diagnostics?.time_sync ? diagnostics.time_sync.brazil_current_time : '...'}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Dispositivo A23: <span className="text-emerald-400">{new Date().toLocaleTimeString('pt-BR')}</span>
                      </p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 rounded px-1.5 py-0.5 text-[9px] w-max mt-2">
                      Offset &lt; 0.05s (a.ntp.br)
                    </span>
                  </div>

                  {/* Card 4: Cron triggers */}
                  <div className="bg-[#0c1222] border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-[#f97316] font-extrabold uppercase tracking-wider block mb-1">Automação Cron Horária</span>
                      <div className="text-xs text-slate-300 font-mono">
                        Status: <strong className="text-emerald-400">Ativo (Auto)</strong>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-1">
                        Agendado: <span className="text-yellow-400">{diagnostics?.cron_automation?.active_schedules?.[0]?.cron || '0 * * * *'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                      <button
                        type="button"
                        onClick={() => handleTriggerCron('ONS_PULL')}
                        disabled={triggeringCron}
                        className="bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-white font-bold p-1 rounded text-[9px] cursor-pointer transition-all disabled:opacity-50"
                      >
                        Puxar ONS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerCron('MMGD_SYNC')}
                        disabled={triggeringCron}
                        className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-bold p-1 rounded text-[9px] cursor-pointer transition-all disabled:opacity-50"
                      >
                        ETL MMGD
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Audit terminal logs */}
                  <div className="bg-[#080d16] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5 font-mono">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                          Logs de Execução da Automação (Cron Executions)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Padrão Brasil (UTC-3)</span>
                      </div>
                      <div className="bg-[#05080e] font-mono text-[11px] text-cyan-400/90 p-3 rounded-lg max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
                        {diagnostics?.cron_automation?.cron_history && diagnostics.cron_automation.cron_history.length > 0 ? (
                          diagnostics.cron_automation.cron_history.map((logItem: any, idx: number) => {
                            const timeStr = logItem.timestamp ? new Date(logItem.timestamp).toLocaleTimeString('pt-BR') : '';
                            return (
                              <div key={idx} className="border-l-2 border-cyan-500/30 pl-2 py-0.5 hover:bg-cyan-950/20 flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 font-bold">[{timeStr}]</span>
                                  <span className="text-yellow-400 font-semibold">{logItem.action}</span>
                                  <span className={`font-mono text-[9px] px-1 rounded font-bold ${logItem.status === 'SUCCESS' ? 'bg-emerald-950/80 text-emerald-400' : 'bg-rose-950/80 text-rose-400'}`}>{logItem.status}</span>
                                </div>
                                <span className="text-slate-300 pl-1">{logItem.details}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-slate-500 italic">Nenhum log registrado ainda. Dispare os simulações de carga de dados acima para gerar evidências.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Public Failure Log bento card */}
                  <div className="bg-[#080d16] border border-rose-950/50 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-xs text-rose-300 font-bold flex items-center gap-1.5 font-mono">
                          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                          Painel Público de Falhas e Erros (Observability Logs)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Monitor de Runtime</span>
                      </div>
                      
                      <div className="bg-[#05080e] font-mono text-[11px] p-3 rounded-lg max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
                        {uncaughtErrors.map((err, idx) => (
                          <div key={idx} className={`border-l-2 pl-2 py-0.5 flex flex-col gap-0.5 ${err.level === 'CRITICAL' ? 'border-rose-500/40 hover:bg-rose-950/10' : 'border-amber-500/40 hover:bg-amber-950/10'}`}>
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-bold">[{err.time}]</span>
                                <span className={`text-[9px] px-1 rounded font-bold ${err.level === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'}`}>{err.level}</span>
                                <span className="text-slate-400 font-medium">{err.component}</span>
                              </div>
                            </div>
                            <span className="text-slate-200">{err.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setUncaughtErrors(prev => [
                            {
                              time: new Date().toLocaleTimeString('pt-BR'),
                              level: 'WARNING',
                              message: 'Falha simulada: Perda temporária de sinal de telemetria ONS (Conexão restabelecida via RAG local).',
                              component: 'ONS API Connector'
                            },
                            ...prev
                          ]);
                        }}
                        className="bg-amber-950/30 hover:bg-amber-950/50 border border-amber-900/50 text-amber-300 px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors"
                      >
                        Simular Alerta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUncaughtErrors([
                            { time: new Date().toLocaleTimeString('pt-BR'), level: 'INFO', message: 'MEx Observability Daemon reinicializado. Logs limpos.', component: 'System Core' }
                          ]);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors"
                      >
                        Limpar Logs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: CALCULADORA REGULATÓRIA LEI 14.300 */}
          {activeTab === 'calc' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Inputs card */}
                <div className="lg:col-span-4 bg-[#0c1222] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="border-b border-slate-800 pb-3 mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Calculator className="w-4.5 h-4.5 text-cyan-400" />
                        Simulador Lei 14.300
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Calcule as taxas do Fio B e avalie viabilidade de Peak Shaving com BESS MEx.</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 block font-semibold mb-1.5">Potência do Projeto (kW)</label>
                        <input 
                          type="number" 
                          min={1}
                          value={calcInputs.potenciaKw}
                          onChange={(e) => setCalcInputs({...calcInputs, potenciaKw: Number(e.target.value)})}
                          className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block font-semibold mb-1.5">Fonte</label>
                        <select 
                          value={calcInputs.fonteNorm}
                          onChange={(e) => setCalcInputs({...calcInputs, fonteNorm: e.target.value as any})}
                          className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="UFV">Solar (UFV)</option>
                          <option value="EOL">Eólica (EOL)</option>
                          <option value="CGH">Hidrelétrica (CGH)</option>
                          <option value="UTE">Térmica / Biogás (UTE)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block font-semibold mb-1.5">Modalidade de Conexão</label>
                        <select 
                          value={calcInputs.modalidadeNorm}
                          onChange={(e) => setCalcInputs({...calcInputs, modalidadeNorm: e.target.value as any})}
                          className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="GERACAO_PROPRIA">Geração Própria / Autoconsumo Local</option>
                          <option value="AUTOCONSUMO_REMOTO">Autoconsumo Remoto</option>
                          <option value="GERACAO_COMPARTILHADA">Geração Compartilhada (Consórcio/Cooperativa)</option>
                          <option value="EMUC">EMUC (Múltiplos Consumidores)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block font-semibold mb-1.5">Ano de Conexão à Rede</label>
                        <select 
                          value={calcInputs.connectionYear}
                          onChange={(e) => setCalcInputs({...calcInputs, connectionYear: Number(e.target.value)})}
                          className="w-full bg-[#11192e] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value={2022}>Até 2022 (Direito Adquirido GD1)</option>
                          <option value={2023}>2023 (GD2 Transição)</option>
                          <option value={2024}>2024 (GD2 Transição)</option>
                          <option value={2025}>2025 (GD2 Transição)</option>
                          <option value={2026}>2026 (GD2 Transição - Ano Atual)</option>
                          <option value={2027}>2027 (GD2 Transição)</option>
                          <option value={2028}>2028 (GD2 Transição)</option>
                          <option value={2029}>A partir de 2029 (GD2 Integral)</option>
                        </select>
                      </div>

                      <button
                        onClick={handleCalculate}
                        disabled={calculating}
                        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold p-2.5 rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                      >
                        {calculating ? 'Calculando...' : 'Analisar Projeto'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#11192e] border border-slate-800 p-4 rounded-xl mt-4 text-xs text-slate-400">
                    <div className="flex gap-1.5 items-center font-bold text-slate-300 uppercase mb-1">
                      <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" />
                      Regra Geral Lei 14.300
                    </div>
                    Micro e minigeradores conectados pós 07/01/2023 pagam percentuais graduais da TUSD Fio B (compensação). Conexões remotas acima de 500 kW pagam regras integrais de Fio B e Fio A.
                  </div>
                </div>

                {/* Results display card */}
                <div className="lg:col-span-8 space-y-6">
                  {calcResults && (
                    <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5 space-y-6">
                      <div className="border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Resultado da Análise Tarifária</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Métricas de enquadramento, impacto na compensação de energia e adequação tecnológica.</p>
                      </div>

                      {/* Top classifications */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#11192e] p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold">Enquadramento ANEEL</span>
                          <span className="text-base font-extrabold text-white mt-1 block uppercase">
                            {calcResults.faixaRegulatoria}
                          </span>
                        </div>

                        <div className="bg-[#11192e] p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold">Cobrança Fio B (Ano {calcInputs.connectionYear})</span>
                          <span className="text-base font-extrabold text-yellow-400 mt-1 block">
                            {calcResults.fioBPercentage}% <span className="text-xs font-normal text-slate-400">da TUSD</span>
                          </span>
                        </div>

                        <div className="bg-[#11192e] p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold">MEx Viabilidade BESS</span>
                          <span className="text-base font-extrabold text-emerald-400 mt-1 block">
                            {calcResults.bessViabilityScore}% <span className="text-xs font-normal text-slate-400">Score</span>
                          </span>
                        </div>
                      </div>

                      {/* Special Alert if Minigeneration > 500kW Remote */}
                      {calcResults.isMinigeracaoAcima500kW && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-xs flex gap-2.5">
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <strong>Alerta Regulatório (Artigo 26):</strong> Este projeto enquadra-se como Minigeração acima de 500 kW com compensação remota. Pela Lei 14.300/2022, sofre cobrança imediata de 100% de Fio B, 40% de Fio A e encargos adicionais (sem transição gradual).
                          </div>
                        </div>
                      )}

                      {/* Payback bar */}
                      <div className="bg-[#11192e] p-4 rounded-xl border border-slate-800/80 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Tempo de Retorno de Investimento (Payback)</span>
                          <span className="font-extrabold text-white text-sm">{calcResults.paybackYearsEstimated} Anos Estimados</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, (calcResults.paybackYearsEstimated / 10) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Considera tarifas médias nacionais de concessionárias e perda de compensação regulada.</p>
                      </div>

                      {/* Strategic Recommendation */}
                      <div className="bg-[#11192e] p-4 rounded-xl border border-slate-800/80">
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                          Parecer Estratégico MEx Energia
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {calcResults.recommendation}
                        </p>
                      </div>

                      {/* Chat trigger & Export report */}
                      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
                        <button
                          onClick={handleGenerateReport}
                          className="w-full sm:w-auto bg-gradient-to-r from-yellow-500/10 to-amber-500/10 hover:from-yellow-500/20 hover:to-amber-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-yellow-500/5"
                        >
                          <FileText className="w-4 h-4" />
                          Exportar Relatório PDF
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('ai');
                            handleSendChat(undefined, `Me dê detalhes de viabilidade e simulação para um projeto de ${calcInputs.potenciaKw} kW de fonte ${calcInputs.fonteNorm} na modalidade ${calcInputs.modalidadeNorm} conectado no ano ${calcInputs.connectionYear}.`);
                          }}
                          className="w-full sm:w-auto bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:border-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Aprofundar Análise com Gemini
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: MEX ASSISTENTE AI */}
          {activeTab === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0c1222] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px] justify-between"
            >
              {/* Chat Title panel with offline fallback contingency switch */}
              <div className="bg-[#11192e] border-b border-slate-800 px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${fallbackRAG ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      Gemini Energy Analyst {fallbackRAG && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 ml-2 font-mono">Offline RAG Mode</span>}
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">Especialista no Marco Legal de GD, ONS, DESSEM e Armazenamento Industrial.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#090e1b] px-3 py-1.5 rounded-lg border border-slate-800">
                    <label htmlFor="rag-contingency-toggle" className="text-[10px] font-semibold text-slate-400 cursor-pointer select-none">
                      Simular Queda de LLM (Ativar RAG Local)
                    </label>
                    <input 
                      id="rag-contingency-toggle"
                      type="checkbox"
                      checked={fallbackRAG}
                      onChange={(e) => setFallbackRAG(e.target.checked)}
                      className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 font-mono">
                    {fallbackRAG ? 'Offline-RAG-Engine' : 'gemini-3.5-flash'}
                  </span>
                </div>
              </div>

              {/* Chat message thread container */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {chatHistory.map((item, idx) => {
                  const isModel = item.role === 'model';
                  const isLocalRAG = isModel && (item.text.includes('RAG CONTINGÊNCIA') || item.text.includes('RAG LOCAL') || fallbackRAG);
                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-3 max-w-[85%] ${isModel ? '' : 'ml-auto flex-row-reverse'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                        isModel 
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-black' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {isModel ? 'MEx' : 'VC'}
                      </div>

                      {/* Content bubble */}
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed flex flex-col gap-2 ${
                        isModel 
                          ? 'bg-[#11192e]/80 border border-slate-800 text-slate-200' 
                          : 'bg-cyan-500 text-black font-medium'
                      }`}>
                        {isLocalRAG && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 text-[9px] w-max font-bold flex items-center gap-1">
                            🛰️ Cobertura RAG Contingência Ativa (Local Contingency Response)
                          </span>
                        )}
                        <p className="whitespace-pre-wrap">{item.text}</p>
                      </div>
                    </div>
                  );
                })}

                {sendingChat && (
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-black shrink-0 flex items-center justify-center text-xs font-bold animate-pulse">
                      MEx
                    </div>
                    <div className="p-4 rounded-2xl bg-[#11192e] border border-slate-800 text-slate-400 text-xs flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      MEx Analista está pensando...
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Pre-written quick prompt shortcuts */}
              <div className="px-5 py-2.5 border-t border-slate-800/50 bg-[#090e1b] flex flex-wrap gap-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-bold uppercase self-center mr-1">Sugestões:</span>
                <button 
                  onClick={() => handleSendChat(undefined, "Explique a regra do Autoconsumo Remoto acima de 500 kW na Lei 14.300")}
                  className="text-[10px] bg-[#11192e] border border-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Regra Remoto &gt;500kW
                </button>
                <button 
                  onClick={() => handleSendChat(undefined, "Como o barramento 800VDC + BESS ajuda a evitar encargos regulatórios?")}
                  className="text-[10px] bg-[#11192e] border border-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  BESS &amp; 800VDC
                </button>
                <button 
                  onClick={() => handleSendChat(undefined, "O que é o despacho físico DESSEM e como ele impacta os preços horários?")}
                  className="text-[10px] bg-[#11192e] border border-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Despacho DESSEM
                </button>
              </div>

              {/* Input Chat Box Form */}
              <form 
                onSubmit={handleSendChat}
                className="p-4 border-t border-slate-800 bg-[#11192e] flex gap-3 shrink-0"
              >
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 bg-[#060911] border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
                  placeholder="Escreva sua pergunta regulatória ou operacional..."
                />
                <button
                  type="submit"
                  disabled={sendingChat || !chatMessage.trim()}
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:opacity-90 disabled:opacity-50 text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Detailed Treemap Item Modal */}
      <AnimatePresence>
        {showTreemapDetailModal && selectedTreemapItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTreemapDetailModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-4xl bg-[#0a0f1d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 font-sans"
            >
              {/* Header */}
              <div className="bg-[#11192e] border-b border-slate-800 px-6 py-5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white uppercase tracking-tight">
                      {treemapDetailsLookup[selectedTreemapItem.ticker]?.title || selectedTreemapItem.fullName || selectedTreemapItem.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {treemapDetailsLookup[selectedTreemapItem.ticker]?.badge || selectedTreemapItem.ticker}
                      </span>
                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-slate-400 text-[11px] font-medium">Segmento: {selectedTreemapItem.category}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowTreemapDetailModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300">
                
                {/* Visual Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#05080e] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Capacidade Projetada / Operacional</span>
                    <span className="text-2xl font-black text-white mt-1">
                      {selectedTreemapItem.size.toLocaleString('pt-BR')} <span className="text-xs text-slate-500">MW</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">Total de potência instalada ativa</span>
                  </div>
                  
                  <div className="bg-[#05080e] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      {mapView === 'live' ? `Desvio st=${mapTimeframe}` : mapView === 'mensal' ? 'Desvio Sazonal Média' : mapView === 'anual' ? 'Crescimento YoY' : 'CAGR Requerido'}
                    </span>
                    <span className={`text-2xl font-black mt-1 ${selectedTreemapItem.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedTreemapItem.change >= 0 ? '+' : ''}{selectedTreemapItem.change.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">Performance comparativa do ativo</span>
                  </div>

                  <div className="bg-[#05080e] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Regime Operativo Principal</span>
                    <span className="text-sm font-bold text-yellow-400 mt-2">
                      {selectedTreemapItem.category === 'Centralizado (ONS SIN)' ? 'Despacho ONS SIN' : 'Compensação de Créditos'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">Estrutura física e regulatória</span>
                  </div>
                </div>

                {/* Main Content Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Description & Subcomponents */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                        Visão Geral e Descrição
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed bg-[#05080e]/40 border border-slate-900 rounded-xl p-4">
                        {treemapDetailsLookup[selectedTreemapItem.ticker]?.description || "Informações operacionais detalhadas deste ativo no mix elétrico nacional."}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                        Componentes e Subcategorias do Ativo (Clique para expandir)
                      </h4>
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                        {treemapDetailsLookup[selectedTreemapItem.ticker]?.subComponents.map((sub: any, idx: number) => {
                          const isExpanded = expandedSubComponent === sub.ticker;
                          const hasSparkline = sub.sparkline && sub.sparkline.length > 0;
                          return (
                            <div 
                              key={sub.ticker || idx}
                              className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                                isExpanded 
                                  ? 'border-cyan-500/50 bg-[#0e172a]/90 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                                  : 'border-slate-800/60 bg-[#05080e]/40 hover:bg-slate-900/30 hover:border-slate-700/60'
                              }`}
                            >
                              {/* Summary Header */}
                              <div 
                                onClick={() => setExpandedSubComponent(isExpanded ? null : sub.ticker)}
                                className="p-3 flex items-center justify-between gap-2 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <ArrowRight className={`w-3.5 h-3.5 text-cyan-400 shrink-0 transform transition-transform duration-300 ${isExpanded ? 'rotate-90 text-cyan-300' : ''}`} />
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-white flex items-center gap-1.5 flex-wrap">
                                      <span className="truncate">{sub.name}</span>
                                      <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded shrink-0">
                                        {sub.ticker || `SUB.${idx}`}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                                      {sub.operator || 'Operador Local'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Compact Sparkline preview */}
                                  {hasSparkline && !isExpanded && (
                                    <div className="opacity-70 group-hover:opacity-100 hidden sm:block">
                                      <Sparkline data={sub.sparkline} change={sub.change || 0} />
                                    </div>
                                  )}
                                  
                                  <div className="text-right">
                                    <div className="text-xs font-black text-cyan-400 font-mono">{sub.share}</div>
                                    <div className="text-[9px] text-slate-500 font-mono">Fatia</div>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] font-mono ${
                                    sub.status === 'Operacional' || sub.status === 'Crescendo'
                                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                                      : sub.status === 'Sazonal' || sub.status === 'Expansão'
                                      ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}>
                                    {sub.status}
                                  </span>
                                </div>
                              </div>

                              {/* Expanded Deep-Dive Details */}
                              {isExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="border-t border-slate-800/80 bg-[#070b14] px-4 py-3.5 space-y-3.5"
                                >
                                  {/* Sub-asset Mini Bento Grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                                    <div className="bg-[#0c1222] border border-slate-850 p-2 rounded-lg">
                                      <span className="text-slate-500 block text-[9px] uppercase">Capacidade</span>
                                      <span className="text-slate-200 font-bold">
                                        {sub.size ? `${sub.size.toLocaleString('pt-BR')} MW` : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="bg-[#0c1222] border border-slate-850 p-2 rounded-lg">
                                      <span className="text-slate-500 block text-[9px] uppercase">Flutuação</span>
                                      <span className={`font-bold ${sub.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {sub.change >= 0 ? '+' : ''}{(sub.change || 0).toFixed(2)}%
                                      </span>
                                    </div>
                                    <div className="bg-[#0c1222] border border-slate-850 p-2 rounded-lg col-span-2 sm:col-span-1">
                                      <span className="text-slate-500 block text-[9px] uppercase">Localização</span>
                                      <span className="text-slate-300 truncate block" title={sub.location}>
                                        {sub.location || 'Brasil'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Sparkline & Chart Label */}
                                  {hasSparkline && (
                                    <div className="bg-[#04060c] border border-slate-900 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                                      <div>
                                        <span className="text-slate-500 block text-[9px] font-mono uppercase tracking-wider">Histórico de Geração Operacional</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 block">Variação das últimas campanhas de medição ativa</span>
                                      </div>
                                      <div className="bg-slate-950/80 px-4 py-2.5 rounded-lg border border-slate-900 shrink-0 flex items-center justify-center">
                                        <Sparkline data={sub.sparkline} change={sub.change || 0} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Description */}
                                  {sub.description && (
                                    <p className="text-xs text-slate-400 leading-relaxed bg-[#03050a] p-3 rounded-lg border border-slate-950">
                                      {sub.description}
                                    </p>
                                  )}

                                  {/* Sub-asset Challenges */}
                                  {sub.challenges && sub.challenges.length > 0 && (
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Gargalos Operativos Específicos</span>
                                      <ul className="space-y-1">
                                        {sub.challenges.map((chal: string, cIdx: number) => (
                                          <li key={cIdx} className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-normal">
                                            <span className="text-rose-400 font-bold">•</span>
                                            <span>{chal}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Consult AI specifically for this plant */}
                                  <div className="pt-1.5 flex justify-end">
                                    <button
                                      onClick={() => {
                                        setShowTreemapDetailModal(false);
                                        setActiveTab('ai');
                                        setTimeout(() => {
                                          handleSendChat(undefined, `Gostaria de uma análise detalhada regulatória e operacional da usina ou sistema "${sub.name}" (${sub.ticker}), localizado em ${sub.location || 'Brasil'} e operado por ${sub.operator || 'vários'}. Fale sobre a capacidade de ${sub.size} MW e discuta os desafios: ${sub.challenges ? sub.challenges.join(', ') : 'intermitência e custos de transmissão'}.`);
                                        }, 100);
                                      }}
                                      className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      Consultar IA sobre {sub.name.split(' ')[1] || 'este ativo'}
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        }) || (
                          <div className="text-center py-6 text-slate-500 text-xs font-mono">
                            Nenhum subsetor mapeado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Regulatory & Challenges */}
                  <div className="space-y-5">
                    {/* Regulatory Box */}
                    <div className="bg-[#1e1b12] border border-yellow-800/30 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0" />
                        Estrutura Regulatória (Lei 14.300 / ONS)
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                        {treemapDetailsLookup[selectedTreemapItem.ticker]?.regulatoryText || "Este ativo opera sob as diretrizes básicas do Sistema Interligado Nacional."}
                      </p>
                    </div>

                    {/* Vision 2040 Box */}
                    <div className="bg-[#0b1b1e] border border-cyan-800/30 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                        Diretriz Brasil Vision 2040 (20.000 kWh/capita)
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                        {treemapDetailsLookup[selectedTreemapItem.ticker]?.vision2040Text || "O plano de abundância energética prevê forte acoplamento com baterias industriais e descentralização."}
                      </p>
                    </div>

                    {/* Challenges list */}
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                        Desafios Técnicos & Econômicos Críticos
                      </h4>
                      <ul className="space-y-1.5">
                        {treemapDetailsLookup[selectedTreemapItem.ticker]?.challenges.map((challenge: string, idx: number) => (
                          <li key={idx} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed bg-[#05080e]/20 p-2 rounded border border-slate-900">
                            <span className="text-rose-400 font-bold font-mono">0{idx+1}.</span>
                            <span>{challenge}</span>
                          </li>
                        )) || (
                          <li className="text-xs text-slate-500 font-mono">Nenhum desafio registrado</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="bg-[#11192e] border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
                <div className="text-[10px] text-slate-500 font-mono">
                  Ativo Selecionado: {selectedTreemapItem.fullName} • Duplo clique para inspecionar
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowTreemapDetailModal(false)}
                    className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Fechar Detalhes
                  </button>
                  <button
                    onClick={() => {
                      setShowTreemapDetailModal(false);
                      setActiveTab('ai');
                      // Wait a frame for tab update, then send chat
                      setTimeout(() => {
                        handleSendChat(undefined, `Quais são as melhores oportunidades regulatórias e tecnológicas hoje para investir e otimizar ativos de ${selectedTreemapItem.fullName}? Detalhe os desafios de ${treemapDetailsLookup[selectedTreemapItem.ticker]?.challenges[0] || 'geração'}`);
                      }, 100);
                    }}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:opacity-95 cursor-pointer active:scale-[0.98]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Consultar Assistente AI sobre este Ativo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Simulation Text Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-2xl bg-[#0c1222] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="bg-[#11192e] border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Exportar Relatório Simulado</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Resumo de enquadramento da Lei 14.300/2022 formatado para cópia.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <p className="text-xs text-slate-300">
                  Os resultados foram gerados com base nas regras de transição da Geração Distribuída (GD) brasileira. Copie o resumo formatado abaixo ou salve o arquivo de texto para arquivamento.
                </p>

                {/* Textbox containing the report */}
                <div className="relative group">
                  <textarea
                    readOnly
                    value={reportText}
                    className="w-full h-80 bg-[#05080e] font-mono text-xs text-cyan-300 border border-slate-800 rounded-xl p-4 focus:outline-none focus:border-slate-700 resize-none select-all scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950"
                  />
                  <div className="absolute top-3 right-3 bg-[#0c1222]/80 border border-slate-800 rounded-md px-2 py-1 text-[10px] text-slate-500 font-mono pointer-events-none group-hover:text-slate-400 transition-colors">
                    UTF-8 • TXT
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#11192e] border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
                <div className="text-[10px] text-slate-500 font-mono">
                  MEx Energia Agent v1.4.0 • América/São_Paulo
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleDownloadReport}
                    className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Arquivo
                  </button>
                  <button
                    onClick={handleCopyReport}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold px-5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:opacity-95 cursor-pointer active:scale-[0.98]"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3px]" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Relatório
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 mt-16 bg-[#060911] text-xs text-[#94a3b8] py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5 justify-center md:justify-start">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              MEx Energia Data BR - Código Fonte Licenciado MIT
            </div>
            <p className="text-slate-500">Mapeador oficial de micro, minigeração e ONS operacional para barramento 800VDC e BESS.</p>
          </div>
          
          <div className="flex gap-4">
            <a href="https://github.com/scoobiii/energy-data-br" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Ver Repositório Original
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
