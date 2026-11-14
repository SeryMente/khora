'use strict';
const DISABLED_REASON='temporal-cycle-telemetry-disabled-by-metacanon-52';
function rejectTemporalCycleOperation(){const error=new Error(DISABLED_REASON);error.code=DISABLED_REASON;error.statusCode=410;throw error;}
module.exports=Object.freeze({
 START:'client.cycle.started',
 COMPLETE:'client.cycle.completed',
 DIAGNOSTIC_TRACE:'diag.cycle.trace',
 DISABLED_REASON,
 sanitizeCycleEvent:rejectTemporalCycleOperation,
 sanitizeCycleDiagnosticEvent:rejectTemporalCycleOperation,
 validateCyclePair:rejectTemporalCycleOperation,
 summarizeCycles:rejectTemporalCycleOperation
});
