# Reforma Agent — Prompt v3 para empezar a programar

Documento preparado para pegar en Codex, Claude Code o Cursor como contexto de proyecto y guía de implementación incremental.

La versión v3 incorpora estas decisiones:

- Stack recomendado: **Next.js App Router + TypeScript + Supabase + worker TypeScript**.
- La app será una **PWA web**, no una app nativa.
- Supabase será la fuente de verdad: Auth, Postgres, Storage privado y RLS.
- La IA no analizará fotos en el MVP.
- Las fotos serán evidencias asociadas a visitas, zonas, gremios, incidencias o decisiones.
- La IA sí podrá trabajar sobre audios transcritos, notas escritas y documentos/partidas textuales.
- NanoClaw, OpenClaw y Telegram no serán dependencias core del MVP.
- El procesamiento IA irá en un **worker separado**, no dentro de requests web largas de Next.js.
- El proyecto debe documentarse paso a paso para aprendizaje propio y publicación open source.

---

# 1. Cómo usar este documento

No pegues todo este documento repetidamente.

La forma correcta de trabajar es:

```text
1. Crear un repositorio vacío.
2. Pegar el "Prompt de arranque — Fase 0" en Codex / Claude Code / Cursor.
3. Dejar que cree la estructura inicial, documentación y checks.
4. Revisar el diff.
5. Ejecutar localmente.
6. Pasar a la siguiente fase con un prompt pequeño.
7. Mantener AGENTS.md, CLAUDE.md y PLAN.md como contexto persistente del repo.
```

El prompt largo debe convertirse en documentación del repositorio. Las instrucciones futuras deben ser cortas, específicas y por fases.

---

# 2. Prompt de arranque — Fase 0

Copia y pega este bloque en Codex, Claude Code o Cursor dentro de un repositorio vacío.

