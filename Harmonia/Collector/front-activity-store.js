'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  parseConversationUrl, relativeAgeLabel, absoluteDateTime, latestPerFront
} = require('../Extension/front-activity');

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_ANY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = Object.freeze(['front.assignment', 'front.activity']);
const ASSIGNMENT_KEYS = Object.freeze(['front_id','front_name','conversation_id','conversation_url','association','assigned_at']);
const ACTIVITY_KEYS = Object.freeze(['front_id','front_name','conversation_id','conversation_url','activity_kind','updated_at','local_conversation_id','cycle_id']);

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...expected].sort().join('|');
}
function isoTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function makeEventError(code, statusCode = 400) {
  const error = new Error(code);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function createFrontActivityStore(options) {
  const { index, registry, originalsDir, maxBytes, persist, pruneSeenEventIds } = options;
  const fronts = new Map((registry?.fronts || []).map(front => [front.id, front]));

  function sanitize(event) {
    if (!event || !EVENT_TYPES.includes(event.type)) throw makeEventError('front-event-type-invalid');
    if (!UUID_ANY.test(String(event.eventId || '')) || !UUID_ANY.test(String(event.sessionId || ''))) {
      throw makeEventError('front-event-identity-invalid');
    }
    const expected = event.type === 'front.assignment' ? ASSIGNMENT_KEYS : ACTIVITY_KEYS;
    const p = event.payload;
    if (!exactKeys(p, expected)) throw makeEventError('front-event-payload-keys-invalid');
    const front = fronts.get(p.front_id);
    if (!front || front.name !== p.front_name) throw makeEventError('front-registry-mismatch');
    const conversation = parseConversationUrl(p.conversation_url);
    if (!conversation || conversation.conversationId !== p.conversation_id || conversation.url !== p.conversation_url) {
      throw makeEventError('front-conversation-url-invalid');
    }
    const timestamp = event.type === 'front.assignment' ? p.assigned_at : p.updated_at;
    if (!isoTimestamp(timestamp) || !isoTimestamp(event.capturedAt) || event.capturedAt !== timestamp) {
      throw makeEventError('front-event-timestamp-invalid');
    }
    if (event.conversation !== conversation.conversationId) throw makeEventError('front-event-conversation-mismatch');
    if (event.type === 'front.assignment') {
      if (p.association !== 'operator_selection') throw makeEventError('front-association-not-explicit');
      return {
        ...event, source: 'front-assignment',
        payload: {
          front_id: front.id, front_name: front.name,
          conversation_id: conversation.conversationId, conversation_url: conversation.url,
          association: 'operator_selection', assigned_at: p.assigned_at
        }
      };
    }
    if (!['user_turn_started','assistant_response_completed'].includes(p.activity_kind)) {
      throw makeEventError('front-activity-kind-invalid');
    }
    if (!UUID_V7.test(String(p.local_conversation_id || '')) || !UUID_V7.test(String(p.cycle_id || ''))) {
      throw makeEventError('front-activity-cycle-identity-invalid');
    }
    return {
      ...event, source: 'cycle-observer-front-activity',
      payload: {
        front_id: front.id, front_name: front.name,
        conversation_id: conversation.conversationId, conversation_url: conversation.url,
        activity_kind: p.activity_kind, updated_at: p.updated_at,
        local_conversation_id: p.local_conversation_id.toLowerCase(), cycle_id: p.cycle_id.toLowerCase()
      }
    };
  }

  function record(event) {
    const clean = sanitize(event);
    const requestSha256 = crypto.createHash('sha256').update(JSON.stringify(clean)).digest('hex');
    const replay = index.seenEventIds[clean.eventId];
    if (replay) {
      if (replay.requestSha256 && replay.requestSha256 !== requestSha256) {
        throw makeEventError('front-event-integrity-conflict', 409);
      }
      return { duplicate: true, storedType: replay.storedType || clean.type, ordinal: replay.ordinal || 0 };
    }

    const p = clean.payload;
    const currentAssignment = index.frontActivity.assignments[p.conversation_id];
    if (clean.type === 'front.activity' &&
      (!currentAssignment || currentAssignment.frontId !== p.front_id || currentAssignment.conversationUrl !== p.conversation_url)) {
      throw makeEventError('front-assignment-required', 409);
    }

    const when = Date.parse(clean.capturedAt);
    const day = new Date(when).toISOString().slice(0, 10);
    const file = path.join(originalsDir, day, clean.sessionId + '.jsonl');
    const line = JSON.stringify(clean) + '\n';
    const bytes = Buffer.byteLength(line);
    if (index.totalBytes + bytes > maxBytes) {
      index.stopped = true;
      persist();
      return { tooLarge: true };
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, line, 'utf8');

    if (clean.type === 'front.assignment') {
      for (const [previousConversationId, previousAssignment] of Object.entries(index.frontActivity.assignments)) {
        if (previousAssignment.frontId === p.front_id && previousConversationId !== p.conversation_id) {
          delete index.frontActivity.assignments[previousConversationId];
        }
      }
      index.frontActivity.assignments[p.conversation_id] = {
        frontId: p.front_id, frontName: p.front_name,
        conversationId: p.conversation_id, conversationUrl: p.conversation_url,
        assignedAt: p.assigned_at, sessionId: clean.sessionId, eventId: clean.eventId
      };
    } else {
      const previous = index.frontActivity.activityByConversation[p.conversation_id];
      if (!previous || Date.parse(p.updated_at) >= Date.parse(previous.updatedAt)) {
        index.frontActivity.activityByConversation[p.conversation_id] = {
          frontId: p.front_id, frontName: p.front_name,
          conversationId: p.conversation_id, conversationUrl: p.conversation_url,
          updatedAt: p.updated_at, activityKind: p.activity_kind,
          localConversationId: p.local_conversation_id, cycleId: p.cycle_id,
          source: 'extension_cycle', sessionId: clean.sessionId, eventId: clean.eventId
        };
      }
    }

    index.totalBytes += bytes;
    const session = index.sessions[clean.sessionId] || {
      firstAt: clean.capturedAt, lastAt: clean.capturedAt, events: 0, types: {},
      file: path.relative(options.root, file).split(path.sep).join('/'), lastEventSha256: null
    };
    session.lastAt = clean.capturedAt;
    session.events++;
    session.types[clean.type] = (session.types[clean.type] || 0) + 1;
    session.lastEventSha256 = crypto.createHash('sha256').update(line).digest('hex');
    index.sessions[clean.sessionId] = session;
    index.seenEventIds[clean.eventId] = {
      capturedAt: clean.capturedAt, sessionId: clean.sessionId,
      storedType: clean.type, ordinal: session.events, requestSha256
    };
    pruneSeenEventIds();
    persist();
    return { duplicate: false, storedType: clean.type, ordinal: session.events, conversationId: p.conversation_id };
  }

  function report(windowId, now = new Date()) {
    const windows = { '24h': 24, '48h': 48, '72h': 72, '7d': 168 };
    if (!Object.prototype.hasOwnProperty.call(windows, windowId)) throw makeEventError('front-report-window-invalid');
    const assignedFrontIds = new Set(Object.values(index.frontActivity.assignments || {}).map(assignment => assignment.frontId));
    const seeds = registry.fronts.filter(front => front.latest_known && !assignedFrontIds.has(front.id)).map(front => ({
      frontId: front.id,
      frontName: front.name,
      conversationId: front.latest_known.conversation_id,
      conversationUrl: front.latest_known.conversation_url,
      updatedAt: front.latest_known.updated_at,
      source: 'export_header',
      timestampProvenance: front.latest_known.source_time_zone || 'source-zone-unverified'
    }));
    const live = Object.values(index.frontActivity.activityByConversation || {}).filter(record => index.frontActivity.assignments[record.conversationId]?.frontId === record.frontId);
    const rows = latestPerFront([...seeds, ...live], windowId, now).map(record => ({
      frontId: record.frontId,
      frontName: record.frontName,
      updatedAt: record.updatedAt,
      relativeLabel: relativeAgeLabel(record.updatedAt, now, registry.timezone || 'America/Mexico_City'),
      absoluteLabel: absoluteDateTime(record.updatedAt, registry.timezone || 'America/Mexico_City'),
      conversationUrl: record.conversationUrl,
      source: record.source || 'extension_cycle',
      timestampProvenance: record.timestampProvenance || 'extension observer timestamp'
    }));
    return {
      schema: 'harmonia.front-report.v1',
      window: windowId,
      windowHours: windows[windowId],
      asOf: now.toISOString(),
      timezone: registry.timezone || 'America/Mexico_City',
      rows
    };
  }

  return Object.freeze({ sanitize, record, report });
}
module.exports = Object.freeze({ createFrontActivityStore, EVENT_TYPES, UUID_V7, UUID_ANY });
