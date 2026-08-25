# LevelUp

**Convierte el menú de tu nutriólogo en un plan diario que sí puedes seguir.**

[Probar LevelUp](https://levelup-murex.vercel.app/) · [Ver el código](https://github.com/HugoLiconV/levelup)

LevelUp es una aplicación web para personas que siguen un plan indicado por un profesional de la salud y necesitan convertirlo en acciones sencillas cada día. El usuario pega el texto de su menú; la IA detecta variantes por día, comidas, ingredientes, cantidades y suplementos; después presenta un borrador editable antes de guardar cualquier dato.

Una vez confirmado, LevelUp muestra la comida correspondiente a cada día, crea checklists de adherencia, genera una lista semanal de compras y convierte el progreso en XP, niveles y logros.

## El problema

Los planes nutricionales suelen llegar como texto, tablas, imágenes transcritas o documentos difíciles de consultar durante el día. Saber qué toca hoy, recordar suplementos y convertir todas las cantidades en una lista de compras agrega fricción a un proceso que ya exige constancia.

LevelUp transforma ese documento estático en un flujo diario, sin reemplazar ni modificar las indicaciones del profesional.

## Qué hace único a LevelUp

- **Parte del plan real del usuario.** No genera una dieta genérica: estructura el menú que ya fue indicado por su nutriólogo.
- **La IA propone; el usuario decide.** Todo resultado se presenta como un borrador revisable y corregible antes de guardarse.
- **Respeta las versiones del plan.** Un menú nuevo crea una nueva versión en vez de borrar el historial asociado al plan anterior.
- **Conecta indicaciones con acciones.** El mismo plan alimenta el menú diario, las comidas registradas, los suplementos y la lista de compras.
- **Premia constancia, no perfección.** Las acciones diarias generan XP, niveles y logros para mantener el progreso visible.

## Funcionalidades con IA

### 1. Intérprete de menús

El usuario pega un menú libre en español. LevelUp usa OpenAI con salida JSON estructurada para identificar:

- Variantes del menú y días de la semana.
- Desayunos, comidas, cenas y colaciones.
- Platillos, ingredientes y cantidades originales.
- Equivalencias explícitas en gramos o mililitros.
- Indicaciones de referencia y suplementos.

El resultado pasa por una revisión guiada de calendario, comidas y suplementos. Cada campo se puede corregir antes de guardar. Si el modelo propone una equivalencia que no aparece en el texto fuente, LevelUp la descarta para no inventar cantidades.

Modelo predeterminado: `gpt-5.6-luna` con razonamiento bajo. LevelUp también valida que la IA conserve todas las variantes de días y secciones de comida antes de mostrar el borrador.

### 2. Clasificador de comidas

Al registrar una comida libre, LevelUp analiza su descripción y sugiere etiquetas agrupadas como proteína, verduras, fruta entera, grasa insaturada, pescado, alimentos ultraprocesados o alcohol. Estas etiquetas alimentan las métricas y quests del producto, y el usuario puede revisarlas o cambiarlas.

Modelo predeterminado: `gpt-4.1-nano`.

## Ruta de prueba para evaluación

La demostración principal toma aproximadamente un minuto:

1. Abrir [levelup-murex.vercel.app](https://levelup-murex.vercel.app/) e iniciar sesión.
2. Entrar a la sección **Comida** desde la navegación inferior.
3. Seleccionar **Pegar mi menú**.
4. Seleccionar **Usar menú de demostración** y después **Analizar menú con IA**.
5. Revisar las variantes y los días detectados por la IA.
6. Avanzar por **Calendario**, **Comidas** y **Suplementos**. Todos los campos son editables.
7. Seleccionar **Guardar nueva versión**.
8. Explorar el menú del día, marcar una comida y abrir la lista semanal de compras.
9. Registrar una comida libre, por ejemplo `Tacos de pollo con aguacate y verduras`, para probar las etiquetas sugeridas por IA.

## Menú de prueba

> Este es el menú completo de demostración usado por el proyecto. No contiene datos de identificación personal y puede copiarse directamente en la aplicación.

El mismo contenido se carga automáticamente con **Usar menú de demostración**. También puede copiarse manualmente en **Comida → Pegar mi menú**:

```text
PLAN DE ALIMENTACIÓN

Lunes, miércoles, viernes y domingo

Al despertar
Agua: 300 ml

Desayuno
Jugo verde pepino:
- Pepino, pelado: 1 taza (180 g)
- Espinaca, cruda: 1 taza (60 g)

Huevo a la mexicana:
- Huevo entero fresco: 2 piezas (100 g)
- Clara de huevo: 2 piezas (66 g)
- Tomate rojo: 10 ⅓ rebanadas (103 g)
- Chile jalapeño crudo: 1 pieza (15 g)
- Cebolla picada: 2 cucharadas (10 g)
- Aceite de oliva: 1 cucharadita (5 ml)

Aguacate:
- Aguacate: ⅔ pieza (62 g)

Medio día
Agua: 300 ml

Comida
Pechuga a la plancha con verduras:
- Pollo, pechuga asada: 180 g
- Pepino: 1 taza (104 g)
- Tomate rojo: 10 ⅓ rebanadas (103 g)

Guacamole:
- Aguacate: ⅓ pieza (34 g)
- Tomate: 1 rebanada (10 g)
- Cebolla: 2 cucharadas (10 g)

Galletas salmas:
- Galletas salmas: 1 paquete pequeño (18 g)

Agua de jamaica:
- Agua de jamaica: 300 ml

Media tarde
Agua: 300 ml

Jícama con pepino:
- Pepino pelado: ½ taza (50 g)
- Jícama: ½ taza (40 g)

Cena
Sándwich de atún:
- Jitomate guaje o guajito: 30 g
- Pepino, con cáscara: ⅓ taza (30 g)
- Cebolla blanca: 20 g
- Mostaza: 0.1 taza (20 g)
- PAN THINS: 2 rebanadas (42 g)
- Atún en agua, drenado: 1 lata (90 ml)
- Aguacate: ⅓ pieza (31 g)

Té de manzanilla:
- Agua: 220 ml

Bioleven
Omega 3 Lysi + VIT E 800 mg

Martes, jueves y sábado

Al despertar
Agua: 300 ml

Desayuno
Jugo verde pepino:
- Pepino, pelado: 1 taza (180 g)
- Espinaca, cruda: 1 taza (60 g)

Huevo con champiñones:
- Huevo entero fresco: 2 piezas (100 g)
- Clara de huevo: 2 piezas (66 g)
- Champiñones: 1 taza (122 g)
- Aceite de oliva: 1 cucharadita (5 ml)

Aguacate:
- Aguacate: ⅓ pieza (31 g)

Medio día
Agua: 300 ml

Comida
Pescado a la plancha con verduras:
- Filete de pescado: 240 g
- Brócoli: 2 tazas (140 g)
- Coliflor: ½ taza (80 g)

Guacamole:
- Aguacate: ⅓ pieza (34 g)
- Tomate: 1 rebanada (10 g)
- Cebolla: 2 cucharadas (10 g)

Galletas salmas:
- Galletas salmas: 1 paquete pequeño (18 g)

Agua de jamaica:
- Agua de jamaica: 300 ml

Media tarde
Agua: 300 ml

Jícama con pepino:
- Pepino pelado: ½ taza (50 g)
- Jícama: ½ taza (40 g)

Cena
Sándwich de pechuga:
- Pepino, con cáscara: ⅓ taza (30 g)
- Cebolla blanca: 20 g
- Mostaza: 0.1 taza (20 g)
- PAN THINS: 2 rebanadas (42 g)
- Aguacate: ⅓ pieza (31 g)
- Pechuga de pollo sin piel aplanada: 3 unidades (90 g)

Té de manzanilla:
- Agua: 220 ml

Bioleven
Omega 3 Lysi + VIT E 800 mg

Indicaciones de suplementos
- BIOLEVEN: 1 cápsula por día hasta nuevo aviso.
- OMEGA: 1 cucharada sopera en la noche hasta nuevo aviso.
- VIT E 800 MG: Hasta nuevo aviso.
```

## Otras funcionalidades

- Registro diario de comidas, agua, movimiento, ejercicio y suplementos.
- Menú semanal resuelto automáticamente según el día y la versión activa del plan.
- Lista semanal de compras calculada a partir de cantidades explícitas en gramos y mililitros.
- XP, niveles, quests, logros y métricas de constancia.
- Seguimiento de laboratorios y checkpoints.
- Recordatorios y temporizadores mediante notificaciones web push.
- Aplicación web progresiva instalable, con experiencia offline y exportación/importación de datos.
- Inicio de sesión con Supabase Auth.

## Stack

- Next.js 16 y React 19.
- TypeScript y Tailwind CSS 4.
- Supabase Auth y Supabase Edge Functions.
- OpenAI API con Structured Outputs.
- Web Push y Service Worker para recordatorios y soporte PWA.
- Vitest para lógica de dominio e integración del intérprete de planes.
- Vercel para despliegue.

## Desarrollo local

Requisitos: Node.js compatible y `pnpm`.

```bash
pnpm install
pnpm dev
```

La aplicación requiere las variables públicas de Supabase y `OPENAI_API_KEY`. Los nombres completos de configuración se encuentran en el código del servidor y en la configuración de despliegue; nunca se deben publicar secretos en el repositorio.

### Modo personal

`NEXT_PUBLIC_PERSONAL_MODE=true` activa los datos y módulos originales de Hugo: fechas del checkpoint, laboratorios, intenciones y la quest de caminata en pareja. La variable es pública y se fija durante el build de Next.js; debe omitirse o configurarse como `false` en despliegues para otros usuarios.

## Verificación

```bash
pnpm test
pnpm lint
pnpm build
```

El proyecto incluye pruebas para versionado y resolución de planes, adherencia por comida y suplemento, agregación de la lista semanal de compras y validación de equivalencias producidas por IA.

## Privacidad y alcance

LevelUp no diagnostica, prescribe ni reemplaza la atención de un profesional de la salud. La IA únicamente estructura el texto proporcionado y permite que el usuario revise el resultado. El estado principal de seguimiento se conserva localmente en el dispositivo del usuario; los secretos y llamadas a OpenAI permanecen del lado del servidor.
