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
  FileText
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

// Custom styled Content renderer for the proportional load Treemap (ONS + MMGD)
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, size, color } = props;
  
  if (width < 35 || height < 20) return null;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color || '#1e293b',
          stroke: '#090d16',
          strokeWidth: 2.5,
          strokeOpacity: 1,
        }}
        rx={6}
        ry={6}
      />
      {width > 70 && height > 35 ? (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 4}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={width > 120 ? 11 : 9}
            fontWeight="bold"
            className="select-none pointer-events-none"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#a5f3fc"
            fontSize={width > 120 ? 10 : 8}
            fontWeight="600"
            className="select-none pointer-events-none"
          >
            {size >= 1000 ? `${(size / 1000).toFixed(1)} GW` : `${size.toLocaleString('pt-BR')} MW`}
          </text>
        </>
      ) : (
        <text
          x={x + width / 2}
          y={y + height / 2 + 3}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={8}
          fontWeight="bold"
          className="select-none pointer-events-none"
        >
          {name.split(' ')[0]}
        </text>
      )}
    </g>
  );
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

  // Run initial state fetches
  useEffect(() => {
    fetchStatsAndUF();
    fetchONSCurves();
    fetchDBAndRunQuery();
    handleCalculate();
    fetchDiagnostics();
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

    return [
      { name: 'Hidrelétrica Central (ONS SIN)', size: 68000, category: 'Centralizada', color: '#1e40af' },
      { name: 'Eólica Central (ONS SIN)', size: 16000, category: 'Centralizada', color: '#0e7490' },
      { name: 'Térmica Central (ONS SIN)', size: 10000, category: 'Centralizada', color: '#9a3412' },
      { name: 'Solar Central (ONS SIN)', size: 8000, category: 'Centralizada', color: '#854d0e' },
      
      { name: 'Solar MMGD', size: Number(ufv.toFixed(0)), category: 'MMGD', color: '#eab308' },
      { name: 'Térmica MMGD', size: Number(ute.toFixed(0)), category: 'MMGD', color: '#f97316' },
      { name: 'Hidro CGH MMGD', size: Number(cgh.toFixed(0)), category: 'MMGD', color: '#2563eb' },
      { name: 'Eólica MMGD', size: Number(eol.toFixed(0)), category: 'MMGD', color: '#06b6d4' },
    ];
  }, [ufStats]);

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
            Painel Nacional GD
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

              {/* ONS Centralized and MMGD Proportional Load Treemap */}
              <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                      Treemap de Capacidade Proporcional à Carga (Brasil)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Visão unificada das Fontes ONS Centralizadas e MMGD. O tamanho de cada área é estritamente proporcional à carga instalada (MW).
                    </p>
                  </div>
                  <span className="bg-yellow-500/10 text-yellow-400 font-bold px-3 py-1 border border-yellow-500/20 rounded-xl text-xs flex items-center gap-1.5 shrink-0 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    Proporcionalidade Ativa
                  </span>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      stroke="#090d16"
                      fill="#8884d8"
                      content={<CustomTreemapContent />}
                    >
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0c1222', borderColor: '#334155', color: '#f8fafc' }}
                        formatter={(value, name) => [`${Number(value).toLocaleString('pt-BR')} MW`, name]}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#1e40af] rounded animate-pulse" />
                    <span className="text-slate-400">Hidro (Central ONS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#0e7490] rounded" />
                    <span className="text-slate-400">Eólica (Central ONS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#9a3412] rounded" />
                    <span className="text-slate-400">Térmica (Central ONS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#854d0e] rounded" />
                    <span className="text-slate-400">Solar (Central ONS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#eab308] rounded animate-pulse" />
                    <span className="text-slate-400">Solar MMGD</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#f97316] rounded" />
                    <span className="text-slate-400">Térmica MMGD</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#2563eb] rounded" />
                    <span className="text-slate-400">CGH MMGD</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#06b6d4] rounded" />
                    <span className="text-slate-400">Eólica MMGD</span>
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
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Curva de Demanda de Carga ONS (Semi-horária)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Demonstração da carga total verificada contra a programada pelo operador nacional.</p>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cargaData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="hora" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 5000', 'dataMax + 2000']} />
                          <Tooltip contentStyle={{ backgroundColor: '#0c1222', borderColor: '#334155', color: '#f8fafc' }} />
                          <Legend />
                          <Line type="monotone" dataKey="verificada_mw" name="Carga Verificada (MW)" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="programada_mw" name="Carga Programada (MW)" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 2. DESSEM Balance stacked area chart */}
                  <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Balanço Energético DESSEM (Hourly Dispatch)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Previsão de despacho físico de potência do SIN por tipo de fonte.</p>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dessemData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                      {diagnostics ? `${diagnostics.performance.memory_ram_mb.toFixed(1)}` : '...'} <span className="text-xs font-normal text-slate-400">MB</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${diagnostics ? Math.min(100, (diagnostics.performance.memory_ram_mb / 250) * 100) : 15}%` }}
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
                      {diagnostics ? `${diagnostics.persistence.sqlite_real_size_kb.toFixed(1)}` : '...'} <span className="text-xs font-normal text-slate-400">KB</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-2 block">
                      Engine: <strong className="text-yellow-400">{diagnostics ? diagnostics.persistence.engine : 'SQLite3 Simulada'}</strong>
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                      <span>Usinas Gravadas:</span>
                      <span>{diagnostics ? diagnostics.persistence.mmgd_fato_rows : '...'} rows</span>
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
                        Servidor: <span className="text-[#a5f3fc]">{diagnostics ? diagnostics.time_sync.utc_time_brasilia : '...'}</span>
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
                        Status: <strong className="text-emerald-400">{diagnostics ? diagnostics.cron_automation.status : 'Ativo'}</strong>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-1">
                        Agendado: <span className="text-yellow-400">{diagnostics ? diagnostics.cron_automation.cron_frequency : '...'}</span>
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

                {/* Audit terminal logs */}
                <div className="mt-4 bg-[#080d16] border border-slate-800/90 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                      Logs de Execução da Automação (Cron Executions)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Padrão Brasil (UTC-3)</span>
                  </div>
                  <div className="bg-[#05080e] font-mono text-[11px] text-cyan-400/90 p-3 rounded-lg max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
                    {diagnostics && diagnostics.cron_automation.cron_logs.length > 0 ? (
                      diagnostics.cron_automation.cron_logs.map((log: string, idx: number) => (
                        <div key={idx} className="border-l-2 border-cyan-500/30 pl-2 py-0.5 hover:bg-cyan-950/20">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic">Nenhum log registrado ainda. Dispare os simulações de carga de dados acima para gerar evidências.</div>
                    )}
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

                      {/* Chat trigger */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => {
                            setActiveTab('ai');
                            handleSendChat(undefined, `Me dê detalhes de viabilidade e simulação para um projeto de ${calcInputs.potenciaKw} kW de fonte ${calcInputs.fonteNorm} na modalidade ${calcInputs.modalidadeNorm} conectado no ano ${calcInputs.connectionYear}.`);
                          }}
                          className="bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer group"
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
                  className="flex-1 bg-[#090d16] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                  placeholder="Pergunte ao analista sobre Lei 14.300, tarifas, ONS carga..."
                />
                <button
                  type="submit"
                  disabled={sendingChat || !chatMessage.trim()}
                  className="bg-cyan-500 text-black font-bold p-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

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
