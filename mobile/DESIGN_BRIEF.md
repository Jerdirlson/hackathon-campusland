# Design Brief — Metrolínea App

Documento base para pasar a Claude Design (u otra herramienta de diseño) y generar las pantallas.

> **Stack frontend:** Vue 3 + Ionic + Capacitor. El mismo código compilará a:
> - **App móvil** iOS / Android (Capacitor).
> - **Pantallas de terminales** (build web servido en modo kiosko en pantallas grandes).

---

## 1. Contexto y producto

**Producto:** Aplicación oficial de **Metrolínea**, el Sistema Integrado de Transporte Masivo (SITM) de Bucaramanga y su área metropolitana.

**Operación:** BRT (Bus Rapid Transit) con carriles exclusivos, ~139 estaciones, ~245.000 pasajeros/día. Sistema operado desde 2010. Pago con tarjeta inteligente.

**Diferenciador del producto frente a apps similares (Moovit, Citymapper):** consumir directamente datos en tiempo real del sistema y **mostrar la inteligencia operativa del módulo `ai/`** — ocupación real medida por cámaras en los buses y recomendaciones de despacho.

---

## 2. Audiencias

| Audiencia | Dispositivo | Necesidades |
|---|---|---|
| **Pasajero** | Móvil personal | Saber cuándo llega el próximo bus, qué tan lleno viene, planear viaje, ver rutas. |
| **Pasajero en terminal** | Pantalla grande en estación / portal | Ver llegadas inminentes a esa terminal con visibilidad a 5–10 metros. |
| **Operador / supervisor** | Tablet o desktop kiosko | Ver recomendaciones de despacho de la IA, ocupación promedio por ruta, retrasos. |

---

## 3. Marca

### 3.1 Personalidad
- **Confiable** (es servicio público).
- **Eficiente** (la app reduce tiempo de espera, hace el sistema más predecible).
- **Sostenible** (eje ambiental, "aire limpio" — parte de la misión).
- **Cercana** (lenguaje claro en español colombiano, sin tecnicismos).

### 3.2 Tono de voz
- Directo y útil. "Tu bus llega en 3 min", no "Próximo arribo: 03:00".
- Empático con la espera ("Sabemos que el tiempo cuenta").
- Cero jerga técnica del backend hacia el pasajero (no decir "occupancy ratio").

### 3.3 Paleta de color

Inspirada en los buses verdes icónicos y en la transición a "blanco con detalles verdes" anunciada por la operación.

| Rol | Token | Hex | Uso |
|---|---|---|---|
| **Primary / Brand** | `--ml-green` | `#6FBA2C` | Color principal Metrolínea, botones primarios, header pasajero, indicadores positivos. |
| **Primary dark** | `--ml-green-dark` | `#3F7A14` | Hover, estados activos, texto sobre fondos claros con énfasis. |
| **Primary light** | `--ml-green-light` | `#D9F0C4` | Fondos suaves de éxito, badges, estado "bus disponible". |
| **Accent / Lime** | `--ml-lime` | `#96BD0D` | Acento secundario (alineado al sitio actual de Metrolínea), highlights. |
| **Surface** | `--ml-surface` | `#FFFFFF` | Fondo de tarjetas, pantalla pasajero. |
| **Background** | `--ml-bg` | `#F4F6F4` | Fondo general app móvil. |
| **Ink / Texto** | `--ml-ink` | `#1B2A1A` | Texto principal (verde-negro, no negro puro — más cálido). |
| **Ink-2 / Secundario** | `--ml-ink-2` | `#5C6B5A` | Texto secundario, labels. |
| **Divider** | `--ml-divider` | `#E4E8E2` | Líneas, bordes sutiles. |
| **Warning** | `--ml-warn` | `#F4B400` | Demora moderada, ocupación media-alta. |
| **Danger** | `--ml-danger` | `#D43A1F` | Bus saturado, demora crítica, alertas. |
| **Info** | `--ml-info` | `#0E6BA8` | Avisos del operador, notificaciones generales. |

**Variante para pantallas de terminal (kiosko):** modo oscuro estilo tablero de aeropuerto.

| Rol | Token | Hex |
|---|---|---|
| Fondo | `--ml-kiosk-bg` | `#0B1A0B` |
| Texto principal | `--ml-kiosk-fg` | `#E8F4E0` |
| Verde de marca (alto contraste) | `--ml-kiosk-green` | `#A6E04A` |
| Acento amarillo (atención) | `--ml-kiosk-warn` | `#FFD23F` |

> Validar con la oficina de Metrolínea si el hackathon avanza: los colores oficiales pueden ajustarse al manual de identidad que ellos publiquen.

### 3.4 Tipografía

- **Display / Numbers (tiempos de llegada):** `Inter Tight` o `Manrope`, tracking ajustado, **muy grande en terminales**.
- **Body:** `Inter` (gran legibilidad a pantalla, soporta diacríticos del español).
- **Mono (códigos de ruta, IDs de bus):** `JetBrains Mono` opcional.

Escala (mobile):

| Token | Tamaño | Uso |
|---|---|---|
| `display-xl` | 56 / 64 | Minutos hasta llegada (tarjeta principal). |
| `display-lg` | 40 / 48 | Headings de sección. |
| `title` | 22 / 28 | Títulos de cards. |
| `body-lg` | 18 / 26 | Texto principal. |
| `body` | 16 / 24 | Texto general. |
| `caption` | 13 / 18 | Labels, metadatos. |