```text
Actúa como un ingeniero full-stack senior y como mantenedor de un proyecto open source.

Quiero construir `reforma-agent`, una PWA open source para seguimiento inteligente de reformas de vivienda.

Contexto del producto:
Una persona visita periódicamente una obra de reforma para documentar el avance y comunicarlo a propietarios que viven fuera del país. La app debe permitir registrar visitas, subir fotos como evidencias, subir audios, transcribir audios, crear resúmenes, gestionar incidencias, decisiones pendientes, documentos técnicos, presupuesto por partidas y memoria técnica.

Decisiones de arquitectura:
- Usa Next.js App Router + TypeScript para la app web/PWA.
- Usa Supabase para Auth, Postgres, Storage privado y Row Level Security.
- Usa un worker separado en Node.js/TypeScript para jobs IA y tareas largas.
- Usa Zod para validar inputs/outputs de dominio e IA.
- Usa Vitest para tests.
- Usa pnpm.
- Diseña como monorepo simple.
- No implementes análisis IA de imágenes en el MVP.
- Las fotos son evidencias; no deben analizarse con visión IA.
- No uses NanoClaw, OpenClaw ni Telegram como dependencias core.
- No metas transcripción o procesos IA largos dentro de requests web normales.
- No añadas secretos reales.
- No uses datos reales; solo datos sintéticos.
- Documenta todo en español, pero usa nombres de código, tablas y variables en inglés.

Principio central:
La app es la fuente de verdad.
El worker IA es un procesador controlado.
La IA propone borradores revisables, no toma decisiones finales.
Las fotos son evidencia visual, no input interpretado automáticamente por IA.

Objetivo de esta fase:
Crear únicamente la base del repositorio. No implementes funcionalidad de negocio todavía.

Tareas de Fase 0:
1. Inicializa el proyecto como monorepo pnpm.
2. Crea `apps/web` con Next.js App Router + TypeScript.
3. Crea `apps/worker` como worker Node.js/TypeScript básico, aunque todavía no procese jobs reales.
4. Crea `packages/core` para tipos, enums y validadores de dominio.
5. Crea `packages/ai` para interfaces de proveedor IA y prompts futuros.
6. Crea `packages/db` para helpers futuros de Supabase.
7. Crea carpeta `supabase/` para migraciones, seeds y políticas RLS futuras.
8. Crea documentación base:
   - `README.md`
   - `AGENTS.md`
   - `CLAUDE.md`
   - `PLAN.md`
   - `docs/es/00-vision-producto.md`
   - `docs/es/01-arquitectura.md`
   - `docs/es/02-modelo-datos.md`
   - `docs/es/03-seguridad-privacidad.md`
   - `docs/es/04-ia-y-worker.md`
   - `docs/es/05-desarrollo-local.md`
   - `docs/es/06-roadmap.md`
   - `docs/adr/0001-stack-next-supabase-worker.md`
   - `docs/adr/0002-no-vision-ia-en-mvp.md`
   - `docs/adr/0003-no-nanoclaw-openclaw-core.md`
9. Crea `.env.example` con variables necesarias, sin secretos reales.
10. Añade scripts:
   - `dev`
   - `build`
   - `lint`
   - `typecheck`
   - `test`
   - `format`, si añades formatter.
11. Configura TypeScript strict.
12. Añade un test mínimo en `packages/core`.
13. Añade una página inicial simple en `apps/web` que explique que el proyecto está en Fase 0.
14. Añade un worker mínimo que arranque y escriba un log controlado.
15. Ejecuta los checks disponibles.
16. Actualiza `PLAN.md` marcando Fase 0 como completada solo si los checks pasan.

Restricciones:
- No implementes Supabase real todavía.
- No crees tablas todavía.
- No implementes autenticación todavía.
- No implementes IA real todavía.
- No instales librerías innecesarias.
- No crees una arquitectura excesiva.
- No implementes más allá de Fase 0.

Formato de salida al terminar:
1. Resumen de lo implementado.
2. Estructura de carpetas creada.
3. Archivos principales modificados.
4. Comandos ejecutados y resultado.
5. Decisiones tomadas.
6. Problemas o checks que no hayan podido ejecutarse.
7. Prompt recomendado para iniciar la Fase 1.
```

---

# 3. Prompt para continuar — Fase 1

Usa este prompt solo después de revisar y confirmar que Fase 0 está bien.

```text
Implementa únicamente la Fase 1 de `reforma-agent`: modelo de datos Supabase, migraciones iniciales, enums, RLS base y seed sintético.

Antes de tocar código:
1. Lee `README.md`, `AGENTS.md`, `CLAUDE.md`, `PLAN.md` y los docs en `docs/es`.
2. Resume brevemente tu plan.
3. No cambies decisiones de arquitectura salvo que encuentres un bloqueo real.

Objetivo:
Crear el modelo de datos inicial y políticas de seguridad base.

Tablas mínimas:
- profiles
- projects
- project_members
- zones
- trades
- visits
- evidence
- documents
- contract_items
- issues
- decisions
- agent_jobs
- audit_log

Enums mínimos:
- project_role: owner, admin, editor, viewer
- project_status: active, paused, completed, archived
- visit_status: draft, published, archived
- evidence_type: photo, audio, video, document
- document_type: plan, quote, technical_memory, annex, invoice, warranty, change_order, other
- issue_status: ai_draft, open, in_review, waiting_builder, waiting_owner, resolved, closed, rejected
- decision_status: ai_draft, pending, approved, rejected, superseded, closed
- priority: low, medium, high, critical
- job_type: transcribe_audio, extract_visit, generate_visit_summary, suggest_issues, suggest_decisions, generate_weekly_summary
- job_status: pending, processing, completed, failed, cancelled

Requisitos de seguridad:
- Activar RLS en todas las tablas de datos de proyecto.
- Las políticas deben basarse en `project_members`.
- Nunca exponer service role al cliente.
- Crear helpers SQL si simplifican las políticas.
- Añadir comentarios en SQL para explicar las políticas.
- Storage todavía puede quedar documentado si no se implementa completamente en esta fase.

Requisitos de documentación:
- Actualiza `docs/es/02-modelo-datos.md`.
- Actualiza `docs/es/03-seguridad-privacidad.md`.
- Actualiza `PLAN.md`.
- Añade un diagrama Mermaid sencillo del modelo.
- Documenta cualquier decisión en un ADR si cambia el diseño.

Requisitos de calidad:
- Añade tipos/enums equivalentes en `packages/core`.
- Añade validadores Zod básicos.
- Añade tests para enums y validadores.
- Ejecuta lint, typecheck y tests.
- Si Supabase CLI no está disponible, documenta exactamente qué no se pudo ejecutar y deja los comandos preparados.

No implementar:
- UI de autenticación.
- Subida de archivos.
- Worker real.
- IA real.
- Telegram.
- Análisis de imágenes.

Formato de salida:
1. Resumen de cambios.
2. Migraciones creadas.
3. Políticas RLS creadas.
4. Tests añadidos.
5. Comandos ejecutados.
6. Riesgos o dudas.
7. Prompt sugerido para Fase 2.
```

