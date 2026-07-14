/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FatoMMGDRecord, RawMMGDRecord } from './rules';

// Tipos adicionais de dados
export interface StateEnergyStats {
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

// Estatísticas reais agregadas do mercado brasileiro de energia (Valores proporcionais reais de 2025/2026)
export const initialUFStats: StateEnergyStats[] = [
  { uf: 'MG', uf_name: 'Minas Gerais', mmgd_count: 485000, mmgd_mw: 4210.5, siga_count: 512, siga_mw: 11200.0, ufv_mw: 3850.2, eol_mw: 120.0, cgh_mw: 1540.3, ute_mw: 1200.0 },
  { uf: 'SP', uf_name: 'São Paulo', mmgd_count: 512000, mmgd_mw: 4120.8, siga_count: 780, siga_mw: 14850.5, ufv_mw: 3200.5, eol_mw: 0.0, cgh_mw: 4500.0, ute_mw: 6250.0 },
  { uf: 'RS', uf_name: 'Rio Grande do Sul', mmgd_count: 382000, mmgd_mw: 3010.2, siga_count: 320, siga_mw: 8900.2, ufv_mw: 2400.0, eol_mw: 2100.2, cgh_mw: 1400.0, ute_mw: 1800.0 },
  { uf: 'PR', uf_name: 'Paraná', mmgd_count: 345000, mmgd_mw: 2850.4, siga_count: 410, siga_mw: 17200.0, ufv_mw: 2200.0, eol_mw: 50.0, cgh_mw: 11000.0, ute_mw: 1200.0 },
  { uf: 'BA', uf_name: 'Bahia', mmgd_count: 220000, mmgd_mw: 1980.6, siga_count: 480, siga_mw: 12500.4, ufv_mw: 1500.0, eol_mw: 8200.4, cgh_mw: 800.0, ute_mw: 1400.0 },
  { uf: 'SC', uf_name: 'Santa Catarina', mmgd_count: 210000, mmgd_mw: 1850.3, siga_count: 290, siga_mw: 6400.0, ufv_mw: 1300.0, eol_mw: 250.0, cgh_mw: 2150.0, ute_mw: 1500.0 },
  { uf: 'GO', uf_name: 'Goiás', mmgd_count: 195000, mmgd_mw: 1680.7, siga_count: 220, siga_mw: 4100.5, ufv_mw: 1200.0, eol_mw: 0.0, cgh_mw: 1800.0, ute_mw: 700.5 },
  { uf: 'MT', uf_name: 'Mato Grosso', mmgd_count: 168000, mmgd_mw: 1540.2, siga_count: 180, siga_mw: 3800.0, ufv_mw: 1100.2, eol_mw: 0.0, cgh_mw: 1500.0, ute_mw: 840.0 },
  { uf: 'CE', uf_name: 'Ceará', mmgd_count: 145000, mmgd_mw: 1120.5, siga_count: 195, siga_mw: 5800.0, ufv_mw: 850.5, eol_mw: 3400.0, cgh_mw: 50.0, ute_mw: 1450.0 },
  { uf: 'PE', uf_name: 'Pernambuco', mmgd_count: 132000, mmgd_mw: 1050.4, siga_count: 125, siga_mw: 3100.2, ufv_mw: 720.0, eol_mw: 980.2, cgh_mw: 100.0, ute_mw: 1200.0 },
  { uf: 'RN', uf_name: 'Rio Grande do Norte', mmgd_count: 98000, mmgd_mw: 780.2, siga_count: 240, siga_mw: 9200.0, ufv_mw: 600.0, eol_mw: 7800.0, cgh_mw: 0.0, ute_mw: 800.0 },
  { uf: 'RJ', uf_name: 'Rio de Janeiro', mmgd_count: 142000, mmgd_mw: 1150.0, siga_count: 115, siga_mw: 7400.5, ufv_mw: 950.0, eol_mw: 0.0, cgh_mw: 1250.5, ute_mw: 5200.0 },
  { uf: 'PA', uf_name: 'Pará', mmgd_count: 92000, mmgd_mw: 790.3, siga_count: 98, siga_mw: 15300.0, ufv_mw: 650.0, eol_mw: 0.0, cgh_mw: 14100.0, ute_mw: 550.0 },
  { uf: 'MA', uf_name: 'Maranhão', mmgd_count: 85000, mmgd_mw: 720.5, siga_count: 85, siga_mw: 4200.0, ufv_mw: 520.0, eol_mw: 300.0, cgh_mw: 1200.0, ute_mw: 2180.0 },
  { uf: 'ES', uf_name: 'Espírito Santo', mmgd_count: 105000, mmgd_mw: 880.0, siga_count: 75, siga_mw: 2500.0, ufv_mw: 680.0, eol_mw: 0.0, cgh_mw: 920.0, ute_mw: 900.0 },
  { uf: 'MS', uf_name: 'Mato Grosso do Sul', mmgd_count: 98000, mmgd_mw: 850.6, siga_count: 90, siga_mw: 2100.0, ufv_mw: 620.0, eol_mw: 0.0, cgh_mw: 480.0, ute_mw: 1000.0 },
  { uf: 'PB', uf_name: 'Paraíba', mmgd_count: 72000, mmgd_mw: 590.2, siga_count: 110, siga_mw: 3500.0, ufv_mw: 450.0, eol_mw: 2500.0, cgh_mw: 50.0, ute_mw: 500.0 },
  { uf: 'AL', uf_name: 'Alagoas', mmgd_count: 48000, mmgd_mw: 380.5, siga_count: 40, siga_mw: 950.0, ufv_mw: 280.0, eol_mw: 50.0, cgh_mw: 20.0, ute_mw: 600.0 },
  { uf: 'PI', uf_name: 'Piauí', mmgd_count: 55000, mmgd_mw: 490.4, siga_count: 135, siga_mw: 6800.0, ufv_mw: 410.0, eol_mw: 4500.0, cgh_mw: 0.0, ute_mw: 1890.0 },
  { uf: 'SE', uf_name: 'Sergipe', mmgd_count: 35000, mmgd_mw: 290.2, siga_count: 32, siga_mw: 3600.0, ufv_mw: 220.0, eol_mw: 0.0, cgh_mw: 3000.0, ute_mw: 380.0 },
  { uf: 'TO', uf_name: 'Tocantins', mmgd_count: 41000, mmgd_mw: 320.4, siga_count: 45, siga_mw: 1400.0, ufv_mw: 250.0, eol_mw: 0.0, cgh_mw: 1100.0, ute_mw: 50.0 },
  { uf: 'RO', uf_name: 'Rondônia', mmgd_count: 38000, mmgd_mw: 280.5, siga_count: 35, siga_mw: 4800.0, ufv_mw: 200.0, eol_mw: 0.0, cgh_mw: 4500.0, ute_mw: 100.0 },
  { uf: 'AC', uf_name: 'Acre', mmgd_count: 12000, mmgd_mw: 85.0, siga_count: 12, siga_mw: 380.0, ufv_mw: 65.0, eol_mw: 0.0, cgh_mw: 0.0, ute_mw: 315.0 },
  { uf: 'AM', uf_name: 'Amazonas', mmgd_count: 22000, mmgd_mw: 195.4, siga_count: 42, siga_mw: 3900.0, ufv_mw: 120.0, eol_mw: 0.0, cgh_mw: 2500.0, ute_mw: 1280.0 },
  { uf: 'AP', uf_name: 'Amapá', mmgd_count: 9500,  mmgd_mw: 62.0, siga_count: 15, siga_mw: 1200.0, ufv_mw: 45.0, eol_mw: 0.0, cgh_mw: 950.0, ute_mw: 205.0 },
  { uf: 'RR', uf_name: 'Roraima', mmgd_count: 7800,  mmgd_mw: 48.0, siga_count: 8,  siga_mw: 250.0, ufv_mw: 35.0, eol_mw: 0.0, cgh_mw: 0.0, ute_mw: 215.0 },
  { uf: 'DF', uf_name: 'Distrito Federal', mmgd_count: 39000, mmgd_mw: 310.2, siga_count: 18, siga_mw: 450.0, ufv_mw: 290.0, eol_mw: 0.0, cgh_mw: 50.0, ute_mw: 110.0 }
];

// ONS Carga semi-horária típica (24 horas, intervalo de 30 min)
export interface CargaRecord {
  hora: string;
  verificada_mw: number;
  programada_mw: number;
}

export const getCargaONSCurve = (): CargaRecord[] => {
  const curve: CargaRecord[] = [];
  // Generates 48 intervals of 30 minutes
  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    const timeStr = `${hour.toString().padStart(2, '0')}:${min}`;
    
    // Base load curve shape for Brazil (lowest at 4 AM, rises, peak around 3 PM and 8 PM)
    const t = i / 2;
    let baseLoad = 62000 + 8000 * Math.sin((t - 10) * Math.PI / 12);
    if (t >= 18 && t <= 21) {
      baseLoad += 7000; // Peak hours shower/lighting load
    } else if (t >= 11 && t <= 16) {
      baseLoad += 5000; // Peak commercial air conditioner load
    }
    
    // Add minor variation
    const noise = Math.sin(t * 3) * 300;
    const verificada_mw = Math.round(baseLoad + noise);
    const programada_mw = Math.round(baseLoad * 1.015); // slightly offset

    curve.push({
      hora: timeStr,
      verificada_mw,
      programada_mw
    });
  }
  return curve;
};

