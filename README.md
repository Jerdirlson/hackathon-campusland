# hackathon-campusland

Repositorio del proyecto del **Hackathon Campusland** (Bucaramanga) — sistema de apoyo a la operación de **Metrolínea**.

El repo está organizado por módulos para que cada parte del sistema sea independiente:

| Módulo | Descripción |
|---|---|
| [`ai/`](./ai) | IA self-hosted en Docker. Recibe tiempos de paradas y conteo de pasajeros por cámara, recomienda cuándo despachar buses extra. |

## Próximos módulos (planificados)

- `cameras/` — captura desde cámaras a bordo y envío al módulo `ai/`.
- `dashboard/` — panel de operadores con rutas, ocupación y decisiones.
- `data/` — datasets compartidos y scripts de simulación.

## Cómo empezar

Ver el README específico de cada módulo. Para arrancar la IA:

```bash
cd ai
cp .env.example .env
docker compose up --build
```