---

# 4. Prompt para continuar — Fase 2

```text
Implementa únicamente la Fase 2: autenticación, proyectos y membresías.

Antes de tocar código, lee `PLAN.md`, `AGENTS.md`, `CLAUDE.md`, docs y migraciones existentes.

Objetivo:
Permitir que un usuario autenticado cree un proyecto de reforma, vea sus proyectos y gestione membresías básicas.

Requisitos:
- Integrar Supabase Auth en Next.js App Router.
- Crear clientes Supabase de servidor y cliente correctamente.
- Crear rutas/páginas:
  - login
  - logout
  - listado de proyectos
  - crear proyecto
  - dashboard de proyecto
  - ajustes básicos de proyecto
- Crear `profile` si no existe.
- Crear proyecto con el usuario como owner.
- Respetar RLS.
- No exponer service role al navegador.
- Añadir tests donde sea razonable.
- Actualizar documentación.

Roles:
- owner: control total del proyecto.
- admin: gestión del proyecto salvo borrar owner.
- editor: puede crear visitas, evidencias, incidencias y decisiones.
- viewer: solo lectura.

No implementar todavía:
- Subida de fotos.
- Audio.
- IA.
- Worker real.
- Documentos.
- Presupuesto por partidas.

Formato de salida igual que fases anteriores.
```

---

# 5. Prompt para continuar — Fase 3

```text
Implementa únicamente la Fase 3: zonas, gremios, documentos y partidas del presupuesto.

Objetivo:
Permitir configurar el proyecto con zonas/estancias, gremios, documentos técnicos y partidas estructuradas del presupuesto.

Requisitos UI:
- Pantalla de zonas.
- Pantalla de gremios.
- Pantalla de documentos.
- Pantalla de partidas del presupuesto.
- Crear/editar/eliminar con permisos.
- Listados simples, sin diseño complejo.

Requisitos documentos:
- Subir documentos a Supabase Storage privado.
- Guardar metadatos en `documents`.
- Tipos: plan, quote, technical_memory, annex, invoice, warranty, change_order, other.
- No procesar PDF con IA todavía.
- No hacer OCR.
- No analizar planos.

Requisitos partidas:
- Crear partidas manualmente.
- Importar partidas desde CSV simple si es viable.
- Campos: code, title, description, trade_id, zone_id, quantity, unit, unit_price, total_amount, included_excluded, source_document_id, source_page, notes.
- Validar importación con Zod.
- Registrar errores de importación de forma clara.

Documentación:
- Actualiza docs de modelo, seguridad y uso.
- Añade ejemplo de CSV.

No implementar:
- IA documental.
- Análisis automático de PDFs.
- Chat.
- Telegram.
- Análisis de imágenes.
```

---

