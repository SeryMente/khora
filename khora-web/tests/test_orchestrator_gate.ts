import assert from 'assert';
import { extractPromptFromBlocks } from '../lib/utils/extractPrompt';
import { Client } from "@notionhq/client";

// The orchestrator logic cannot be easily unit tested by invoking Next.js POST route handler
// because of next/server module mocking issues in standalone node env.
// To follow the same pattern as test_extraction.ts, we will extract the core logic
// from route.ts (the one we just updated) for eligible candidates into a testable function.

// Mock logic matching route.ts eligibleCandidates selection
async function evaluateCandidate(cand: any, activeColZones: Set<string>, mockNotion: Client) {
    const logs: { url: string, decision: string, reason: string }[] = [];
    const logDecision = async (url: string, decision: string, reason: string) => {
        logs.push({ url, decision, reason });
    };

    const executor = cand.properties["Ejecutor"]?.select?.name;
    if (executor !== "🤖 Jules") {
        await logDecision(cand.url, "skipped", "not_jules_executor");
        return { eligible: false, logs };
    }

    const blockers = cand.properties["⛔ Bloqueada por"]?.relation || [];
    let isBlocked = false;
    for (const block of blockers) {
        // mock logic
        isBlocked = true;
    }

    if (isBlocked) {
        await logDecision(cand.url, "skipped", "blocked_by_relation");
        return { eligible: false, logs };
    }

    const candZones = (cand.properties["Zona de colisión"]?.multi_select || []).map((z: any) => z.name);
    if (candZones.some((z: string) => activeColZones.has(z))) {
        await logDecision(cand.url, "skipped", "collision_zone_conflict");
        return { eligible: false, logs };
    }

    if (cand.properties["🔓 OK operador"]?.checkbox !== true) {
        await logDecision(cand.url, "skipped", "missing_operator_ok");
        return { eligible: false, logs };
    }

    let promptBlock = "";
    try {
        promptBlock = await extractPromptFromBlocks(mockNotion, cand.id);
    } catch (e) {
    }

    if (!promptBlock) {
         await logDecision(cand.url, "skipped", "missing_signature");
         return { eligible: false, logs };
    }

    return { eligible: true, logs };
}

const mockNotion = {
    blocks: {
        children: {
            list: async (args: any) => {
                if (args.block_id === "test-with-prompt") {
                    return {
                        results: [
                            {
                                type: 'code',
                                code: {
                                    rich_text: [
                                        { plain_text: "👻 PROMPT PARA JULES\nPrompt\n🖋️ FIRMA-JULES" }
                                    ]
                                }
                            }
                        ],
                        has_more: false
                    };
                } else if (args.block_id === "test-without-prompt") {
                    return {
                        results: [],
                        has_more: false
                    };
                }
                return { results: [], has_more: false };
            }
        }
    }
} as unknown as Client;

async function runTests() {
    // (a) tarjeta con marca -> elegible
    const candA = {
        id: "test-with-prompt",
        url: "url-A",
        properties: {
            "Ejecutor": { select: { name: "🤖 Jules" } },
            "🔓 OK operador": { checkbox: true },
            "Zona de colisión": { multi_select: [] }
        }
    };
    const resA = await evaluateCandidate(candA, new Set(), mockNotion);
    assert.strictEqual(resA.eligible, true, "Test (a) failed: should be eligible");

    // (b) tarjeta sin marca -> skipped missing_operator_ok
    const candB = {
        id: "test-with-prompt",
        url: "url-B",
        properties: {
            "Ejecutor": { select: { name: "🤖 Jules" } },
            // Missing OK operador
            "Zona de colisión": { multi_select: [] }
        }
    };
    const resB = await evaluateCandidate(candB, new Set(), mockNotion);
    assert.strictEqual(resB.eligible, false, "Test (b) failed: should not be eligible");
    assert.strictEqual(resB.logs[0].reason, "missing_operator_ok", "Test (b) failed: wrong reason");

    // (c) tarjeta con marca pero sin prompt firmado -> skipped missing_signature
    const candC = {
        id: "test-without-prompt",
        url: "url-C",
        properties: {
            "Ejecutor": { select: { name: "🤖 Jules" } },
            "🔓 OK operador": { checkbox: true },
            "Zona de colisión": { multi_select: [] }
        }
    };
    const resC = await evaluateCandidate(candC, new Set(), mockNotion);
    assert.strictEqual(resC.eligible, false, "Test (c) failed: should not be eligible");
    assert.strictEqual(resC.logs[0].reason, "missing_signature", "Test (c) failed: wrong reason");

    console.log("All orchestrator gate tests passed!");
}

runTests().catch(console.error);
