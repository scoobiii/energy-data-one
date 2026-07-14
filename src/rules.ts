/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Regras de Negócio — ANEEL MMGD -> MEx Energia
 * Base regulatória: Lei nº 14.300/2022 (marco legal da GD) e REN ANEEL nº 1.000/2021
 */

export type FaixaRegulatoria = 'MICROGERACAO' | 'MINIGERACAO' | 'INDEFINIDA';
export type FonteNorm = 'UFV' | 'EOL' | 'CGH' | 'UTE' | 'OUTRA';
export type ModalidadeNorm = 
  | 'GERACAO_PROPRIA' 
  | 'AUTOCONSUMO_REMOTO' 
  | 'GERACAO_COMPARTILHADA' 
  | 'MUC' 
  | 'EMUC' 
  | 'INDEFINIDA';

export type FaixaPotenciaMex = 
  | 'RESIDENCIAL' 
  | 'COMERCIAL_PEQUENO' 
  | 'MINIGERACAO_ALVO' 
  | 'INDUSTRIAL_ALVO' 
  | 'GRANDE_CARGA';

export interface RawMMGDRecord {
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
  data_conexao: string; // YYYY-MM-DD
}

export interface FatoMMGDRecord {
  id: string;
  nom_empreendimento: string;
  cod_geracao_distribuida: string;
  nom_titular: string;
  sig_uf: string;
  nom_municipio: string;
  potencia_kw: number;
  fonte_norm: FonteNorm;
  modalidade_norm: ModalidadeNorm;
  faixa_regulatoria: FaixaRegulatoria;
  faixa_potencia_mex: FaixaPotenciaMex;
  is_outlier: number; // 0 ou 1
  hash: string;
  data_conexao: string;
}

// 1. Faixa regulatória (Lei 14.300/2022)
export function classifyFaixaRegulatoria(potenciaKw: number, fonteNorm: FonteNorm): FaixaRegulatoria {
  if (!potenciaKw || potenciaKw <= 0) return 'INDEFINIDA';
  
  if (potenciaKw <= 75) {
    return 'MICROGERACAO';
  } else {
    // MINIGERACAO: > 75 kW e <= 3 MW (hídrica - CGH) / <= 5 MW (demais fontes)
    const limiteMax = (fonteNorm === 'CGH') ? 3000 : 5000;
    if (potenciaKw <= limiteMax) {
      return 'MINIGERACAO';
    }
  }
  return 'INDEFINIDA';
}

// 2. Normalização de fonte (Case-insensitive)
export function normalizeFonte(fonteBruta: string): FonteNorm {
  if (!fonteBruta) return 'OUTRA';
  const f = fonteBruta.toLowerCase();
  if (f.includes('fotovolta') || f.includes('solar') || f.includes('ufv')) return 'UFV';
  if (f.includes('eólic') || f.includes('eolic') || f.includes('eol')) return 'EOL';
  if (f.includes('hidr') || f.includes('cgh') || f.includes('pch')) return 'CGH';
  if (f.includes('term') || f.includes('biogás') || f.includes('biomassa') || f.includes('gás natural') || f.includes('ute')) return 'UTE';
  return 'OUTRA';
}

// 3. Normalização de modalidade (REN ANEEL 1.000/2021)
export function normalizeModalidade(modalidadeBruta: string): ModalidadeNorm {
  if (!modalidadeBruta) return 'INDEFINIDA';
  const m = modalidadeBruta.toUpperCase().replace(/\s+/g, '_');
  
  if (m.includes('PROPRIA') || m.includes('LOCAL') || m.includes('AUTO_CONSUMO_LOCAL')) return 'GERACAO_PROPRIA';
  if (m.includes('REMOTO') || m.includes('AUTOCONSUMO_REMOTO')) return 'AUTOCONSUMO_REMOTO';
  if (m.includes('COMPARTILHADA') || m.includes('CONSORCIO') || m.includes('COOPERATIVA')) return 'GERACAO_COMPARTILHADA';
  if (m.includes('EMUC') || m.includes('MULTIPLAS_U_C') || m.includes('CONDOMINIO')) return 'EMUC';
  if (m.includes('MUC')) return 'MUC';
  
  // Test substrings as backup
  const mLower = modalidadeBruta.toLowerCase();
  if (mLower.includes('remoto')) return 'AUTOCONSUMO_REMOTO';
  if (mLower.includes('compartilhad')) return 'GERACAO_COMPARTILHADA';
  if (mLower.includes('múltiplas') || mLower.includes('multiplas')) return 'EMUC';
  if (mLower.includes('própria') || mLower.includes('propria')) return 'GERACAO_PROPRIA';
  
  return 'INDEFINIDA';
}

// 4. Faixa de interesse estratégico MEx Energia (Barramento 800VDC + BESS)
export function classifyFaixaMex(potenciaKw: number): FaixaPotenciaMex {
  if (potenciaKw <= 15) return 'RESIDENCIAL';
  if (potenciaKw <= 75) return 'COMERCIAL_PEQUENO';
  if (potenciaKw <= 1000) return 'MINIGERACAO_ALVO';
  if (potenciaKw <= 5000) return 'INDUSTRIAL_ALVO';
  return 'GRANDE_CARGA';
}

// 5. Outliers / Qualidade (is_outlier)
export function checkIsOutlier(potenciaKw: number, fonteNorm: FonteNorm): number {
  if (!potenciaKw || potenciaKw <= 0 || isNaN(potenciaKw)) return 1;
  // Implausível para micro/minigeração típica (> 50 MW)
  if (potenciaKw > 50000) return 1;
  // CGH (Hídrica) acima de 3 MW sob faixa minigeração
  if (fonteNorm === 'CGH' && potenciaKw > 3000) return 1;
  return 0;
}

