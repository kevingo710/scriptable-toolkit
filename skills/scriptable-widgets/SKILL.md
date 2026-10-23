---
name: scriptable-widgets
description: Crear, mejorar o depurar scripts y widgets de Scriptable (iOS) — layout por tamaño de widget, modo oscuro, caché, red, pantalla de bloqueo, Atajos y texto para voz.
---

# Widgets y scripts de Scriptable

Guía para escribir código JavaScript para la app **Scriptable** de iOS. Se aplica cuando el usuario pide un widget nuevo, quiere mejorar uno existente, o tiene un script que se ejecuta desde Atajos.

## Flujo de trabajo

1. **Entender el dato antes del diseño.** De dónde sale: constantes en el archivo, API pública, Calendario/Recordatorios, `args.widgetParameter`. Qué cambia y cada cuánto.
2. **Decidir los tamaños soportados.** Mira `config.widgetFamily` y diseña cada tamaño a propósito. No escales el mismo layout.
3. **Entregar el script completo**, no fragmentos, salvo que pidan un cambio puntual. Arriba van un bloque `CONFIG` o constantes en MAYÚSCULAS con todo lo editable, más un comentario "CÓMO USAR".
4. **Siempre funciona dentro de la app.** Cuando no es un widget, previsualiza (`presentMedium()` u otro tamaño). Así el usuario lo prueba pulsando ▶.
5. **Comprobar la sintaxis** con `node --check` antes de entregar. Las APIs de Scriptable no existen en Node, así que solo vale para la sintaxis.

## Estructura base

```javascript
const CONFIG = { /* todo lo editable aquí */ }

const family = config.widgetFamily || "medium" // en la app no hay familia
const isSmall = family === "small"
const isLarge = family === "large" || family === "extraLarge"
const isAccessory = family.startsWith("accessory")

const widget = await buildWidget()

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
```

## Layout

- La raíz es `ListWidget` y es vertical. Las filas y columnas se hacen con `addStack()` + `layoutHorizontally()` / `layoutVertically()`.
- `addSpacer()` sin argumento empuja el contenido (alinear a la derecha o abajo). `addSpacer(n)` deja n puntos de espacio fijo.
- Los tamaños aproximados en puntos varían según el iPhone: pequeño ≈ 155–170 de lado, mediano ≈ 330×155, grande ≈ 330×345. Lo que no cabe **se recorta sin aviso**, así que en tamaños pequeños hay que quitar contenido en lugar de encogerlo.
- Para evitar desbordes en textos variables usa `text.lineLimit = 1` + `text.minimumScaleFactor = 0.7`.
- Los anchos fijos se ponen con `stack.size = new Size(w, 0)`, donde 0 significa automático.
- Padding base: `widget.setPadding(12, 14, 12, 14)`.
- No hay scroll, animaciones ni interacción. Lo único que responde al toque es `widget.url` o `stack.url` (en mediano y grande cada stack puede abrir una URL distinta).

## Estilo

- Paleta en constantes con nombre (`INK`, `MUTED`, `GOOD`, `BAD`…), nunca colores sueltos por el código.
- Modo claro/oscuro: `Color.dynamic(new Color("#111"), new Color("#eee"))`. Para el fondo también vale `LinearGradient` con colores dinámicos.
- Jerarquía con tamaño y peso: un número protagonista grande (`Font.boldSystemFont(24–30)`) y etiquetas pequeñas (10–12) en color atenuado.
- Iconos: `SFSymbol.named("figure.run")`, luego `.image` → `addImage()`, y se fija `imageSize` y `tintColor`. Mejor eso que emojis, que no se tiñen ni se ven igual en todas partes.
- Fechas y horas que avanzan solas: `addDate(date)` con `applyRelativeStyle()` o `applyTimerStyle()`. Se actualizan sin refrescar el widget.

## Datos, red y caché

- Todas las llamadas de red van envueltas en `try/catch`. Si fallan, se muestra el último dato guardado y su antigüedad, nunca un widget vacío.
- Caché con `FileManager.local()` (o `iCloud()` si se quiere sincronizar): se guarda JSON en `fm.documentsDirectory()` y se lee al fallar la red.
- iOS decide cuándo refrescar. `widget.refreshAfterDate = new Date(Date.now() + 30 * 60e3)` pide una fecha mínima, pero no la garantiza.
- APIs sin clave preferidas cuando existan (p. ej. Open-Meteo para clima). Nunca se escriben tokens personales en el código que se va a versionar: se leen de `Keychain` (`Keychain.contains` / `Keychain.get`).
- `args.widgetParameter` permite reutilizar un script en varios widgets con parámetros distintos.
- La memoria disponible para widgets es limitada, así que las imágenes remotas se redimensionan o se evitan si son grandes.

## Pantalla de bloqueo (accessory)

- Las familias son `accessoryCircular`, `accessoryRectangular` y `accessoryInline`. Son monocromas: el color lo pone iOS y solo cuenta la opacidad.
- `accessoryInline` muestra solo una línea de texto (y como mucho un símbolo).
- Se previsualizan con `presentAccessoryCircular()` / `presentAccessoryRectangular()` / `presentAccessoryInline()`.

## Scripts para Atajos y voz

- La salida se devuelve con `Script.setShortcutOutput(text)` y se termina con `Script.complete()`.
- **Texto para voz:** hay que limpiar emojis de cualquier texto del usuario (títulos de eventos, recordatorios), porque si no la voz los lee en alto:

```javascript
const clean = (s) => (s || "")
  .replace(/\p{Extended_Pictographic}/gu, "")
  .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
  .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "")
  .replace(/[\u200D\uFE0F\u20E3]/g, "")
  .replace(/\s+/g, " ")
  .trim()
```

- Los números se escriben como se dicen ("30 por ciento", "unos 12 grados"). Hay que evitar abreviaturas, símbolos (%, km/h, →) y URLs en el texto hablado.
- Las listas se unen en lenguaje natural ("a, b y c"), y si son largas se ponen límites ("y 3 más").
- Los filtros por nombre (calendarios, listas) distinguen mayúsculas, así que el nombre debe copiarse exacto.

## Errores comunes

- Olvidar `Script.complete()` en scripts largos llamados desde Atajos.
- Confundir `config.runsInWidget` con `config.runsInApp`.
- Los meses de `new Date(y, m, d)` empiezan en 0 (marzo = 2).
- `Calendar.forEvents()` incluye calendarios suscritos y de cumpleaños; filtra los que no interesen.
- Las ubicaciones de eventos a veces son URLs de videollamada, y no deben leerse ni mostrarse como lugar.
