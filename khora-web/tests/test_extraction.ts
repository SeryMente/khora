import { Client } from "@notionhq/client";
import { extractPromptFromBlocks } from '../lib/utils/extractPrompt';
import assert from 'assert';

// Mock Client
const mockNotion = {
    blocks: {
        children: {
            list: async (args: any) => {
                if (args.block_id === "test-code-block") {
                    return {
                        results: [
                            {
                                type: 'code',
                                code: {
                                    rich_text: [
                                        { plain_text: "Some code here\n" },
                                        { plain_text: "👻 PROMPT PARA JULES\nThis is the prompt content\n🖋️ FIRMA-JULES\n" }
                                    ]
                                }
                            }
                        ],
                        has_more: false
                    };
                } else if (args.block_id === "test-pagination") {
                    if (!args.start_cursor) {
                        return {
                            results: Array(100).fill({ type: 'paragraph', paragraph: { rich_text: [{ plain_text: "Filler\n" }] } }),
                            has_more: true,
                            next_cursor: "cursor-2"
                        };
                    } else if (args.start_cursor === "cursor-2") {
                        return {
                            results: [
                                {
                                    type: 'code',
                                    code: {
                                        rich_text: [
                                            { plain_text: "👻 PROMPT PARA JULES\nPrompt from page 2\n🖋️ FIRMA-JULES" }
                                        ]
                                    }
                                }
                            ],
                            has_more: false
                        };
                    }
                } else if (args.block_id === "test-missing-signature") {
                    return {
                        results: [
                            {
                                type: 'paragraph',
                                paragraph: {
                                    rich_text: [
                                        { plain_text: "👻 PROMPT PARA JULES\nOnly start marker" }
                                    ]
                                }
                            }
                        ],
                        has_more: false
                    };
                }
                return { results: [], has_more: false };
            }
        }
    }
} as unknown as Client;

async function runTests() {
    let result = await extractPromptFromBlocks(mockNotion, "test-code-block");
    assert.ok(result.includes("👻 PROMPT PARA JULES\nThis is the prompt content\n🖋️ FIRMA-JULES"), "Test 1 failed");

    result = await extractPromptFromBlocks(mockNotion, "test-pagination");
    assert.ok(result.includes("👻 PROMPT PARA JULES\nPrompt from page 2\n🖋️ FIRMA-JULES"), "Test 2 failed");

    result = await extractPromptFromBlocks(mockNotion, "test-missing-signature");
    assert.strictEqual(result, "", "Test 3 failed");

    console.log("All tests passed!");
}

runTests().catch(console.error);
