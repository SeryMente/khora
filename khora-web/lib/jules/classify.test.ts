import { isSimpleQuestion } from "./classify";

function testIsSimpleQuestion() {
    let failed = 0;

    // Test 1: Empty question
    if (isSimpleQuestion("") !== true) {
        console.error("Test 1 Failed: empty string should be simple");
        failed++;
    }

    // Test 2: Short question without keywords (< 260 chars)
    if (isSimpleQuestion("¿Cómo estás?") !== true) {
        console.error("Test 2 Failed: short string without keywords should be simple");
        failed++;
    }

    // Test 3: Long question with keyword (> 260 chars)
    const longWithKeyword = "apruebas ".repeat(40); // 360 chars
    if (isSimpleQuestion(longWithKeyword) !== true) {
        console.error("Test 3 Failed: long string with keyword should be simple");
        failed++;
    }

    // Test 4: Long question without keywords (> 260 chars)
    const longWithoutKeyword = "esto es un mensaje largo sin las palabras clave ".repeat(10); // > 400 chars
    if (isSimpleQuestion(longWithoutKeyword) !== false) {
        console.error("Test 4 Failed: long string without keywords should be complex (false)");
        failed++;
    }

    // Test 5: Keyword in uppercase
    const uppercaseKeyword = "APRUEBAS esto?"; // < 260 chars, but tests the lowercasing
    if (isSimpleQuestion(uppercaseKeyword) !== true) {
        console.error("Test 5 Failed: uppercase keyword should be simple");
        failed++;
    }

    const longWithUppercaseKeyword = "APRUEBAS ".repeat(40); // 360 chars
    if (isSimpleQuestion(longWithUppercaseKeyword) !== true) {
        console.error("Test 5b Failed: long uppercase keyword should be simple");
        failed++;
    }

    if (failed === 0) {
        console.log("All tests passed for isSimpleQuestion!");
    } else {
        console.error(`${failed} tests failed.`);
        process.exit(1);
    }
}

testIsSimpleQuestion();