// Simples Hash Generator para o canonic checksum (SHA-256 alternativo rápido para node/browser)
export function generateSHA256Hash(record: RawMMGDRecord): string {
  const payload = `${record.cod_geracao_distribuida}_${record.potencia_instalada_kw}_${record.sig_uf}_${record.fonte_bruta}`;
  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// 6. Função de ETL do MMGD
export function runETLOnRecord(raw: RawMMGDRecord): FatoMMGDRecord {
  const id = raw.id || `rec_${Math.random().toString(36).substr(2, 9)}`;
  const potencia_kw = Number(raw.potencia_instalada_kw) || 0;
  const fonte_norm = normalizeFonte(raw.fonte_bruta);
  const modalidade_norm = normalizeModalidade(raw.modalidade_bruta);
  const faixa_regulatoria = classifyFaixaRegulatoria(potencia_kw, fonte_norm);
  const faixa_potencia_mex = classifyFaixaMex(potencia_kw);
  const is_outlier = checkIsOutlier(potencia_kw, fonte_norm);
  const hash = generateSHA256Hash(raw);
  
  return {
    id,
    nom_empreendimento: raw.nom_empreendimento || 'Empreendimento S/N',
    cod_geracao_distribuida: raw.cod_geracao_distribuida || 'GD_999999',
    nom_titular: raw.nom_titular || 'Titular S/A',
    sig_uf: raw.sig_uf ? raw.sig_uf.toUpperCase() : 'SP',
    nom_municipio: raw.nom_municipio || 'Município',
    potencia_kw,
    fonte_norm,
    modalidade_norm,
    faixa_regulatoria,
    faixa_potencia_mex,
    is_outlier,
    hash,
    data_conexao: raw.data_conexao || new Date().toISOString().split('T')[0],
  };
}

// Regras financeiras e tarifárias da Lei 14.300/2022 para GD
export interface TariffAnalysisResult {
  faixaRegulatoria: FaixaRegulatoria;
  isMinigeracaoAcima500kW: boolean;
  fioBPercentage: number;
  fioAPercentage: number;
  otherChargesPercentage: number;
  recommendation: string;
  bessViabilityScore: number; // 0 to 100
  paybackYearsEstimated: number;
}

export function analyzeTariffImpact(potenciaKw: number, fonteNorm: FonteNorm, modalidadeNorm: ModalidadeNorm, connectionYear: number): TariffAnalysisResult {
  const faixa = classifyFaixaRegulatoria(potenciaKw, fonteNorm);
  
  // Minigeração acima de 500 kW com Autoconsumo Remoto tem regra mais rígida
  const isMinigeracaoAcima500kW = (faixa === 'MINIGERACAO' && potenciaKw > 500 && modalidadeNorm === 'AUTOCONSUMO_REMOTO');
  
  // Percentual de cobrança do Fio B sob a regra de transição da Lei 14.300
  // Conexões até 2022: Isenção (GD1)
  // Conexões pós Jan/2023 (GD2): Escada de transição para o Fio B
  let fioBPercentage = 0;
  let fioAPercentage = 0;
  let otherChargesPercentage = 0;
  
  if (connectionYear <= 2022) {
    fioBPercentage = 0;
    fioAPercentage = 0;
  } else {
    if (isMinigeracaoAcima500kW) {
      // Regra especial: paga 100% de Fio B, 40% de Fio A, mais TFSEE e P&D desde o início
      fioBPercentage = 100;
      fioAPercentage = 40;
      otherChargesPercentage = 100; // TFSEE e P&D
    } else {
      // Regra geral de transição:
      switch (connectionYear) {
        case 2023: fioBPercentage = 15; break;
        case 2024: fioBPercentage = 30; break;
        case 2025: fioBPercentage = 45; break;
        case 2026: fioBPercentage = 60; break; // Nosso ano atual!
        case 2027: fioBPercentage = 75; break;
        case 2028: fioBPercentage = 90; break;
        default: fioBPercentage = 100; break;
      }
    }
  }

  // BESS (Sistemas de Armazenamento de Energia por Bateria) e barramento 800VDC viability
  let bessViabilityScore = 0;
  let recommendation = '';
  let paybackYearsEstimated = 5.5;

  if (potenciaKw > 1000) {
    // Alvo industrial: Excelente para 800VDC + BESS
    bessViabilityScore = 92;
    recommendation = "Altamente viável para barramento de 800VDC + BESS. Ideal para Peak Shaving (redução de demanda em horário de ponta) e arbitragem de tarifas. O payback é acelerado pelo tamanho da carga e pelo perfil de consumo industrial.";
    paybackYearsEstimated = 4.2;
  } else if (potenciaKw >= 75) {
    // Mini-geração média
    bessViabilityScore = 78;
    recommendation = "Viável para BESS modular MEx. Recomendado instalar sistema híbrido para garantir backup contra oscilações de rede e autoconsumo inteligente durante o período de ponta.";
    paybackYearsEstimated = 5.8;
  } else {
    // Micro-geração: Ticket baixo, bateria menos atraente economicamente
    bessViabilityScore = 35;
    recommendation = "Baixa prioridade para armazenamento comercial MEx. Priorize o autoconsumo instantâneo sem baterias, dado que os custos do BESS de pequeno porte ainda possuem payback elevado para esse perfil de consumo.";
    paybackYearsEstimated = 8.5;
  }

  return {
    faixaRegulatoria: faixa,
    isMinigeracaoAcima500kW,
    fioBPercentage,
    fioAPercentage,
    otherChargesPercentage,
    recommendation,
    bessViabilityScore,
    paybackYearsEstimated
  };
}
