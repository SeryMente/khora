import schema from './schema.v0.1.0.json' with {type: 'json'};
export function renderTypes(node = schema) {
  function type(n) {
    if ('const' in n) return JSON.stringify(n.const);
    if (n.enum) return n.enum.map(v => JSON.stringify(v)).join(' | ');
    if (n.type === 'string') return 'string';
    if (n.type === 'integer') return 'number';
    return '{ ' + Object.entries(n.properties).map(([key, child]) =>
      JSON.stringify(key) + (n.required.includes(key) ? '' : '?') + ': ' + type(child) + ';').join(' ') + ' }';
  }
  return '// Generated from schema; checked against it. Do not edit this shape separately.\n' +
    'export type AutobiographicalUnit = ' + type(node) + ';\n' +
    'export const CONTRACT_ID: "khora.corpus-autobiografico";\n' +
    'export const CURRENT_SCHEMA_VERSION: string;\nexport const CURRENT_SPEC_VERSION: string;\n' +
    'export function validateAutobiographicalUnit(raw: unknown): {valid: boolean; errors: Array<{path: string; code: string}>};\n' +
    'export function parseForConsumer(raw: unknown, expected: {contract_id: string; schema_version: string}): AutobiographicalUnit;\n';
}
