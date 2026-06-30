# Guardar todo en GitHub

Este directorio ya es un repo git con un commit inicial. Para subirlo a tu
cuenta (repo privado recomendado), corre desde `comind-suite/`:

```bash
# 1) Crea el repo vacio en github.com (sin README), p.ej. SeryMente/comind
# 2) Conecta y sube:
git remote add origin https://github.com/SeryMente/comind.git
git branch -M main
git push -u origin main
```

Si usas GitHub CLI (`gh`), en un solo paso:
```bash
gh repo create SeryMente/comind --private --source=. --remote=origin --push
```

Autenticacion: usa un Personal Access Token o `gh auth login`. **Nunca**
pegues el token en el codigo; .gitignore ya excluye `.env`.
