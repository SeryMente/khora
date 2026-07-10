export interface TranscriptChunk {
  sessionId: string;
  seq: number;
  ts: string;
  source: 'globo';
  text: string;
  speaker?: string;
  final: boolean;
}

/**
 * Extended context dimensions for a transcript chunk.
 */
export interface TranscriptChunkExtended extends TranscriptChunk {
  /**
   * Optional array of participant identifiers in the chunk's context.
   * @example ["user_1", "system_bot"]
   */
  participants?: string[];

  /**
   * Optional string describing the circumstance or context of the chunk.
   * @example "initial_greeting"
   */
  circumstance?: string;
}
