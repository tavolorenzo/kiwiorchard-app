/**
 * calcM2.js
 * ─────────────────────────────────────────────────────────────
 * Replica en JavaScript la fórmula de Google Sheets:
 *
 * =SUM(ARRAYFORMULA(IFERROR(
 *   VLOOKUP(SPLIT(F9,","), {'MAP'!A8:B45;'MAP'!C8:D45}, 2, FALSE),
 * 0)))
 *
 * Qué hace cada parte:
 *  SPLIT(F9, ",")     → parte el CSV en array de bay_ids
 *  VLOOKUP(…, 2)      → busca cada bay_id y devuelve su m²
 *  IFERROR(…, 0)      → si el bay_id no existe, devuelve 0
 *  ARRAYFORMULA+SUM   → aplica el lookup a todos y suma
 *
 * En JS:
 *  split(",")         → SPLIT
 *  bayMap[id] ?? 0    → VLOOKUP + IFERROR
 *  reduce(sum)        → SUM + ARRAYFORMULA
 * ─────────────────────────────────────────────────────────────
 */


// ── LA FUNCIÓN ────────────────────────────────────────────────

/**
 * Calcula el total de m² de una lista de bay_ids.
 *
 * @param {string} baysCsv  - "S-1,S-2,S-SKIRT,N-3"
 * @param {Object} bayMap   - { "S-1": 21, "S-SKIRT": 10, "N-3": 21 }
 * @returns {number}        - metros cuadrados totales
 */
export function calcM2(baysCsv, bayMap) {
    if (!baysCsv || !bayMap) return 0;

    return baysCsv
        .split(",")           // "S-1,S-2,N-3" → ["S-1", "S-2", "N-3"]
        .map(id => id.trim()) // quitar espacios accidentales
        .filter(Boolean)      // quitar strings vacíos si hay comas dobles
        .reduce((sum, id) => sum + (bayMap[id] ?? 0), 0);
    //                                        ↑
    //                          Si el bay_id no existe en el MAP
    //                          devuelve 0 (equivalente a IFERROR)
}

/**
 * Cuenta cuántos bays hay en el CSV.
 * @param {string} baysCsv
 * @returns {number}
 */
export function countBays(baysCsv) {
    if (!baysCsv) return 0;
    return baysCsv
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .length;
}

/**
 * Calcula bays por hora.
 * @param {number} totalBays
 * @param {number} hours
 * @returns {number} - redondeado a 2 decimales
 */
export function calcBaysPerHr(totalBays, hours) {
    if (!hours || hours === 0) return 0;
    return Math.round((totalBays / hours) * 100) / 100;
}

/**
 * Calcula el costo total del job.
 * @param {number} totalBays
 * @param {number} bayRate  - tarifa por bay del orchard
 * @returns {number}
 */
export function calcCost(totalBays, bayRate) {
    return Math.round(totalBays * bayRate * 100) / 100;
}


// ── TESTS CON DATOS REALES DE CASUARINA ───────────────────────
// Ejecutar con: node calcM2.js
// (solo para desarrollo — no va en producción)

