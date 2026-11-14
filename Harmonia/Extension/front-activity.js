'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HarmoniaFrontActivity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TIME_ZONE = 'America/Mexico_City';
  const WINDOWS = Object.freeze([
    Object.freeze({ id: '24h', hours: 24, ms: 24 * 60 * 60 * 1000 }),
    Object.freeze({ id: '48h', hours: 48, ms: 48 * 60 * 60 * 1000 }),
    Object.freeze({ id: '72h', hours: 72, ms: 72 * 60 * 60 * 1000 }),
    Object.freeze({ id: '7d', hours: 168, ms: 7 * 24 * 60 * 60 * 1000 })
  ]);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const FRONT_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

  function parseConversationUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port || url.username || url.password) return null;
    const path = url.pathname.replace(/\/+$/, '');
    let match = path.match(/^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (!match) match = path.match(/^\/g\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (!match) return null;
    const conversationId = match.length === 2 ? match[1] : match[2];
    if (!UUID.test(conversationId)) return null;
    return Object.freeze({
      conversationId: conversationId.toLowerCase(),
      url: 'https://chatgpt.com' + path
    });
  }

  function dateParts(value, timeZone = TIME_ZONE) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.map(part => [part.type, part.value]));
  }

  function dayKey(parts) { return parts ? parts.year + '-' + parts.month + '-' + parts.day : null; }
  function calendarDayDistance(earlier, later) {
    const a = Date.UTC(Number(earlier.year), Number(earlier.month) - 1, Number(earlier.day));
    const b = Date.UTC(Number(later.year), Number(later.month) - 1, Number(later.day));
    return Math.round((b - a) / 86400000);
  }

  function relativeAgeLabel(value, now = new Date(), timeZone = TIME_ZONE) {
    const timestamp = new Date(value);
    const current = now instanceof Date ? now : new Date(now);
    if (!Number.isFinite(timestamp.getTime()) || !Number.isFinite(current.getTime())) return 'fecha no disponible';
    const delta = current.getTime() - timestamp.getTime();
    if (delta < -60000) return 'fecha futura';
    if (delta < 60000) return 'ahora';
    if (delta < 3600000) return 'hace ' + Math.max(1, Math.floor(delta / 60000)) + ' min';
    if (delta < 86400000) return 'hace ' + Math.max(1, Math.floor(delta / 3600000)) + ' h';

    const previous = dateParts(timestamp, timeZone);
    const currentParts = dateParts(current, timeZone);
    const distance = calendarDayDistance(previous, currentParts);
    const hour = Number(previous.hour);
    const period = hour >= 11 && hour < 14 ? 'mediodía'
      : hour >= 5 && hour < 12 ? 'mañana'
      : hour >= 14 && hour < 19 ? 'tarde' : 'noche';

    if (distance === 0) return 'hoy · ' + period;
    if (distance === 1) return 'ayer · ' + period;
    if (distance >= 2 && distance <= 6 && (previous.weekday === 'Sat' || previous.weekday === 'Sun')) {
      return 'fin de semana pasado · ' + (previous.weekday === 'Sat' ? 'sábado' : 'domingo');
    }
    if (distance === 2) return 'antier · ' + period;
    if (distance >= 3 && distance <= 7) {
      const weekday = new Intl.DateTimeFormat('es-MX', { timeZone, weekday: 'long' }).format(timestamp);
      return weekday + ' pasado · ' + period;
    }
    return new Intl.DateTimeFormat('es-MX', {
      timeZone, day: 'numeric', month: 'short', year: 'numeric'
    }).format(timestamp) + ' · ' + period;
  }

  function absoluteDateTime(value, timeZone = TIME_ZONE) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'fecha no disponible';
    return new Intl.DateTimeFormat('es-MX', {
      timeZone, weekday: 'short', day: '2-digit', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(date);
  }

  function inWindow(timestamp, windowId, now = new Date()) {
    const windowSpec = WINDOWS.find(item => item.id === windowId);
    const date = new Date(timestamp);
    const current = now instanceof Date ? now : new Date(now);
    if (!windowSpec || !Number.isFinite(date.getTime()) || !Number.isFinite(current.getTime())) return false;
    return date.getTime() <= current.getTime() && date.getTime() >= current.getTime() - windowSpec.ms;
  }

  function latestPerFront(records, windowId, now = new Date()) {
    if (!Array.isArray(records)) return [];
    const latest = new Map();
    for (const record of records) {
      if (!record || !FRONT_ID.test(String(record.frontId || '')) || !record.updatedAt || !inWindow(record.updatedAt, windowId, now)) continue;
      const date = new Date(record.updatedAt);
      if (!Number.isFinite(date.getTime())) continue;
      const previous = latest.get(record.frontId);
      if (!previous || date.getTime() > new Date(previous.updatedAt).getTime()) latest.set(record.frontId, record);
    }
    return [...latest.values()].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  return Object.freeze({
    TIME_ZONE, WINDOWS, UUID, FRONT_ID, parseConversationUrl,
    relativeAgeLabel, absoluteDateTime, inWindow, latestPerFront
  });
});