# 6. Prompt para continuar — Fase 4

```text
Implementa únicamente la Fase 4: visitas de obra y evidencias.

Objetivo:
Permitir crear visitas desde móvil, añadir notas y subir fotos/audios como evidencias.

Requisitos:
- Crear visita.
- Editar visita en estado draft.
- Publicar visita.
- Añadir zona y gremio principal a la visita.
- Subir fotos como evidencia.
- Subir audios como evidencia.
- Añadir nota manual a cada foto.
- Añadir nota manual a cada audio.
- Relacionar evidencia con visita, zona y gremio.
- Galería simple de evidencias.
- Storage privado.
- Acceso mediante URLs firmadas cuando corresponda.
- No usar IA de visión.
- No transcribir todavía, salvo crear la estructura para job posterior.

Flujo:
1. Usuario crea visita.
2. Añade nota escrita.
3. Sube fotos.
4. Sube audio.
5. Guarda visita como draft.
6. Publica cuando esté revisada.

No implementar:
- IA real.
- Resumen automático.
- Incidencias automáticas.
- Decisiones automáticas.
- Análisis de fotos.
```

---

# 7. Prompt para continuar — Fase 5

```text
Implementa únicamente la Fase 5: worker de jobs y transcripción de audio.

Objetivo:
Crear el procesamiento asíncrono controlado para transcribir audios de visitas.

Requisitos:
- Crear `agent_jobs` al subir un audio.
- Implementar worker Node/TypeScript que procese jobs pending.
- Implementar locking/idempotencia básica para evitar doble procesamiento.
- Implementar retries con attempt_count y error_message.
- Crear interfaz `AiProvider`.
- Implementar `MockAiProvider` para tests.
- Implementar proveedor real opcional para transcripción si existe API key.
- Guardar transcripción asociada al audio/evidence.
- Permitir editar manualmente la transcripción.
- Marcar jobs como completed/failed.
- Añadir logs claros, sin exponer secretos.
- Añadir tests del worker con MockAiProvider.

No implementar:
- Extracción de incidencias.
- Extracción de decisiones.
- Resumen semanal.
- Análisis de imágenes.
- NanoClaw/OpenClaw.
```

---

# 8. Prompt para continuar — Fase 6

```text
Implementa únicamente la Fase 6: extracción IA textual desde visitas.

Objetivo:
A partir de la transcripción editada y notas escritas de una visita, generar borradores revisables de:
- resumen de visita
- posibles incidencias
- posibles decisiones pendientes
- acciones recomendadas

Requisitos:
- La IA solo puede usar texto: transcripción, notas, metadatos de zona/gremio y partidas/documentos textuales si están disponibles.
- No puede usar fotos como input IA.
- Las fotos solo se referencian como evidencias asociadas.
- Validar outputs con Zod.
- Si el output IA no valida, guardar error y no crear datos inconsistentes.
- Crear borradores con `ai_draft`.
- Usuario debe aprobar, editar o rechazar cada borrador.
- La IA no debe afirmar incumplimientos contractuales definitivos.
- La IA debe distinguir:
  - hecho observado por el usuario
  - sospecha
  - recomendación
  - dato pendiente de confirmar
- Añadir prompts en `packages/ai/prompts`.
- Añadir tests para parsers y validadores.

No implementar:
- Envío automático al constructor.
- Aprobación automática de cambios.
- Reclamaciones.
- Análisis de imágenes.
```

---

# 9. Prompt para continuar — Fase 7

```text
Implementa únicamente la Fase 7: dashboard de seguimiento y revisión humana.

Objetivo:
Crear un dashboard útil para propietarios y para la persona que visita obra.

Requisitos:
- Dashboard de proyecto con:
  - estado general
  - última visita
  - visitas recientes
  - incidencias abiertas
  - decisiones pendientes
  - documentos principales
  - partidas con estado
- Vista de revisión de borradores IA.
- Acciones:
  - aprobar borrador
  - editar y aprobar
  - rechazar
- Audit log para acciones relevantes.
- Diferenciar claramente contenido humano y contenido generado por IA.
- Añadir filtros por zona, gremio, prioridad y estado.
- UI mobile-first.

No implementar:
- Chat.
- Telegram.
- Análisis de imágenes.
- Automatismos externos.
```