Para terminales aumentar todas 1.6×–2× (la pantalla se lee desde 3-5 metros).

### 3.5 Iconografía
- **Ionicons** (viene con Ionic) como librería base — coherente con iOS/Android.
- Iconos clave: 🚌 bus, 📍 parada, 🕐 reloj, 👥 ocupación, ⚠️ alerta, 🔃 recargar.
- Estilo: outline para inactivos, filled para activos.

### 3.6 Tono visual / componentes
- **Bordes redondeados** generosos (16–20px) para sensación amigable.
- **Cards con sombra suave** (`0 2px 8px rgba(0,0,0,0.06)`).
- **Chips/badges** para ocupación: 🟢 Baja · 🟡 Media · 🔴 Alta.
- **Animaciones sutiles** en cambios de estado (skeleton loaders, no spinners genéricos).
- **Accesibilidad:** mínimo AA WCAG. Contraste reforzado en variante terminal.

---

## 4. Información que la app va a mostrar

Datos disponibles desde el módulo `ai/` (REST en `http://<host>:8000`):

| Dato | Endpoint | Uso visual |
|---|---|---|
| Lista de rutas activas | `GET /routes` | Selector / búsqueda. |
| Próximas paradas/llegadas | (futuro) `GET /arrivals/{stop_id}` | Cards de llegada con minutos. |
| Ocupación de un bus | `GET /occupancy/{bus_id}` | Chip de color en card. |
| Recomendación de despacho | `GET /decision/{route_id}` | Solo vista operador. |

> Para la demo se puede cargar data sintética desde `ai/data/sample_stop_times.csv`.

---

## 5. Pantallas propuestas

Marca con ✅ las que quieras priorizar en el primer sprint de diseño.

### 5.1 App pasajero

- [ ] **Onboarding** (3 slides: bienvenida, permisos, lista para usar).
- [ ] **Home / Inicio** — última parada usada + favoritos + búsqueda rápida.
- [ ] **Detalle de parada** — lista de próximas llegadas con ocupación por bus.
- [ ] **Detalle de ruta** — mapa o lista de paradas + buses en vivo con ocupación.
- [ ] **Buscar ruta** — autocompletar por nombre/número de ruta.
- [ ] **Favoritos** — paradas guardadas con tiempos en vivo.
- [ ] **Notificaciones** — "Tu bus llega en 2 min", "Ruta saturada".
- [ ] **Perfil/Ajustes** — tema, idioma, tamaño de texto.

### 5.2 Pantalla de terminal (kiosko)

- [ ] **Tablero de llegadas** — estilo aeropuerto, próximas 6–10 llegadas a esa terminal en grandes números, autorrefresco cada 15s.
- [ ] **Mapa de ocupación** — diagrama del sistema con códigos de color por ruta.
- [ ] **Aviso operativo** — pantalla a todo color para comunicar incidentes (`Ruta X interrumpida`).

### 5.3 Vista operador (opcional para demo)

- [ ] **Dashboard de decisiones** — tarjetas por ruta con recomendación de despacho (`/decision/{route_id}`) + métricas (ocupación promedio, retraso promedio).
- [ ] **Historial de despachos** — cuándo se sugirió un refuerzo y qué pasó después.

---

## 6. Principios UX

1. **El minuto manda.** El tiempo hasta el próximo bus es el dato más grande y visible en cualquier pantalla.
2. **Una decisión a la vez.** No abrumar con datos en la pantalla de pasajero.
3. **Estado siempre visible.** Hora de última actualización + indicador de conexión arriba a la derecha.
4. **Funciona sin internet (degradado).** Mostrar último valor en cache cuando falle la red, no pantalla vacía.
5. **Pulgar primero.** Acciones primarias en el tercio inferior de la pantalla móvil.
6. **Modo terminal ≠ modo móvil.** Las pantallas grandes no son apps móviles infladas: son tableros pasivos, alta legibilidad, cero interacción táctil esperada.

---

## 7. Entregable esperado del diseño

Para empezar a desarrollar necesitamos al menos:

1. **3 pantallas** del flujo pasajero (Home + Detalle de parada + Detalle de ruta).
2. **1 pantalla** para terminal en modo kiosko (Tablero de llegadas).
3. Componentes reutilizables identificados (card de llegada, chip de ocupación, header con búsqueda).
4. Estados: vacío, cargando, error, sin conexión.
5. Versión móvil y versión "tablet/pantalla grande" (responsive con breakpoint a ~1024px).

---

## 8. Referencias visuales útiles

- **Moovit** — cards de llegada con ocupación.
- **Citymapper** — claridad tipográfica y jerarquía.
- **TransMilenio app** — referencia local de BRT colombiano.
- **Tableros de Renfe / DB Bahn** — para el modo terminal.

---

## 9. Próximo paso

1. Confirmar paleta de color (verde Metrolínea propuesto: `#6FBA2C`).
2. Confirmar tipografía (Inter + Inter Tight).
3. Priorizar 3–4 pantallas para el primer round de diseño.
4. Generar mockups (Claude Design / Figma).
5. Scaffold de proyecto `mobile/` con Ionic + Vue una vez aprobado el diseño.
