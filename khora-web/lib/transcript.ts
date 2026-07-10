export interface TranscriptChunk {
  sessionId: string;
  seq: number;
  ts: string;
  source: 'globo';
  text: string;
  speaker?: string;
  final: boolean;
}
