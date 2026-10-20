/** Shared corpus contract. Structural validation is NOT authorization or truth verification. */
import registry from './current.json' with { type: 'json' };
import schema from './schema.v0.1.0.json' with { type: 'json' };

export const CONTRACT_ID = registry.contract_id;
export const CURRENT_SCHEMA_VERSION = registry.current_schema_version;
export const CURRENT_SPEC_VERSION = registry.spec_version;
const keywords = new Set(['$schema', '$id', 'title', 'description', 'type', 'properties',
  'required', 'additionalProperties', 'const', 'enum', 'pattern', 'minLength',
  'maxLength', 'minimum', 'maximum', 'format']);
function checkSchema(node) {
  for (const key of Object.keys(node)) if (!keywords.has(key)) throw new Error('UNSUPPORTED_SCHEMA_KEYWORD');
  if (!['object', 'string', 'integer'].includes(node.type)) throw new Error('UNSUPPORTED_SCHEMA_TYPE');
  if (node.type === 'object') {
    if (node.additionalProperties !== false || !Array.isArray(node.required) || !node.properties)
      throw new Error('INVALID_CLOSED_SCHEMA');
    for (const key of node.required) if (!Object.hasOwn(node.properties, key)) throw new Error('INVALID_REQUIRED_KEY');
    for (const child of Object.values(node.properties)) checkSchema(child);
  }
  if (node.format && node.format !== 'date-time') throw new Error('UNSUPPORTED_SCHEMA_FORMAT');
}
checkSchema(schema);
if (schema.properties.schema_version.const !== CURRENT_SCHEMA_VERSION ||
    schema.properties.contract_id.const !== CONTRACT_ID ||
    JSON.stringify(registry.accepted_schema_versions) !== JSON.stringify([CURRENT_SCHEMA_VERSION]))
  throw new Error('CONTRACT_VERSION_DRIFT');
function datetime(value) {
  // Interchange profile: UTC, millisecond precision optional, no leap-second normalization.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() ===
    (value.includes('.') ? value : value.replace('Z', '.000Z'));
}
function shape(node, value, path, errors) {
  if (node.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      errors.push({path, code: 'OBJECT_REQUIRED'}); return;
    }
    for (const key of node.required) if (!Object.hasOwn(value, key)) errors.push({path: path + '.' + key, code: 'REQUIRED'});
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(node.properties, key)) {
        // Never echo untrusted keys, content or values into errors/telemetry.
        errors.push({path, code: 'UNKNOWN_FIELD'}); continue;
      }
      shape(node.properties[key], value[key], path + '.' + key, errors);
    }
  } else if (node.type === 'integer') {
    if (!Number.isSafeInteger(value) || value < node.minimum || value > node.maximum)
      errors.push({path, code: 'INTEGER_RANGE'});
  } else {
    if (typeof value !== 'string') { errors.push({path, code: 'STRING_REQUIRED'}); return; }
    const length = Array.from(value).length;
    if ((node.minLength !== undefined && (length < node.minLength || !value.trim())) ||
        (node.maxLength !== undefined && length > node.maxLength)) errors.push({path, code: 'STRING_LENGTH'});
    if (node.pattern && !new RegExp(node.pattern, 'u').test(value)) errors.push({path, code: 'PATTERN'});
    if (node.format === 'date-time' && !datetime(value)) errors.push({path, code: 'DATETIME_PROFILE'});
  }
  if (Object.hasOwn(node, 'const') && value !== node.const) errors.push({path, code: 'CONST'});
  if (node.enum && !node.enum.includes(value)) errors.push({path, code: 'ENUM'});
}
export function validateAutobiographicalUnit(raw) {
  const errors = [];
  shape(schema, raw, '$', errors);
  if (errors.length) return {valid: false, errors};
  const fail = (path, code) => errors.push({path, code});
  if (raw.subject.attribution !== 'ambiguous' && !raw.subject.subject_ref)
    fail('$.subject', 'SUBJECT_REFERENCE_REQUIRED');
  if (raw.anchor.coordinates === 'whole_resource') {
    if (raw.anchor.start !== 0 || raw.anchor.end !== 0) fail('$.anchor', 'WHOLE_RESOURCE_RANGE');
  } else if (raw.anchor.end <= raw.anchor.start) fail('$.anchor', 'ANCHOR_ORDER');
  if (['audio','video'].includes(raw.source.medium) &&
      !['milliseconds','whole_resource'].includes(raw.anchor.coordinates)) fail('$.anchor', 'MEDIA_COORDINATES');
  if (raw.source.medium === 'text' && raw.anchor.coordinates === 'milliseconds') fail('$.anchor', 'TEXT_COORDINATES');
  if (raw.source.medium === 'image' && raw.anchor.coordinates !== 'whole_resource') fail('$.anchor', 'IMAGE_COORDINATES');
  if (raw.event_time.status === 'known' && !raw.event_time.description) fail('$.event_time', 'EVENT_DESCRIPTION_REQUIRED');
  const reviewed = ['accepted','rejected','superseded'].includes(raw.review.status);
  if (reviewed && (!raw.review.actor_ref || !raw.review.decided_at || raw.review.actor_kind !== 'human'))
    fail('$.review', 'HUMAN_REVIEW_RECEIPT_REQUIRED');
  if (reviewed && raw.review.source_revision !== raw.source.revision) fail('$.review', 'STALE_REVIEW');
  if (raw.review.status === 'accepted' &&
      (!['explicit','supported'].includes(raw.subject.attribution) || raw.source.integrity !== 'verified' ||
       raw.eligibility !== 'pertinent')) fail('$.review', 'ACCEPTANCE_PREREQUISITES');
  if (raw.governance.retention === 'temporary' && !raw.governance.expires_at)
    fail('$.governance', 'TEMPORARY_EXPIRY_REQUIRED');
  if (raw.governance.expires_at && Date.parse(raw.governance.expires_at) <= Date.parse(raw.captured_at))
    fail('$.governance', 'EXPIRY_ORDER');
  return {valid: errors.length === 0, errors};
}
export function parseForConsumer(raw, expected) {
  if (!expected || expected.contract_id !== CONTRACT_ID || expected.schema_version !== CURRENT_SCHEMA_VERSION)
    throw new Error('CONSUMER_VERSION_MISMATCH');
  const result = validateAutobiographicalUnit(raw);
  if (!result.valid) throw new Error('INVALID_AUTOBIOGRAPHICAL_UNIT');
  // No permission decision. A consumer must resolve policy/owner/subject externally before use.
  return structuredClone(raw);
}
