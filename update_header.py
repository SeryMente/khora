import sys

def update_header(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    new_header = "# @l0 L0-002 · @req ING-03/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua UA-05\n"

    # Remove old headers
    out_lines = [new_header]
    for line in lines:
        if line.startswith("# @l0") or line.startswith("# @req") or line.startswith("# @acr") or line.startswith("# @ua"):
            continue
        out_lines.append(line)

    with open(filepath, 'w') as f:
        f.writelines(out_lines)

update_header("kernel/src/khora_kernel/motor/_memoria.py")
update_header("kernel/src/khora_kernel/poblacion/_ingestar.py")
