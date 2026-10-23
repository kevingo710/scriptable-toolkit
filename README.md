# scriptable-kev

Scripts para [Scriptable](https://scriptable.app) en iOS.

## Scripts

### `resumen-matutino.js`

Genera un resumen matutino en texto (clima, calidad del aire, eventos del calendario, recordatorios, primer evento de mañana, batería y una frase motivadora) y lo devuelve a Atajos para que lo lea en voz alta.

- **Clima y aire:** Open-Meteo (gratis, sin clave).
- **Calendario:** ignora los calendarios listados en `CONFIG.excludedCalendars` (el nombre debe coincidir exactamente, mayúsculas incluidas).
- **Emojis:** se eliminan de títulos y ubicaciones para que la voz no los lea.

#### Uso

1. Copia el contenido en un script nuevo de Scriptable llamado *Resumen matutino*.
2. Ajusta el bloque `CONFIG` al inicio.
3. En Atajos: acción **Ejecutar script** → *Resumen matutino*, y después **Leer texto** con la salida.

Si se ejecuta desde la app de Scriptable, lo lee y lo muestra directamente.

## Skills

### `skills/scriptable-widgets/SKILL.md`

Skill para Claude con buenas prácticas para crear y mejorar widgets y scripts de Scriptable: layout por tamaño, modo oscuro, caché, pantalla de bloqueo y texto para voz.