---

# 10. Prompt para continuar — Fase 8

```text
Implementa únicamente la Fase 8: resumen semanal.

Objetivo:
Generar un resumen semanal revisable para propietarios.

Inputs:
- visitas publicadas
- incidencias abiertas/cerradas
- decisiones pendientes/aprobadas
- cambios de partidas si existen
- notas humanas
- transcripciones revisadas

Output:
- avances
- incidencias abiertas
- decisiones pendientes
- riesgos de coste
- riesgos de plazo
- preguntas para constructor
- próximos pasos

Requisitos:
- Crear job `generate_weekly_summary`.
- Generar borrador revisable.
- Permitir editar antes de publicar/compartir.
- No enviar automáticamente por email/Telegram/WhatsApp.
- Añadir documentación de uso.
```

---

# 11. Arquitectura objetivo

```text
reforma-agent/
  apps/
    web/
      Next.js App Router
      UI mobile-first
      auth
      dashboards
      forms
      upload flows
    worker/
      Node.js/TypeScript
      agent_jobs polling
      transcription
      extraction IA textual
      summaries
  packages/
    core/
      domain types
      enums
      Zod schemas
      shared utilities
    db/
      Supabase clients
      typed queries
      RLS-aware helpers
    ai/
      provider interface
      prompts
      output schemas
      parsers
      mock provider
  supabase/
    migrations/
    seed/
    policies/
  docs/
    es/
    adr/
```

---

# 12. Modelo de datos inicial

## profiles

```text
id uuid primary key references auth.users
email text
full_name text
created_at timestamptz
updated_at timestamptz
```

## projects

```text
id uuid primary key
name text
address_label text nullable
description text nullable
status project_status
created_by uuid references profiles
created_at timestamptz
updated_at timestamptz
```

No guardar dirección completa si no es necesario. `address_label` puede ser algo como "Piso Barcelona" o "Reforma cuñados".

## project_members

```text
id uuid primary key
project_id uuid references projects
user_id uuid references profiles
role project_role
created_at timestamptz
updated_at timestamptz
unique(project_id, user_id)
```

## zones

```text
id uuid primary key
project_id uuid references projects
name text
description text nullable
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Ejemplos: cocina, baño principal, baño secundario, salón, dormitorio 1, pasillo.

## trades

```text
id uuid primary key
project_id uuid references projects
name text
description text nullable
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Ejemplos: electricidad, fontanería, carpintería, tabiquería, pintura, cocina, zonas húmedas.

## documents

```text
id uuid primary key
project_id uuid references projects
type document_type
title text
storage_path text
original_filename text
mime_type text
size_bytes bigint
notes text nullable
uploaded_by uuid references profiles
created_at timestamptz
updated_at timestamptz
```

## contract_items

```text
id uuid primary key
project_id uuid references projects
source_document_id uuid references documents nullable
code text nullable
title text
description text nullable
trade_id uuid references trades nullable
zone_id uuid references zones nullable
quantity numeric nullable
unit text nullable
unit_price numeric nullable
total_amount numeric nullable
included_excluded text nullable
source_page text nullable
notes text nullable
status text default 'not_started'
created_at timestamptz
updated_at timestamptz
```

## visits

