import re, json, sys

file_path = '/root/zapdemo/public/admin.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Ищем начало объекта MODEL_MAP
start_marker = "var MODEL_MAP={"
prefix_len = len("var MODEL_MAP=") # 14 символов!

idx_start = content.find(start_marker)
if idx_start == -1:
    print("ERROR: MODEL_MAP not found"); sys.exit(1)

# Находим конец объявления (первый ; после начала)
line_end_idx = content.find(';', idx_start)
if line_end_idx == -1:
    print("ERROR: Closing semicolon not found"); sys.exit(1)

# Извлекаем чистый JSON объект {...}
mm_str = content[idx_start + prefix_len : line_end_idx]

try:
    mm_data = json.loads(mm_str)
except Exception as e:
    print(f"ERROR parsing JSON: {e}"); sys.exit(1)

# Список замен [старый_канон -> новый_русский_канон]
replacements = {
    "Granta": "Гранта",
    "Kalina": "Калина",
    "Niva Travel": "Нива Тревел",
    "Niva Legend": "Нива Легенд",
    "Largus": "Ларгус",
    "XRAY": "Иксрей",
    "Priora": "Приора",
    "Vesta": "Веста",
    "Gazel": "Газель",
    "Sobol": "Соболь",
    "Next": "Некст",
    "Patriot": "Патриот",
    "Hunter": "Хантер",
    "Buhanka": "Буханка"
}

changed_count = 0
for alias, val in mm_data.items():
    brand, model = val[0], val[1]
    if brand in ["Лада", "ВАЗ", "ГАЗ", "УАЗ"]:
        if model in replacements:
            new_model = replacements[model]
            mm_data[alias][1] = new_model
            changed_count += 1

new_mm_json = json.dumps(mm_data, ensure_ascii=False, separators=(',', ':'))
new_content = content[:idx_start + prefix_len] + new_mm_json + content[line_end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"SUCCESS: Updated {changed_count} entries to Russian canons.")