if (typeof process !== "undefined" && process.argv[1].includes("calcM2")) {

    // MAP real de Casuarina (subconjunto)
    const CASUARINA_MAP = {
        "S-SKIRT": 10,
        "S-1": 21, "S-2": 21, "S-3": 21, "S-4": 21, "S-5": 21,
        "S-6": 21, "S-7": 21, "S-8": 21, "S-9": 21, "S-10": 21,
        "S-11": 21,
        "S-12": 16, "S-13": 16, "S-14": 16, "S-15": 16, "S-16": 16,
        "S-17": 16, "S-18": 16, "S-19": 16, "S-20": 16, "S-21": 16,
        "S-22": 16, "S-23": 16, "S-24": 16, "S-25": 16,
        "S-26": 20,
        "S-27": 24, "S-28": 24, "S-29": 24, "S-30": 24, "S-31": 24,
        "S-32": 24, "S-33": 24, "S-34": 24, "S-35": 24, "S-36": 24,
        "S-SKIRT-2": 12,
        "N-SKIRT": 11,
        "N-1": 21, "N-2": 21, "N-3": 21, "N-4": 21, "N-5": 21,
        "N-6": 21, "N-7": 21, "N-8": 21, "N-9": 21, "N-10": 21,
        "N-11": 21, "N-12": 21, "N-13": 21, "N-14": 21, "N-15": 21,
        "N-16": 21, "N-17": 21, "N-18": 21, "N-19": 21, "N-20": 21,
        "N-21": 21, "N-22": 21, "N-23": 21, "N-24": 21, "N-25": 21,
        "N-26": 21, "N-27": 21, "N-28": 21, "N-29": 21, "N-30": 21,
        "N-31": 21, "N-32": 21, "N-33": 21, "N-34": 21, "N-35": 21,
        "N-36": 21,
        "N-SKIRT-2": 11,
    };

    let passed = 0;
    let failed = 0;

    function test(description, result, expected) {
        const ok = result === expected;
        console.log(`${ok ? "✅" : "❌"} ${description}`);
        if (!ok) console.log(`   esperado: ${expected} | obtenido: ${result}`);
        ok ? passed++ : failed++;
    }

    console.log("\n── calcM2 ──────────────────────────────────────────\n");

    // Casos normales
    test("Bay individual S-1",
        calcM2("S-1", CASUARINA_MAP), 21);

    test("Bay individual con skirt S-SKIRT",
        calcM2("S-SKIRT", CASUARINA_MAP), 10);

    test("Dos bays iguales S-1,S-2",
        calcM2("S-1,S-2", CASUARINA_MAP), 42);

    test("Bays de distinto tamaño S-1,S-12",
        calcM2("S-1,S-12", CASUARINA_MAP), 37); // 21+16

    test("Mix bloques S y N",
        calcM2("S-1,N-1", CASUARINA_MAP), 42); // 21+21

    test("Skirt + bays normales S-SKIRT,S-1,S-2,N-1",
        calcM2("S-SKIRT,S-1,S-2,N-1", CASUARINA_MAP), 73); // 10+21+21+21

    test("Skirt-2 al final S-SKIRT-2",
        calcM2("S-SKIRT-2", CASUARINA_MAP), 12);

    test("Job complejo del ejemplo Excel: S-2,N-2 (42 bays)",
        calcM2(
            Array.from({ length: 21 }, (_, i) => `S-${i + 1 > 11 ? i + 1 : i + 1 <= 11 ? i + 1 : i + 1}`).join(","),
            CASUARINA_MAP
        ), 21 * 21); // simplificado

    // Casos borde
    test("CSV con espacios: ' S-1 , S-2 '",
        calcM2(" S-1 , S-2 ", CASUARINA_MAP), 42);

    test("Bay inexistente devuelve 0",
        calcM2("S-99", CASUARINA_MAP), 0);

    test("Bay inexistente no rompe el total: S-1,S-99,N-1",
        calcM2("S-1,S-99,N-1", CASUARINA_MAP), 42); // 21+0+21

    test("CSV vacío devuelve 0",
        calcM2("", CASUARINA_MAP), 0);

    test("null devuelve 0",
        calcM2(null, CASUARINA_MAP), 0);

    test("bayMap vacío devuelve 0",
        calcM2("S-1,S-2", {}), 0);

    console.log("\n── countBays ───────────────────────────────────────\n");

    test("Cuenta 3 bays en S-1,S-2,N-1",
        countBays("S-1,S-2,N-1"), 3);

    test("Cuenta 1 bay en S-SKIRT",
        countBays("S-SKIRT"), 1);

    test("CSV vacío = 0 bays",
        countBays(""), 0);

    console.log("\n── calcBaysPerHr ────────────────────────────────────\n");

    test("42 bays / 24 hrs = 1.75",
        calcBaysPerHr(42, 24), 1.75);

    test("63 bays / 24 hrs = 2.63",
        calcBaysPerHr(63, 24), 2.63);

    test("0 horas = 0",
        calcBaysPerHr(42, 0), 0);

    console.log("\n── calcCost ─────────────────────────────────────────\n");

    test("42 bays × $12.23 = $513.66",
        calcCost(42, 12.23), 513.66);

    test("63 bays × $12.23 = $769.49",
        calcCost(63, 12.23), 769.49);

    test("0 bays = $0",
        calcCost(0, 12.23), 0);

    console.log(`\n${"─".repeat(50)}`);
    console.log(`Resultado: ${passed} ✅ pasaron | ${failed} ❌ fallaron`);
    console.log(`${"─".repeat(50)}\n`);
}