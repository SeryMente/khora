var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export function extractPromptFromBlocks(notion, blockId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        let pageText = "";
        let hasMore = true;
        let nextCursor = undefined;
        while (hasMore) {
            const blocksResponse = yield notion.blocks.children.list({
                block_id: blockId,
                start_cursor: nextCursor,
                page_size: 100
            });
            for (const block of blocksResponse.results) {
                if (block.type === 'paragraph' && ((_a = block.paragraph) === null || _a === void 0 ? void 0 : _a.rich_text)) {
                    pageText += block.paragraph.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'heading_1' && ((_b = block.heading_1) === null || _b === void 0 ? void 0 : _b.rich_text)) {
                    pageText += block.heading_1.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'heading_2' && ((_c = block.heading_2) === null || _c === void 0 ? void 0 : _c.rich_text)) {
                    pageText += block.heading_2.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'heading_3' && ((_d = block.heading_3) === null || _d === void 0 ? void 0 : _d.rich_text)) {
                    pageText += block.heading_3.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'bulleted_list_item' && ((_e = block.bulleted_list_item) === null || _e === void 0 ? void 0 : _e.rich_text)) {
                    pageText += block.bulleted_list_item.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'numbered_list_item' && ((_f = block.numbered_list_item) === null || _f === void 0 ? void 0 : _f.rich_text)) {
                    pageText += block.numbered_list_item.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'callout' && ((_g = block.callout) === null || _g === void 0 ? void 0 : _g.rich_text)) {
                    pageText += block.callout.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'quote' && ((_h = block.quote) === null || _h === void 0 ? void 0 : _h.rich_text)) {
                    pageText += block.quote.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'toggle' && ((_j = block.toggle) === null || _j === void 0 ? void 0 : _j.rich_text)) {
                    pageText += block.toggle.rich_text.map((rt) => rt.plain_text).join("") + "\n";
                }
                else if (block.type === 'code' && ((_k = block.code) === null || _k === void 0 ? void 0 : _k.rich_text)) {
                    pageText += block.code.rich_text.map((rt) => rt.plain_text).join("") + "\n";
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
    });
}
