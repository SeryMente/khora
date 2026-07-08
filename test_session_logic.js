const assert = require('assert');

function simulateCheckAuthSession(sessionStr, now) {
  if (!sessionStr) return false;
  try {
    const session = JSON.parse(sessionStr);
    if (session.authenticated && (now - session.timestamp < 3600000)) {
      return true;
    }
  } catch(e) {}
  return false;
}

const now = Date.now();

// 1. Valid Session
const validSession = JSON.stringify({ authenticated: true, timestamp: now - 1800000 }); // 30 mins ago
assert.strictEqual(simulateCheckAuthSession(validSession, now), true, "Valid session should pass");

// 2. Expired Session
const expiredSession = JSON.stringify({ authenticated: true, timestamp: now - 3600001 }); // > 1 hour ago
assert.strictEqual(simulateCheckAuthSession(expiredSession, now), false, "Expired session should fail");

// 3. No Session
assert.strictEqual(simulateCheckAuthSession(null, now), false, "No session should fail");

// 4. Invalid JSON
assert.strictEqual(simulateCheckAuthSession("invalid_json", now), false, "Invalid JSON should fail");

console.log("All session logic tests passed!");
