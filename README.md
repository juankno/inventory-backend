# inventory-backend

API REST del sistema de inventario para micronegocios minoristas (trabajo de grado, Politécnico Grancolombiano). La consume la aplicación móvil [`inventory-mobile`](../inventory-mobile) a través del contrato `/api/v1` (DDS v1.1, sección 8.1).

**Stack:** Node.js 22, Express 5, Prisma ORM 7.10 con `@prisma/adapter-pg`, PostgreSQL, TypeScript y Jest.

## Primeros pasos

Requisitos: Node.js 22 o superior y PostgreSQL (o Docker).

```bash
cp .env.example .env          # ajusta DATABASE_URL y JWT_SECRET
docker compose up -d          # opcional: PostgreSQL local en el puerto 5432
npm install
npm run prisma:generate       # genera el cliente en src/generated/prisma
npm run prisma:migrate        # aplica las migraciones
npm run prisma:seed           # crea la cuenta de demostración (RO-01)
npm run dev                   # http://localhost:3000/api/v1/health
```

La cuenta de demostración es `demo@inventario.local`, con la contraseña de `SEED_DEMO_PASSWORD` y los 20 productos del Apéndice B de la ERS (2 agotados y 2 por agotarse). El script se puede ejecutar varias veces y siempre deja la cuenta en el mismo estado.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Inicia la API con recarga automática. |
| `npm run build` / `npm start` | Compila a `dist/` y la ejecuta. |
| `npm run typecheck` | Revisa los tipos sin compilar. |
| `npm test` | Ejecuta las pruebas unitarias con Jest. |
| `npm run prisma:migrate` | Crea o aplica migraciones en desarrollo. |
| `npm run prisma:seed` | Carga los datos semilla. |

## Estructura (DDS 5.1.3)

```
inventory-backend/
├── prisma/
│   ├── schema.prisma          modelo de datos (DDS, Apéndice A)
│   ├── migrations/            incluye las restricciones CHECK de DDS 7.3
│   └── seed.ts                datos semilla (RO-01)
├── prisma.config.ts
└── src/
    ├── main.ts                arranque de Express
    ├── app.ts                 construcción de la app y montaje de /api/v1
    ├── generated/prisma/      cliente generado por Prisma (no se versiona)
    ├── shared/
    │   ├── errors/            AppError y traducción a {code, message}
    │   └── infrastructure/    configuración y cliente de Prisma
    └── modules/
        ├── auth/              domain · application · infrastructure · presentation
        ├── products/
        ├── movements/
        └── inventory/
```

Las dependencias apuntan hacia adentro: `domain` no conoce a nadie, `application` solo a `domain`, e `infrastructure` y `presentation` dependen de las capas internas (B-01). Los servicios externos se usan a través de puertos (DDS Tabla 10) para poder probar los casos de uso con implementaciones en memoria.

## Convenciones

- Código, base de datos, rutas y valores de enums en inglés; mensajes al usuario en español (G-07).
- Los errores se responden como `{ "code": "INSUFFICIENT_STOCK", "message": "…" }` con los códigos 400, 401, 404 o 409 (DDS Tabla 19).
- El negocio se obtiene siempre del token, nunca del cuerpo de la petición (B-07).
- Los GTIN de los datos semilla son de prueba (prefijo GS1 `20`). Hay que reemplazarlos por los GTIN reales de los productos de la evaluación.
"# inventory-backend" 