```text
id uuid primary key
project_id uuid references projects
title text
visit_date date
status visit_status
general_status text nullable
summary text nullable
human_notes text nullable
primary_zone_id uuid references zones nullable
primary_trade_id uuid references trades nullable
created_by uuid references profiles
published_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

## evidence

```text
id uuid primary key
project_id uuid references projects
visit_id uuid references visits nullable
type evidence_type
storage_path text
original_filename text
mime_type text
size_bytes bigint
zone_id uuid references zones nullable
trade_id uuid references trades nullable
manual_note text nullable
uploaded_by uuid references profiles
created_at timestamptz
updated_at timestamptz
```

Fotos: `type = photo`.  
Audios: `type = audio`.  
No guardar descripciones IA de fotos en MVP.

## audio_transcriptions

```text
id uuid primary key
project_id uuid references projects
evidence_id uuid references evidence
raw_transcript text
edited_transcript text nullable
language text nullable
provider text nullable
model text nullable
created_by_job_id uuid references agent_jobs nullable
created_at timestamptz
updated_at timestamptz
```

## issues

```text
id uuid primary key
project_id uuid references projects
visit_id uuid references visits nullable
title text
description text nullable
zone_id uuid references zones nullable
trade_id uuid references trades nullable
priority priority
status issue_status
review_state text default 'human_created'
source text default 'human'
contract_item_id uuid references contract_items nullable
cost_risk text nullable
schedule_risk text nullable
created_by uuid references profiles nullable
created_by_job_id uuid references agent_jobs nullable
created_at timestamptz
updated_at timestamptz
```

`review_state` puede ser `human_created`, `ai_draft`, `approved`, `edited`, `rejected`.

## decisions

```text
id uuid primary key
project_id uuid references projects
visit_id uuid references visits nullable
title text
description text nullable
options jsonb nullable
recommendation text nullable
zone_id uuid references zones nullable
trade_id uuid references trades nullable
priority priority
status decision_status
review_state text default 'human_created'
source text default 'human'
deadline date nullable
cost_impact text nullable
schedule_impact text nullable
created_by uuid references profiles nullable
created_by_job_id uuid references agent_jobs nullable
created_at timestamptz
updated_at timestamptz
```

## agent_jobs

```text
id uuid primary key
project_id uuid references projects
type job_type
status job_status
input jsonb
output jsonb nullable
error_message text nullable
attempt_count integer default 0
max_attempts integer default 3
locked_at timestamptz nullable
locked_by text nullable
created_by uuid references profiles nullable
created_at timestamptz
updated_at timestamptz
completed_at timestamptz nullable
```

## audit_log

```text
id uuid primary key
project_id uuid references projects nullable
actor_user_id uuid references profiles nullable
action text
entity_type text
entity_id uuid nullable
metadata jsonb nullable
created_at timestamptz
```

---

# 13. Reglas funcionales importantes

## Fotos

- Las fotos son evidencias.
- No se analizan automáticamente con IA.
- El usuario puede añadir nota manual.
- Se pueden relacionar con visita, zona, gremio, incidencia o decisión.
- Deben guardarse en storage privado.
- La UI debe mostrar miniaturas si es viable.
- El acceso debe controlarse por proyecto y membresía.

## Audios

- Los audios se guardan como evidencia.
- Cada audio puede generar un job de transcripción.
- La transcripción debe ser editable.
- Las extracciones IA deben usar la transcripción editada si existe.
- La transcripción original debe conservarse.

## Documentos

- Plano, presupuesto y memoria técnica son documentos principales.
- En el MVP, el plano no se interpreta automáticamente.
- El presupuesto debe convertirse a partidas manualmente o por CSV.
- La memoria técnica puede guardarse y consultarse; procesamiento IA documental avanzado queda para más adelante.
- La app debe permitir vincular incidencias/decisiones con partidas del presupuesto.

## IA

La IA puede:

- Transcribir audios.
- Resumir visitas desde texto.
- Proponer incidencias desde texto.
- Proponer decisiones pendientes desde texto.
- Generar resúmenes semanales.
- Relacionar una incidencia con una partida si hay coincidencia textual clara.

La IA no puede:

- Analizar fotos en el MVP.
- Afirmar incumplimientos contractuales definitivos.
- Aprobar cambios de coste.
- Enviar reclamaciones.
- Modificar documentos contractuales.
- Borrar evidencias.
- Tomar decisiones finales por los propietarios.

## Revisión humana

Todo contenido generado por IA debe quedar como borrador:

```text
ai_draft → edited/approved/rejected
```

El usuario debe revisar antes de publicar.

---

# 14. Principios de seguridad

- Activar RLS desde la primera migración real.
- Las consultas deben filtrar por proyecto y membresía.
- Usar buckets privados.
- No guardar service role en frontend.
- No loggear secretos.
- No usar datos reales en tests o seed.
- Minimizar datos personales.
- Separar permisos por rol.
- Mantener audit_log de acciones relevantes.
- En open source, documentar que cada usuario debe desplegar su propia instancia o configurar su propio Supabase.

---

# 15. Instrucciones para AGENTS.md

El archivo `AGENTS.md` debe contener instrucciones para Codex y agentes de coding:

```text
# AGENTS.md

