# La Porra

App para jugar a pronosticar resultados de La Liga con un grupo de amigos, sin registro formal: solo nombre + código de invitación.

## Cómo funciona

- Cada jugador entra con su cuenta de Google. La primera vez, además, tiene que introducir un código de invitación (código de "jugador") para poder crear su ficha de jugador. Existe un segundo código, de "admin", que da acceso al panel de administración — mismo formulario, distinto código.
- Al ir ligado a una cuenta de Google real, nadie puede hacerse pasar por otro jugador ni "robar" su sesión, y el acceso persiste automáticamente entre dispositivos.
- Los pronósticos de cada partido se guardan ocultos: solo ves el tuyo hasta que el partido empieza (hora de kickoff). A partir de ahí se revelan los de todos.
- El admin añade los partidos de cada jornada y, cuando terminan, introduce el resultado a mano. La app calcula los puntos automáticamente:
  - Resultado exacto: **8 puntos**
  - Acierto de signo (ganador o empate, sin acertar el marcador): **3 puntos**
  - Fallo: 0 puntos
- Clasificación por jornada y general.

## Stack

React + Vite, Firebase Auth (anónimo) + Firestore + Hosting — plan gratuito **Spark** (sin Cloud Functions: toda la seguridad vive en `firestore.rules`).

## 1. Crear el proyecto de Firebase

1. Ve a [Firebase console](https://console.firebase.google.com) y crea un proyecto nuevo (plan Spark).
2. **Authentication** → pestaña "Sign-in method" → habilita el proveedor **Google** (te pedirá un "correo de asistencia del proyecto", pon el tuyo).
3. **Firestore Database** → crea la base de datos (modo producción, la región que prefieras).
4. **Project settings** → "Tus apps" → añade una app web → copia el objeto `firebaseConfig`.

## 2. Configurar variables de entorno

Copia `.env.example` a `.env` y rellena los valores con los del `firebaseConfig` del paso anterior.

## 3. Crear el documento de configuración (códigos de invitación)

En Firestore, crea a mano una colección `config` con un documento de id `app` y estos dos campos (tipo *string*):

- `playerCode`: el código que compartirás con tus amigos para jugar.
- `adminCode`: el código que usarás tú (o quien administre la porra) para entrar con permisos de admin.

Este documento no se puede leer nunca desde el cliente (las reglas lo bloquean con `allow read, write: if false`); solo se consulta internamente al validar el código en el momento de unirte.

## 4. Instalar y arrancar en local

```bash
npm install
npm run dev
```

## 5. Desplegar reglas de Firestore y Hosting

Instala el CLI de Firebase si no lo tienes, inicia sesión, y sustituye el id del proyecto en `.firebaserc`:

```bash
npm install -g firebase-tools
firebase login
```

Edita `.firebaserc` y pon el `projectId` real de tu proyecto de Firebase (lo ves en Project settings). Luego:

```bash
npm run build
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

## Calendario y resultados automáticos

Un script (`scripts/sync-calendar.cjs`) descarga el calendario y los resultados de La Liga desde [football-data.org](https://www.football-data.org) (gratis) y los vuelca en Firestore: crea los partidos que faltan, actualiza horarios, y en cuanto un partido aparece como `FINISHED` calcula los puntos de todos los pronósticos automáticamente. Los jugadores nunca llaman a esa API directamente — siempre leen de Firestore.

Se ejecuta solo, cada 10 minutos, vía [GitHub Actions](.github/workflows/sync-calendar.yml) — no hace falta que nadie lo lance a mano. Detalles de la configuración inicial (secretos, permisos del token) en el propio historial de este README/commits; si necesitas volver a montarlo desde cero, genera un token en football-data.org y una clave de servicio de Firebase, y guárdalos como secrets del repo (`FOOTBALL_DATA_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`).

**Importante — cuota gratuita de Firestore**: las ejecuciones automáticas (cron) solo procesan partidos en juego, terminados en las últimas 5 horas, o que empiezan dentro de los próximos 8 días (`SYNC_SCOPE=recent` en el workflow) — no la temporada completa. Recorrer los ~380 partidos de toda la temporada cada 10 minutos supera de sobra el límite gratuito diario de Firestore (50.000 lecturas / 20.000 escrituras); con esta ventana el consumo real es de unas pocas decenas de operaciones por ejecución. Los partidos fuera de esa ventana ya cargados no necesitan revisarse porque no van a cambiar de horario ni de resultado.

Para una carga o revisión completa de toda la temporada (por ejemplo, al principio de una temporada nueva), dos opciones:
- En local: `npm run sync-calendar` (sin la variable `SYNC_SCOPE`, hace la temporada entera). Necesitas `scripts/.env` con tu `FOOTBALL_DATA_API_KEY` y `scripts/service-account.json` con una clave de servicio — ambos fuera de git (`.gitignore`).
- Desde GitHub: pestaña Actions → "Sync La Liga calendar" → Run workflow → marca la casilla "Sincronizar toda la temporada".

El script nunca pisa un resultado que el admin ya haya introducido a mano, y si cambia el horario de un partido con pronósticos ya guardados, les propaga el nuevo kickoff automáticamente.

## Notas de diseño

- No hay backend propio: toda la lógica sensible (validar el código de invitación, ocultar pronósticos antes del kickoff, restringir quién puntúa) vive en `firestore.rules`, no en el cliente.
- Los pronósticos guardan una copia del `kickoff` del partido en el propio documento: es lo que permite que la regla de "ocúltalo hasta que empiece" se pueda consultar de forma segura y eficiente (sin funciones programadas).
- Para una nueva temporada, o para rotar los códigos, basta con editar el documento `config/app` desde la consola de Firebase — no hace falta redesplegar nada.
- Todas las colecciones se leen en local (`getDocs`/`onSnapshot` sin filtros complejos) porque la escala esperada es un grupo pequeño de amigos durante una temporada; por eso no hace falta ningún índice compuesto (`firestore.indexes.json` está vacío a propósito).
