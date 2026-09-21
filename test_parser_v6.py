import io, os, subprocess, re

with open('/root/zapdemo/public/admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
extracted_lines = []
in_parser_block = False

start_patterns = [r'^\s*function\s*aiParse\s*\(', r'^\s*var\s*MODEL_MAP\s*=']
end_pattern = r'return\s+r\s*;?\s*}\s*;'

for i, line in enumerate(lines):
    if any(re.match(p, line.strip()) for p in start_patterns):
        in_parser_block = True
   
    if in_parser_block:
        extracted_lines.append(line)
       
    if in_parser_block and re.search(end_pattern, line):
        break

if len(extracted_lines) < 5:
    print(f"ERROR: Парсер найден слишком коротко ({len(extracted_lines)} строк).")
    exit(1)

print(f"OK: Извлечено {len(extracted_lines)} строк кода парсера.")

code_snippet = '\n'.join(extracted_lines)

stub_header = """
// --- АВТОГЕНЕРИРОВАННЫЙ ТЕСТ ПАРСЕРА v6 ---
const window = {};
"""

test_harness = stub_header + code_snippet + """

// --- ТЕСТОВЫЕ КЕЙСЫ A-K + НОВЫЕ МАРКИ (v6 fixed RU expectations) ---
function runTest(name, inputStr, expectedFields) {
    try {
        let result = aiParse(inputStr);
        let pass = true;
        let errors = [];
        for (let key in expectedFields) {
            let expVal = expectedFields[key];
            let actVal = result[key];
           
            if (expVal === undefined && (actVal === undefined || actVal === null)) continue;
            if (expVal !== undefined && actVal === undefined) {
                 pass = false; errors.push(`Ожидается ${key}=${JSON.stringify(expVal)}, получено undefined`); continue;
            }
           
            if (actVal !== expVal) {
                pass = false;
                errors.push(`Ожидается ${key}=${JSON.stringify(expVal)}, получено ${JSON.stringify(actVal)}`);
            }
        }
        if (pass) console.log(`✅ PASS: ${name}`);
        else console.log(`❌ FAIL: ${name} | ${errors.join('; ')}`);
    } catch (e) {
        console.log(`💥 CRASH: ${name} | Error: ${e.message}`);
    }
}

console.log("--- ЗАПУСК ТЕСТОВ v6 ---");

runTest('A: Тойота Камри', 'фильтр масляный для тойота камри наличие: 2 цена 3400', { avail: 'in', stock: 2, price: 3400, car: 'Toyota', model: 'Camry' });
runTest('B: Королла 1шт', 'подшипник corolla 1 шт', { stock: 1, car: 'Toyota', model: 'Corolla' });
runTest('C: Ламба (без наличия)', 'стекло лобовое для ламборджини италия', { car: 'Ламборджини', avail: undefined });
runTest('H: Опель (нормализация)', 'шаровая опора опель левая в наличии 1 штука 3500', { name: 'Шаровая опора Opel левая', avail: 'in', stock: 1, price: 3500, car: 'Opel' });
// ИСПРАВЛЕНО: Ждем "Лада Гранта" (русский канон)
runTest('J: Лада (отечественная)', 'стойка стабилизатора лада гранта в наличии 2 штуки 1200', { name: 'Стойка стабилизатора Лада Гранта', avail: 'in', stock: 2, price: 1200, car: 'Лада' });

runTest('NEW-1: Haval Jolion', 'haval jolion фильтр салона в наличии 5 штук 800 рублей', { avail: 'in', stock: 5, price: 800, car: 'Haval', model: 'Jolion' });
runTest('NEW-2: Chery Tiggo', 'chery tiggo 7 pro тормозные колодки под заказ', { avail: 'out', car: 'Chery', model: 'Tiggo' });
runTest('NEW-3: Mercedes GLC', 'mercedes glc амортизатор задний левый в наличии 1 шт 15000', { avail: 'in', stock: 1, price: 15000, car: 'Mercedes', model: 'GLC' });
// ИСПРАВЛЕНО: Ждем "ГАЗ Газель" (русский канон)
runTest('NEW-4: ГАЗель Next', 'газель next рулевая тяга в наличии 2 штуки 3500', { avail: 'in', stock: 2, price: 3500, car: 'ГАЗ', model: 'Газель' });
// ИСПРАВЛЕНО: Ждем "УАЗ Патриот" (русский канон)
runTest('NEW-5: УАЗ Патриот', 'уаз патриот редуктор передний под заказ 3 дня', { avail: 'out', car: 'УАЗ', model: 'Патриот' });

console.log("--- ГОТОВО ---");
process.exit(0);
"""

output_path = '/tmp/parser_test_v6.js'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(test_harness)

print(f"Файл создан: {output_path}")

cmd = ['docker', 'run', '--rm', '-v', '/tmp:/host', '--entrypoint', 'node', 'zap_app_image', '/host/parser_test_v6.js']
print("\n>>> ЗАПУСК В DOCKER <<<")
try:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
except Exception as e:
    print(f"Ошибка запуска Docker: {e}")