## Proyecto

`reforma-agent` es una PWA open source para seguimiento inteligente de reformas.

## Stack

- Next.js App Router
- TypeScript strict
- Supabase Auth/Postgres/Storage/RLS
- Worker Node.js/TypeScript
- Zod
- Vitest
- pnpm

## Reglas no negociables

- No implementar análisis IA de fotos en el MVP.
- Las fotos son evidencias, no input de visión IA.
- No usar NanoClaw, OpenClaw o Telegram como dependencias core.
- No exponer service role al cliente.
- No ejecutar jobs IA largos dentro de requests web normales.
- Todo contenido IA debe ser borrador revisable.
- Documentar en español.
- Usar identificadores de código en inglés.
- Actualizar `PLAN.md` después de cada fase.
- Añadir o actualizar tests cuando se modifique lógica.
- Ejecutar lint, typecheck y tests antes de finalizar.
- Si un comando no puede ejecutarse, documentar el motivo.

## Flujo de trabajo

1. Leer `PLAN.md` antes de implementar.
2. Implementar solo la fase solicitada.
3. No adelantar funcionalidades de fases futuras.
4. Mantener cambios pequeños y revisables.
5. Al terminar, explicar cambios, comandos ejecutados y siguiente prompt sugerido.
```

---

# 16. Instrucciones para CLAUDE.md

El archivo `CLAUDE.md` debe contener instrucciones similares, optimizadas para Claude Code:

```text
# CLAUDE.md

This repository contains `reforma-agent`, an open source PWA for renovation tracking.

Use Spanish for product documentation and user-facing docs.
Use English for code identifiers, database names, variables and commits.

Core decisions:
- Next.js App Router + TypeScript.
- Supabase for Auth, Postgres, Storage and RLS.
- Separate Node/TypeScript worker for async AI jobs.
- No AI image analysis in the MVP.
- Photos are evidence only.
- No NanoClaw/OpenClaw as core dependencies.
- AI-generated content must be reviewable drafts.

Before coding:
- Read PLAN.md.
- Read docs/es.
- Implement only the requested phase.
- Prefer simple, maintainable code.
- Avoid unnecessary dependencies.
- Keep security and RLS in mind.
- Update docs and tests.