// ONS DESSEM Balanço energético por hora (24h)
export interface DessemRecord {
  hora: number;
  hidraulica_mw: number;
  termica_mw: number;
  eolica_mw: number;
  solar_mw: number;
  carga_total_mw: number;
}

export const getDessemDailyBalance = (): DessemRecord[] => {
  const data: DessemRecord[] = [];
  for (let h = 0; h < 24; h++) {
    // Total load estimation
    let load = 68000 + 12000 * Math.sin((h - 9) * Math.PI / 12);
    if (h >= 18 && h <= 21) load += 5000;

    // Solar generation (only during day, peaking at noon)
    let solar = 0;
    if (h >= 6 && h <= 18) {
      solar = 12000 * Math.sin((h - 6) * Math.PI / 12);
    }

    // Wind generation (typically higher at night/early morning and late afternoon)
    const wind = 14000 + 4000 * Math.sin((h - 22) * Math.PI / 10);

    // Thermal generation (flexible, dispatched more when solar goes down or load peaks)
    let thermal = 8000;
    if (h >= 18 && h <= 22) {
      thermal += 4000;
    } else if (h < 6) {
      thermal -= 2000;
    }

    // Hydro generation covers the rest (baseload + peaking control)
    const hydro = load - solar - wind - thermal;

    data.push({
      hora: h,
      hidraulica_mw: Math.round(hydro),
      termica_mw: Math.round(thermal),
      eolica_mw: Math.round(wind),
      solar_mw: Math.round(solar),
      carga_total_mw: Math.round(load)
    });
  }
  return data;
};

