"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, ServerCrash } from "lucide-react";

type NotionProperty = {
  id: string;
  type: string;
  [key: string]: any;
};

type NotionPage = {
  id: string;
  properties: {
    [key: string]: NotionProperty;
  };
};

type RoadmapCard = {
  id: string;
  title: string;
  code: string;
  status: string;
  assignee: string;
  order: number;
  urgent: boolean;
  collisionZone: string;
  sprint: string;
};

export default function RoadmapPage() {
  const [cards, setCards] = useState<RoadmapCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [view, setView] = useState<'kanban' | 'urgentes' | 'progreso'>('kanban');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/board/view");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error === "not_configured" ? "sin conexión a Notion" : "Error al cargar datos");
      }

      const parsedCards: RoadmapCard[] = data.data.results.map((page: NotionPage) => {
        const props = page.properties;
        
        const getTitle = (p: any) => p?.title?.[0]?.plain_text || "";
        const getRichText = (p: any) => p?.rich_text?.[0]?.plain_text || "";
        const getSelect = (p: any) => p?.select?.name || "";
        const getNumber = (p: any) => p?.number || 0;
        const getCheckbox = (p: any) => p?.checkbox || false;

        return {
          id: page.id,
          title: getTitle(props["Tarea / Hito"] || props.Name || props.title),
          code: getRichText(props["Código"]) || getRichText(props["Codigo"]),
          status: getSelect(props["Estado"]),
          assignee: getSelect(props["Ejecutor"]),
          order: getNumber(props["Orden de disparo"]),
          urgent: getCheckbox(props["🚨 Urgente (bypass)"]) || getCheckbox(props["Urgente"]),
          collisionZone: getSelect(props["Zona de colisión"]),
          sprint: getSelect(props["Sprint"])
        };
      });

      setCards(parsedCards);
      setLastSync(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // Agrupamiento
  const terminalStatuses = ['Fusionado', 'Cancelado', 'Done', 'Completado'];
  const flowStatuses = ['Por hacer', 'En progreso', 'En revisión']; // Ajustar según Notion real
  
  // Extraer todos los estados únicos de las tarjetas que no son terminales
  const allNonTerminalStatuses = Array.from(new Set(
      cards.filter(c => !terminalStatuses.includes(c.status)).map(c => c.status)
  )).filter(s => !!s);
  
  // Combinar los estados esperados con los que realmente vienen (por si hay variaciones)
  const columns = Array.from(new Set([...flowStatuses, ...allNonTerminalStatuses]));

  const getUrgentCards = () => cards.filter(c => c.urgent && !terminalStatuses.includes(c.status));
  const getCardsByStatus = (status: string) => cards.filter(c => !c.urgent && c.status === status);
  const mergedCount = cards.filter(c => terminalStatuses.includes(c.status)).length;
  
  // Agrupar por sprint para la vista de progreso
  const sprints = Array.from(new Set(cards.map(c => c.sprint).filter(s => !!s)));
  
  return (
    <main className="bg-cora-bg min-h-screen flex flex-col selection:bg-cora-accent/20 relative">
      <header className="sticky top-0 w-full p-4 md:p-6 flex items-center justify-between z-10 bg-cora-bg/80 backdrop-blur-md border-b border-cora-silver/20">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-full hover:bg-cora-surface transition-colors">
            <ArrowLeft className="w-5 h-5 text-cora-text" />
          </Link>
          <div>
            <h1 className="font-semibold text-cora-text tracking-wide">🗂️ Roadmap</h1>
            <div className="flex items-center gap-2 text-xs text-cora-silver mt-1">
              {lastSync ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Sincronizado {lastSync.toLocaleTimeString()}</span>
                </>
              ) : error ? (
                <>
                  <ServerCrash className="w-3 h-3 text-red-500" />
                  <span>{error}</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 bg-cora-surface rounded-full p-1 border border-cora-silver/20">
          <button 
            onClick={() => setView('kanban')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${view === 'kanban' ? 'bg-cora-bg text-cora-text shadow-sm' : 'text-cora-silver hover:text-cora-text'}`}
          >
            Kanban
          </button>
          <button 
            onClick={() => setView('urgentes')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${view === 'urgentes' ? 'bg-cora-bg text-cora-text shadow-sm' : 'text-cora-silver hover:text-cora-text'}`}
          >
            Urgentes
          </button>
          <button 
            onClick={() => setView('progreso')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${view === 'progreso' ? 'bg-cora-bg text-cora-text shadow-sm' : 'text-cora-silver hover:text-cora-text'}`}
          >
            Progreso
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-x-auto">
        {loading && !cards.length ? (
          <div className="flex items-center justify-center h-64">
            <Clock className="w-8 h-8 animate-spin text-cora-silver" />
          </div>
        ) : error && !cards.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-cora-silver">
            <ServerCrash className="w-12 h-12 mb-4 text-red-400" />
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm mt-2 max-w-md text-center">No se pudieron cargar los datos de Notion. Se requiere configurar la conexión.</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-cora-silver">
            <p className="text-lg font-medium">Roadmap vacío</p>
            <p className="text-sm mt-2">No hay tarjetas en el tablero.</p>
          </div>
        ) : (
          <>
            {view === 'kanban' && (
              <div className="flex gap-6 min-w-max items-start">
                {/* Columna URGENTE siempre al frente */}
                <div className="w-80 flex-shrink-0 bg-red-500/5 rounded-2xl border border-red-500/20 p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-red-500 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      URGENTE
                    </h2>
                    <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full">{getUrgentCards().length}</span>
                  </div>
                  {getUrgentCards().map(card => (
                    <Card key={card.id} card={card} />
                  ))}
                  {getUrgentCards().length === 0 && (
                    <p className="text-sm text-cora-silver italic text-center py-4">Sin urgencias</p>
                  )}
                </div>

                {/* Resto de columnas por estado */}
                {columns.map(status => (
                  <div key={status} className="w-80 flex-shrink-0 bg-cora-surface/50 rounded-2xl border border-cora-silver/20 p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-semibold text-cora-text">{status || 'Sin estado'}</h2>
                      <span className="text-xs bg-cora-bg text-cora-text px-2 py-1 rounded-full border border-cora-silver/20">{getCardsByStatus(status).length}</span>
                    </div>
                    {getCardsByStatus(status).map(card => (
                      <Card key={card.id} card={card} />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {view === 'urgentes' && (
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                  Atención Requerida
                </h2>
                <div className="grid gap-4">
                  {getUrgentCards().length > 0 ? (
                    getUrgentCards().map(card => <Card key={card.id} card={card} horizontal />)
                  ) : (
                    <div className="text-center py-12 text-cora-silver border border-dashed border-cora-silver/30 rounded-2xl">
                      <p>No hay tareas urgentes en este momento.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'progreso' && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-cora-surface rounded-2xl border border-cora-silver/20 p-6 mb-8">
                  <h3 className="text-lg font-medium mb-2">Métricas Generales</h3>
                  <div className="flex items-center gap-4 text-3xl font-light">
                    <div className="flex flex-col">
                      <span className="text-green-500">{mergedCount}</span>
                      <span className="text-xs text-cora-silver uppercase tracking-wider font-medium">Fusionadas</span>
                    </div>
                    <div className="h-10 w-px bg-cora-silver/20"></div>
                    <div className="flex flex-col">
                      <span className="text-cora-text">{cards.length}</span>
                      <span className="text-xs text-cora-silver uppercase tracking-wider font-medium">Total</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {sprints.map(sprint => {
                    const sprintCards = cards.filter(c => c.sprint === sprint);
                    const completed = sprintCards.filter(c => terminalStatuses.includes(c.status)).length;
                    const progress = sprintCards.length > 0 ? (completed / sprintCards.length) * 100 : 0;

                    return (
                      <div key={sprint} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <h4 className="font-medium">{sprint || 'Sin Sprint asignado'}</h4>
                          <span className="text-sm text-cora-silver">{completed} / {sprintCards.length}</span>
                        </div>
                        <div className="h-2 w-full bg-cora-surface rounded-full overflow-hidden border border-cora-silver/10">
                          <div 
                            className="h-full bg-cora-text transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Card({ card, horizontal = false }: { card: RoadmapCard, horizontal?: boolean }) {
  return (
    <div className={`bg-cora-surface border ${card.urgent ? 'border-red-500/40 shadow-sm shadow-red-500/10' : 'border-cora-silver/20 hover:border-cora-accent/50'} rounded-xl p-4 transition-all duration-200 group ${horizontal ? 'flex items-center gap-6' : 'flex flex-col gap-3'}`}>
      <div className={`${horizontal ? 'flex-1' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[10px] font-mono text-cora-silver bg-cora-bg px-1.5 py-0.5 rounded uppercase">{card.code || 'NO-CODE'}</span>
          {card.urgent && !horizontal && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          )}
        </div>
        <h3 className="font-medium text-sm text-cora-text leading-snug group-hover:text-cora-accent transition-colors">{card.title || 'Sin título'}</h3>
      </div>
      
      <div className={`flex items-center gap-2 text-xs text-cora-silver mt-auto ${horizontal ? 'min-w-[200px] justify-end' : ''}`}>
        {card.assignee && (
          <span className="flex items-center gap-1 bg-cora-bg px-2 py-1 rounded-md border border-cora-silver/10">
            <span className="w-2 h-2 rounded-full bg-cora-accent/40"></span>
            {card.assignee}
          </span>
        )}
        {card.sprint && (
          <span className="flex items-center gap-1">
            🗓️ {card.sprint}
          </span>
        )}
      </div>
    </div>
  );
}