At the end of each task, report:
- What changed.
- Files touched.
- Commands run.
- Checks passed/failed.
- Risks.
- Recommended next phase prompt.
```

---

# 17. Criterios de aceptación globales

Una fase no está terminada si:

- No compila.
- No pasa typecheck.
- Rompe tests existentes.
- Falta documentación de los cambios.
- Se implementan funcionalidades fuera de fase.
- Se introducen dependencias core no aprobadas.
- Se exponen secretos.
- Se usa IA de visión para fotos.
- Se crean datos sin RLS cuando deberían tenerla.
- El worker y la app web quedan acoplados de forma difícil de testear.

---

# 18. Roadmap resumido

```text
Fase 0 — Bootstrap repo, docs, monorepo, checks.
Fase 1 — Supabase schema, enums, RLS, seed.
Fase 2 — Auth, profiles, projects, memberships.
Fase 3 — Zones, trades, documents, contract_items.
Fase 4 — Visits, evidence, storage upload.
Fase 5 — Worker, agent_jobs, audio transcription.
Fase 6 — Textual AI extraction: summaries, issue drafts, decision drafts.
Fase 7 — Review workflow and dashboard.
Fase 8 — Weekly summary.
Fase 9 — Deployment docs.
Fase 10 — Optional Telegram gateway.
Fase 11 — Optional NanoClaw gateway.
Fase 12 — Optional document intelligence.
```

---

# 19. Integraciones que quedan fuera del MVP

## Telegram

Puede añadirse más adelante como canal de captura o notificación.

Arquitectura futura recomendada:

```text
Telegram Bot
  → API propia de reforma-agent
  → Supabase
  → agent_jobs
  → worker
```

No debe escribir directamente en base de datos.

## NanoClaw

Puede evaluarse más adelante como gateway conversacional, no como cerebro central.

Arquitectura futura recomendada:

```text
NanoClaw
  → herramientas cerradas:
      createVisit
      addEvidence
      enqueueJob
      listOpenIssues
      createDecisionDraft
  → API propia
```

No debe tener acceso amplio a secretos ni shell de producción.

## OpenClaw

No recomendado para el core del proyecto por complejidad y superficie de seguridad. Si se evalúa, hacerlo en sandbox con datos sintéticos.

---

# 20. Primeros comandos esperados

El agente de coding puede elegir los comandos adecuados según el entorno, pero una inicialización razonable puede ser:

```bash
pnpm create next-app apps/web --typescript --app
```

Después debe adaptar el repo a workspace pnpm y crear manualmente los paquetes y el worker.

No forzar una estructura si el entorno ya tiene un template. Primero inspeccionar el repositorio.

---

# 21. Salida esperada tras Fase 0

Al finalizar Fase 0, el repo debería tener algo parecido a:

```text
reforma-agent/
  apps/
    web/
    worker/
  packages/
    core/
    ai/
    db/
  supabase/
    migrations/
    seed/
  docs/
    es/
    adr/
  README.md
  AGENTS.md
  CLAUDE.md
  PLAN.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .env.example
```

Y debería poder ejecutarse:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Si algún comando no está disponible todavía, el agente debe justificarlo y preparar el script para la siguiente fase.

---

# 22. Prompt mínimo para pegar si ya existe el repo

Si el repo ya existe y solo quieres iniciar ordenadamente, usa este prompt:

```text
Lee el repositorio completo, especialmente README.md, AGENTS.md, CLAUDE.md, PLAN.md y docs/es.

No implementes funcionalidad todavía.

Primero:
1. Evalúa si la estructura actual encaja con la arquitectura acordada: Next.js + Supabase + worker TypeScript.
2. Comprueba si hay desviaciones: visión IA, NanoClaw/OpenClaw core, IA dentro de requests web, falta de RLS, service role expuesto.
3. Propón un plan de corrección por fases.
4. Si el repo está vacío o incompleto, ejecuta solo Fase 0.
5. Si ya existe Fase 0, dime qué fase toca y dame el prompt exacto para ejecutarla.

No hagas cambios grandes sin explicar el plan.
```

---

# 23. Decisión final

Construir `reforma-agent` con:

```text
Next.js App Router
+ TypeScript
+ Supabase Auth/Postgres/Storage/RLS
+ worker Node/TypeScript
+ Zod
+ Vitest
+ proveedor IA intercambiable
```

No construir el MVP con:

```text
análisis IA de imágenes
NanoClaw como core
OpenClaw como core
Telegram como core
chat autónomo
backend todo en Next.js
jobs largos dentro de requests web
```

La app debe ser sencilla, trazable, segura y útil antes de ser “agéntica”.
