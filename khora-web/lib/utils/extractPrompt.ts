import { Client } from "@notionhq/client";

export async function extractPromptFromBlocks(notion: Client, blockId: string): Promise<string> {
    let pageText = "";
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    while (hasMore) {
        const blocksResponse = await notion.blocks.children.list({
            block_id: blockId,
            start_cursor: nextCursor,
            page_size: 100
        });

        for (const block of blocksResponse.results as any[]) {
            if (block.type === 'paragraph' && block.paragraph?.rich_text) {
                pageText += block.paragraph.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'heading_1' && block.heading_1?.rich_text) {
                pageText += block.heading_1.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'heading_2' && block.heading_2?.rich_text) {
                pageText += block.heading_2.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'heading_3' && block.heading_3?.rich_text) {
                pageText += block.heading_3.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
                pageText += block.bulleted_list_item.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
                pageText += block.numbered_list_item.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'callout' && block.callout?.rich_text) {
                pageText += block.callout.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'quote' && block.quote?.rich_text) {
                pageText += block.quote.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'toggle' && block.toggle?.rich_text) {
                pageText += block.toggle.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            } else if (block.type === 'code' && block.code?.rich_text) {
                pageText += block.code.rich_text.map((rt: any) => rt.plain_text).join("") + "\n";
            }
        }

        hasMore = blocksResponse.has_more;
        nextCursor = blocksResponse.next_cursor || undefined;
    }

    const startMarker = "👻 PROMPT PARA JULES";
    const endMarker = "🖋️ FIRMA-JULES";

    const startIndex = pageText.indexOf(startMarker);
    const endIndex = pageText.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const fullEndIndex = pageText.indexOf("\n", endIndex);
        return pageText.substring(startIndex, fullEndIndex !== -1 ? fullEndIndex : pageText.length);
    }

    return "";
}
