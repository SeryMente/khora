import test from "node:test";
import assert from "node:assert/strict";
import { intervaloGeometry, variantFromSeed, sampleIntervaloVariant, INTERVALO_VARIANTS } from "../../lib/brand/intervalo-sonoro";

test("all 54 instances preserve six mirrored bars and one interior cut", () => {
    const unique = new Set<string>();
    for (let n = 0; n < INTERVALO_VARIANTS; n++) {
        const g = intervaloGeometry(n);
        unique.add(JSON.stringify(g.bars) + g.cut);
        assert.equal(g.bars.length, 6);
        assert.ok([2, 3].includes(g.cutBar));
        for (let i = 0; i < 6; i++) {
            const b = g.bars[i], mirror = g.bars[5-i];
            assert.equal(b.x + mirror.x + b.width, 160);
            assert.equal(b.height, mirror.height);
            assert.equal(b.y + b.height/2, 50);
            assert.equal(b.width, 10);
            assert.equal(b.rx, 5);
            assert.ok(b.x >= 0 && b.x + b.width <= 160 && b.y >= 0 && b.y+b.height <= 100);
        }
        assert.equal(g.bars[3].x - (g.bars[2].x+10), g.gap);
        const target = g.bars[g.cutBar];
        assert.ok(g.cutY - 8 > target.y + 5 && g.cutY + 7 < target.y + target.height - 5);
        for(let i=0;i<6;i++) if(i !== g.cutBar) {
            assert.ok(g.cutX+12 <= g.bars[i].x || g.cutX >= g.bars[i].x+10);
        }
    }
    assert.equal(unique.size, 54);
});
test("deterministic cosmetic seeds reach every bounded variant", () => {
    const reached = new Set<number>();
    for(let seed=0;seed<4096;seed++) {
        const v=variantFromSeed(seed);
        assert.equal(v, variantFromSeed(seed));
        assert.ok(v>=0 && v<54);
        reached.add(v);
    }
    assert.equal(reached.size,54);
});
test("unavailable entropy and invalid inputs use a canonical static instance", () => {
    assert.equal(sampleIntervaloVariant(),0);
    assert.equal(sampleIntervaloVariant({getRandomValues(){throw new Error("unavailable");}}),0);
    for(const n of [NaN,Infinity,-1,1.5,0x100000000]) assert.equal(variantFromSeed(n),0);
    for(const n of [NaN,Infinity,-1,54,1.5]) assert.equal(intervaloGeometry(n).index,0);
});
