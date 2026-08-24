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

## Cargar el calendario de La Liga automáticamente

En vez de dar de alta cada partido a mano, hay un script que descarga el calendario completo de La Liga (equipos, escudos, jornada y hora) desde [football-data.org](https://www.football-data.org) (gratis) y lo vuelca en Firestore. Los jugadores nunca llaman a esa API directamente — siempre leen de Firestore, así que el límite de 10 peticiones/minuto de football-data.org no supone ningún problema, lo agotas tú solo una vez por sincronización.

1. Regístrate gratis en [football-data.org](https://www.football-data.org/client/register) y copia tu API token.
2. Genera una clave de servicio nueva (Firebase console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada) y guárdala como `scripts/service-account.json` — **no la subas nunca a git** (ya está en `.gitignore`).
3. Copia `scripts/.env.example` a `scripts/.env` y rellena `FOOTBALL_DATA_API_KEY` con tu token.
4. Ejecuta:
   ```bash
   npm run sync-calendar
   ```

El script crea los partidos que faltan y actualiza fecha/hora de los que ya existen (usa el id de football-data.org como id del documento, así no duplica nada). **Nunca toca** un partido que el admin ya haya marcado como finalizado a mano — solo actualiza calendario, nunca resultados. Si el horario de un partido cambia y ya había pronósticos guardados para él, el script les actualiza también el kickoff automáticamente.

Vuelve a ejecutarlo cuando La Liga vaya confirmando horarios de próximas jornadas (normalmente 1-2 semanas antes, cuando se fijan para TV) o si ves algún partido desactualizado.

## Notas de diseño

- No hay backend propio: toda la lógica sensible (validar el código de invitación, ocultar pronósticos antes del kickoff, restringir quién puntúa) vive en `firestore.rules`, no en el cliente.
- Los pronósticos guardan una copia del `kickoff` del partido en el propio documento: es lo que permite que la regla de "ocúltalo hasta que empiece" se pueda consultar de forma segura y eficiente (sin funciones programadas).
- Para una nueva temporada, o para rotar los códigos, basta con editar el documento `config/app` desde la consola de Firebase — no hace falta redesplegar nada.
- Todas las colecciones se leen en local (`getDocs`/`onSnapshot` sin filtros complejos) porque la escala esperada es un grupo pequeño de amigos durante una temporada; por eso no hace falta ningún índice compuesto (`firestore.indexes.json` está vacío a propósito).
