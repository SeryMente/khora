import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Lock,
  AlertTriangle,
  TestTube,
  Clock,
  Ban,
  CheckCircle2
} from 'lucide-react';

export type MapNodeData = {
  condicion: string;
  pregunta: string;
  alternativas: string[];
  consecuencia: string;
  estado: string;
  layout: { level: number; order: number };
  set: 'A' | 'B' | 'C' | 'S' | 'M' | 'BBX';
  marks: string[];
  authorized: boolean;
};

const getSetColors = (set: MapNodeData['set']) => {
  switch (set) {
    case 'A': return 'bg-blue-100 border-blue-500 text-blue-900';
    case 'B': return 'bg-red-100 border-red-500 text-red-900';
    case 'C': return 'bg-purple-100 border-purple-500 text-purple-900';
    case 'S': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
    case 'M': return 'bg-green-100 border-green-500 text-green-900';
    case 'BBX': return 'bg-gray-200 border-gray-800 text-gray-900';
    default: return 'bg-white border-gray-300 text-gray-900';
  }
};

const renderMarks = (marks: string[]) => {
  return marks.map((mark) => {
    switch (mark) {
      case 'candado': return <span key={mark} title="Candado"><Lock className="w-4 h-4 text-gray-700" /></span>;
      case 'riesgo': return <span key={mark} title="Riesgo"><AlertTriangle className="w-4 h-4 text-orange-600" /></span>;
      case 'prueba': return <span key={mark} title="Prueba"><TestTube className="w-4 h-4 text-blue-600" /></span>;
      case 'diferido': return <span key={mark} title="Diferido"><Clock className="w-4 h-4 text-purple-600" /></span>;
      case 'bloqueado': return <span key={mark} title="Bloqueado"><Ban className="w-4 h-4 text-red-600" /></span>;
      case 'aprobado': return <span key={mark} title="Aprobado"><CheckCircle2 className="w-4 h-4 text-green-600" /></span>;
      default: return null;
    }
  });
};

export function CustomNode({ data }: { data: MapNodeData }) {
  const colors = getSetColors(data.set);

  return (
    <div className={`shadow-md rounded-md p-4 border-2 w-72 text-sm ${colors}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-xs uppercase opacity-75">{data.condicion}</div>
        <div className="flex gap-1">
          {renderMarks(data.marks)}
        </div>
      </div>

      <div className="font-semibold text-base mb-3 leading-tight">
        {data.pregunta}
      </div>

      <div className="space-y-1 mb-3">
        {data.alternativas.map((alt, idx) => (
          <div key={idx} className="bg-white/50 px-2 py-1 rounded text-xs border border-white/30 shadow-sm">
            {alt}
          </div>
        ))}
      </div>

      <div className="text-xs italic mb-2 border-t border-black/10 pt-2">
        {data.consecuencia}
      </div>

      <div className="text-[10px] uppercase font-bold text-right opacity-60">
        Estado: {data.estado}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
}