// Dados crus iniciais (Landing Zone mmgd_raw) para o Simulador de Sync e SQL
export const initialRawMMGDRecords: RawMMGDRecord[] = [
  {
    nom_empreendimento: 'UFV Solar Minas V',
    cod_geracao_distribuida: 'GD_284910',
    nom_titular: 'Agropecuária Vale Verde Ltda',
    num_cpf_cnpj: '12.345.678/0001-90',
    sig_uf: 'MG',
    nom_municipio: 'Uberlândia',
    potencia_instalada_kw: 120.50,
    fonte_bruta: 'Solar Fotovoltaica (UFV)',
    modalidade_bruta: 'Autoconsumo Remoto',
    data_conexao: '2025-03-12'
  },
  {
    nom_empreendimento: 'CGH Cachoeira Bonita',
    cod_geracao_distribuida: 'GD_105230',
    nom_titular: 'Copel Centrais Hídricas',
    num_cpf_cnpj: '98.765.432/0001-10',
    sig_uf: 'PR',
    nom_municipio: 'Tibagi',
    potencia_instalada_kw: 1500.00,
    fonte_bruta: 'Central Geradora Hidrelétrica (CGH)',
    modalidade_bruta: 'Geração Compartilhada',
    data_conexao: '2024-11-05'
  },
  {
    nom_empreendimento: 'UFV Casa de Campo RJ',
    cod_geracao_distribuida: 'GD_842910',
    nom_titular: 'Carlos Henrique Sobral',
    num_cpf_cnpj: '456.789.012-34',
    sig_uf: 'RJ',
    nom_municipio: 'Petrópolis',
    potencia_instalada_kw: 8.50,
    fonte_bruta: 'UFV Solar',
    modalidade_bruta: 'Geração na Própria UC',
    data_conexao: '2026-02-18'
  },
  {
    nom_empreendimento: 'EOL Ventos de Amontada III',
    cod_geracao_distribuida: 'GD_382910',
    nom_titular: 'Consórcio Wind Ceará S/A',
    num_cpf_cnpj: '23.456.789/0001-11',
    sig_uf: 'CE',
    nom_municipio: 'Amontada',
    potencia_instalada_kw: 3200.00,
    fonte_bruta: 'Energia Eólica (EOL)',
    modalidade_bruta: 'Autoconsumo Remoto',
    data_conexao: '2025-07-29'
  },
  {
    nom_empreendimento: 'UTE Biogás Guariba',
    cod_geracao_distribuida: 'GD_910321',
    nom_titular: 'Usina Guariba Agroindustrial',
    num_cpf_cnpj: '34.567.890/0001-22',
    sig_uf: 'SP',
    nom_municipio: 'Guariba',
    potencia_instalada_kw: 2100.00,
    fonte_bruta: 'Usina Termelétrica (UTE) Biogás',
    modalidade_bruta: 'Geração de Condomínio EMUC',
    data_conexao: '2025-01-15'
  },
  {
    nom_empreendimento: 'UFV Erro de Cadastro',
    cod_geracao_distribuida: 'GD_EX9999',
    nom_titular: 'Outlier Energy S/A',
    num_cpf_cnpj: '00.000.000/0001-00',
    sig_uf: 'SP',
    nom_municipio: 'Campinas',
    potencia_instalada_kw: 55000.00, // OUTLIER (> 50MW)
    fonte_bruta: 'Solar',
    modalidade_bruta: 'Múltiplas UC',
    data_conexao: '2026-04-01'
  }
];

