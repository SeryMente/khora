// @l0 L0-002 · @req UI-REVIEW/TYPES · Harness Webagnóstico de revisión
export type ViewportMode = "desktop" | "mobile";

export type ViewportConfig = {
  name: ViewportMode;
  width: number;
  height: number;
};

export const VIEWPORTS: Record<ViewportMode, ViewportConfig> = {
  desktop: { name: "desktop", width: 1440, height: 900 },
  mobile: { name: "mobile", width: 390, height: 844 },
};

export type ScreenId =
  | "ingreso"
  | "archivo"
  | "revision"
  | "aprobacion"
  | "ingesta"
  | "registro"
  | "grafo";

export type ScenarioStatus = "active" | "absent";

export type ScenarioDefinition = {
  screen: ScreenId;
  scenario: string;
  title: string;
  description: string;
  status: ScenarioStatus;
  ui_ids: string[];
  recommended_viewport: ViewportMode;
};

export type ReviewContextInfo = {
  base_url: string;
  release_sha: string;
  source_fingerprint: string;
  screen: ScreenId;
  scenario: string;
  viewport: ViewportMode;
  selected_ui_id?: string;
};

export type ManifestSchema = {
  schema_version: string;
  release_sha: string;
  source_fingerprint: string;
  build_date: string;
  screens: ScreenId[];
  scenarios: Record<string, ScenarioDefinition>;
  manifest_urls: string[];
  /** Rutas prerenderizadas legibles sin JavaScript. */
  static_urls: string[];
  /** Índice de las rutas prerenderizadas. */
  static_index: string;
};

export type ExportSummary = {
  schema_version: string;
  release_sha: string;
  source_fingerprint: string;
  timestamp: string;
  base_url: string;
  total_scenarios: number;
  total_artifacts: number;
  scenarios: Array<{
    screen: ScreenId;
    scenario: string;
    url: string;
    status: ScenarioStatus;
    console_errors: string[];
    failed_requests: string[];
    desktop_png: { file: string; sha256: string };
    mobile_png: { file: string; sha256: string };
    snapshot_txt: { file: string; sha256: string };
  }>;
};
