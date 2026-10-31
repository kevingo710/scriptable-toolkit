# scriptable-toolkit

Scripts para [Scriptable](https://scriptable.app) en iOS, más una skill para agentes de código que escriban scripts y widgets de Scriptable.

## Scripts

### `resumen-matutino.js`

Genera un resumen matutino hablado para usar con Atajos: clima, calidad del aire, eventos del calendario, recordatorios, primer compromiso de mañana, aviso de batería y una frase para arrancar el día.

- **Clima y aire:** [Open-Meteo](https://open-meteo.com), gratis y sin clave.
- **Calendario y recordatorios:** se leen en el propio iPhone. Los calendarios de `CONFIG.excludedCalendars` se ignoran (el nombre debe coincidir exactamente, mayúsculas incluidas).
- **Pensado para la voz:** quita emojis de títulos y ubicaciones, no lee enlaces de videollamada y escribe los números como se dicen.

#### Uso

1. Crea un script nuevo en Scriptable llamado *Resumen matutino* y pega el contenido.
2. Ajusta el bloque `CONFIG` del principio: tu nombre, una ubicación de respaldo y los calendarios que quieras ignorar.
3. En Atajos, añade la acción **Ejecutar script** → *Resumen matutino* y después **Leer texto** con su salida. Funciona bien como automatización a una hora fija.

Si lo ejecutas desde la app de Scriptable, lee el resumen en voz alta y lo muestra en pantalla.

#### Privacidad

Los datos del calendario, los recordatorios y la batería no salen del iPhone. Lo único que se envía fuera es la ubicación aproximada (precisión de unos 3 km) a Open-Meteo, para pedir el tiempo y la calidad del aire.

## Skills

### `skills/scriptable-widgets`

Skill en formato `SKILL.md` con buenas prácticas para crear y mejorar scripts y widgets de Scriptable: layout por tamaño de widget, modo oscuro, caché y red, pantalla de bloqueo, Atajos y texto para voz. Sirve para cualquier agente de código que lea skills.

## Licencia

[MIT](LICENSE)