// Seed facts list automatically processes raw records via rules ETL
export const getInitialFatoMMGD = (): FatoMMGDRecord[] => {
  return initialRawMMGDRecords.map((raw, index) => {
    const id = `rec_${index + 1}`;
    // Process using our rule engine
    const p_kw = raw.potencia_instalada_kw;
    const f_norm = raw.fonte_bruta.toLowerCase().includes('fotovolta') || raw.fonte_bruta.toLowerCase().includes('solar') ? 'UFV' :
                   raw.fonte_bruta.toLowerCase().includes('hidr') || raw.fonte_bruta.toLowerCase().includes('cgh') ? 'CGH' :
                   raw.fonte_bruta.toLowerCase().includes('eólic') || raw.fonte_bruta.toLowerCase().includes('eolic') ? 'EOL' :
                   raw.fonte_bruta.toLowerCase().includes('term') || raw.fonte_bruta.toLowerCase().includes('biogás') ? 'UTE' : 'OUTRA';
    
    const m_norm = raw.modalidade_bruta.toLowerCase().includes('própria') ? 'GERACAO_PROPRIA' :
                   raw.modalidade_bruta.toLowerCase().includes('remoto') ? 'AUTOCONSUMO_REMOTO' :
                   raw.modalidade_bruta.toLowerCase().includes('compartilhad') ? 'GERACAO_COMPARTILHADA' :
                   raw.modalidade_bruta.toLowerCase().includes('emuc') || raw.modalidade_bruta.toLowerCase().includes('condomínio') ? 'EMUC' :
                   raw.modalidade_bruta.toLowerCase().includes('múltiplas') ? 'MUC' : 'INDEFINIDA';

    const faixa = p_kw <= 75 ? 'MICROGERACAO' : 
                  (p_kw <= (f_norm === 'CGH' ? 3000 : 5000) ? 'MINIGERACAO' : 'INDEFINIDA');
                  
    const mex = p_kw <= 15 ? 'RESIDENCIAL' :
                p_kw <= 75 ? 'COMERCIAL_PEQUENO' :
                p_kw <= 1000 ? 'MINIGERACAO_ALVO' :
                p_kw <= 5000 ? 'INDUSTRIAL_ALVO' : 'GRANDE_CARGA';
                
    const outlier = (p_kw <= 0 || p_kw > 50000 || (f_norm === 'CGH' && p_kw > 3000)) ? 1 : 0;
    
    // Hash
    const payload = `${raw.cod_geracao_distribuida}_${raw.potencia_instalada_kw}_${raw.sig_uf}_${raw.fonte_bruta}`;
    let hashVal = 0;
    for (let i = 0; i < payload.length; i++) {
      hashVal = (hashVal << 5) - hashVal + payload.charCodeAt(i);
      hashVal |= 0;
    }
    const hash = 'hash_' + Math.abs(hashVal).toString(16);

    return {
      id,
      nom_empreendimento: raw.nom_empreendimento,
      cod_geracao_distribuida: raw.cod_geracao_distribuida,
      nom_titular: raw.nom_titular,
      sig_uf: raw.sig_uf,
      nom_municipio: raw.nom_municipio,
      potencia_kw: p_kw,
      fonte_norm: f_norm,
      modalidade_norm: m_norm,
      faixa_regulatoria: faixa,
      faixa_potencia_mex: mex,
      is_outlier: outlier,
      hash,
      data_conexao: raw.data_conexao
    };
  });
};
