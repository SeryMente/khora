import sys
from .repl import TerminalRepl

def main() -> None:
    # Por defecto iniciamos con los motores como None,
    # El usuario o un wrapper deberá instanciar los motores reales.
    repl = TerminalRepl()
    try:
        repl.cmdloop()
    except KeyboardInterrupt:
        print("\nSaliendo de la terminal...")
        sys.exit(0)

if __name__ == "__main__":
    main()
