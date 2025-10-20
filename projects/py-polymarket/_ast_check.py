import ast, pathlib, sys
path = pathlib.Path("src/polymarket/services/runner.py")
with path.open('r', encoding='utf-8') as f:
    data = f.read()
try:
    ast.parse(data)
except SyntaxError as exc:
    print(exc)
    sys.exit(1)
