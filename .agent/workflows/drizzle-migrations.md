# Drizzle Migrations Workflow (Docker)

Sigue estos pasos cada vez que cambies el archivo `schema.ts`.

## 1. Generar la migración
Una vez que hayas editado `schema.ts`, debes generar el archivo SQL que Drizzle usará para actualizar la base de datos:

```bash
docker exec baske-finance-dev-api bun run db:generate
```
*Esto creará un nuevo archivo `.sql` en `api/drizzle/`.*

## 2. Aplicar la migración
Aunque el contenedor intenta aplicar las migraciones al iniciar, puedes forzarlo manualmente si el API está fallando por falta de columnas:

```bash
docker exec baske-finance-dev-api bun run db:migrate
```

## Resumen de Comandos
| Acción | Comando |
| :--- | :--- |
| **Generar SQL** | `docker exec baske-finance-dev-api bun run db:generate` |
| **Aplicar cambios** | `docker exec baske-finance-dev-api bun run db:migrate` |

---
> [!TIP]
> Si alguna vez ves el error `column "xyz" does not exist`, usualmente significa que olvidaste el Paso 1.
