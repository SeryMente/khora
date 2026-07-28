import toml
with open("kernel/pyproject.toml", "r") as f:
    data = toml.load(f)
assert data["project"].get("dependencies", []) == [], "Dependencies must be empty!"
print("Zero dependencies rule check passed.")
