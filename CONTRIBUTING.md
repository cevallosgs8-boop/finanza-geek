# Contribuir

Usa datos inventados y cambios pequeños. El código es JavaScript ESM, HTML y CSS sin dependencias de ejecución. Mantén importes en centavos enteros, fechas locales, validación estricta y compatibilidad de respaldos. Una propuesta no puede registrar movimientos sin revisión explícita.

En el proyecto de desarrollo ejecuta `node --test`, `node scripts/check-privacy.mjs` y `node scripts/serve.mjs --port 8009`; abre /tests.html para las pruebas de navegador. El escáner informa ubicaciones sospechosas: requiere revisión humana y no certifica por sí solo ausencia de datos privados. No añadas instaladores ni hooks automáticos.

La copia pública contiene la app, ejemplos y pruebas de navegador; no incluye las herramientas ni el historial del entorno privado de desarrollo. Allí ejecuta `node scripts/serve.mjs --port 8000` y abre /tests.html. Comprueba claro/oscuro, 320/390/430 px, teclado, PIN y modo sin conexión con bases ficticias.

Antes de proponer cambios revisa cuentas/saldos, restauración, conflictos entre pestañas, accesibilidad y privacidad. Nunca adjuntes respaldos propios, capturas con dinero real, notificaciones bancarias, PIN, tokens ni archivos .ics personales. Describe el error con un ejemplo mínimo inventado. Código propio bajo MIT; fuentes y recursos de terceros conservan sus avisos de licencia en src/assets/fonts.
