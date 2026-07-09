/**
 * OPI/VRI Contracts (Fase B)
 * https://app.notion.com/p/ab9cdf54b1e1464089cb89d800687853
 *
 * 4 Capas débilmente acopladas: aislamientos de recursos A/V,
 * robustez ante red inestable, desacoplamiento criptográfico.
 */

// 1. Capa de Aislamiento de Recursos A/V
export interface IAudioVideoResource {
  deviceId: string;
  kind: 'audioinput' | 'videoinput';
  label: string;
  isActive: boolean;
  acquire(): Promise<void>;
  release(): void;
}

// 2. Capa de Transporte y Red (Robustez ante red inestable)
export interface INetworkTransport {
  isConnected: boolean;
  latencyMs: number;
  connect(endpoint: string): Promise<void>;
  disconnect(): void;
  sendPayload(payload: ArrayBuffer): Promise<void>;
  onDisconnect(handler: () => void): void;
  onReconnect(handler: () => void): void;
}

// 3. Capa de Desacoplamiento Criptográfico
export interface ICryptoAdapter {
  encryptPayload(data: ArrayBuffer | string): Promise<ArrayBuffer>;
  decryptPayload(data: ArrayBuffer): Promise<ArrayBuffer | string>;
}

// 4. Capa de Estado de Llamada y Persistencia (Bitácora Fragments)
// IMPORTANTE: La escritura de fragmentos de transcripción "en caliente"
// SIEMPRE debe pasar por un adaptador criptográfico (nunca directo a disco/red).
export interface ITranscriptionFragment {
  id: string;
  timestamp: number;
  encryptedContent: ArrayBuffer; // Content must always be encrypted using ICryptoAdapter
  isFinal: boolean;
}

export interface ICallSessionPersister {
  /**
   * Persists a transcription fragment.
   * MUST use ICryptoAdapter to encrypt the fragment content before calling this method.
   */
  saveFragment(fragment: ITranscriptionFragment): Promise<void>;

  /**
   * Restores transcription fragments after a network drop to restore context.
   * MUST use ICryptoAdapter to decrypt the fragment content after retrieving it.
   */
  restoreFragments(sessionId: string): Promise<ITranscriptionFragment[]>;
}

// --- Máquina de Estados de Llamada ---

export enum CallState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING', // Handles network drops
  DISCONNECTING = 'DISCONNECTING',
  ERROR = 'ERROR'
}

/**
 * Tabla de transiciones válidas para la máquina de estados.
 * Documenta cómo una sesión persiste fragmentos y restaura contexto.
 * Cuando se pasa a CONNECTED desde RECONNECTING, la sesión debe usar
 * ICallSessionPersister para restaurar los fragmentos "en caliente".
 */
export const ValidCallStateTransitions: Record<CallState, CallState[]> = {
  [CallState.IDLE]: [CallState.CONNECTING],
  [CallState.CONNECTING]: [CallState.CONNECTED, CallState.ERROR, CallState.DISCONNECTING],
  [CallState.CONNECTED]: [CallState.RECONNECTING, CallState.DISCONNECTING, CallState.ERROR],
  [CallState.RECONNECTING]: [CallState.CONNECTED, CallState.DISCONNECTING, CallState.ERROR],
  [CallState.DISCONNECTING]: [CallState.IDLE],
  [CallState.ERROR]: [CallState.IDLE]
};
