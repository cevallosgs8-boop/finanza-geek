# Finanza Geek · candidata1.0

PWA personal de finanzas para iPhone, con almacenamiento local, USD y textos en español. Combina cuentas, movimientos, préstamos, planificación, metas, mascotas pixel art, buzón y asesor. No requiere una API de servidor ni conecta bancos. No constituye asesoría financiera.

Esta copia neutral contiene código y ejemplos inventados. Todos los alias de tarjetas son ficticios y no representan tarjetas reales. Una instalación nueva empieza vacía. No incluye historial Git, configuración personal ni respaldos. Fuentes con sus licencias en src/assets/fonts; código propio bajo [MIT](LICENSE).

Inicia `node scripts/serve.mjs --port 8000`, abre http://127.0.0.1:8000 y visita /tests.html para las pruebas de navegador. El loopback del computador no es una dirección accesible desde tu iPhone. Usa una instalación HTTPS para probar en el teléfono.

Lee la [guía de uso](docs/GUIA-USO.md), [privacidad](docs/PRIVACIDAD.md) y [contribuciones](CONTRIBUTING.md). Activa el PIN opcional desde Ajustes; no cifra IndexedDB ni los respaldos JSON. Exporta copias mensuales y comprueba que se guardaron fuera del navegador. Instalar no garantiza que el sistema conserve indefinidamente los datos.

La candidata no tiene validación física completa en Safari, cámara o Atajos. Revisa los campos importados antes de confirmar; no hay OCR interno ni notificaciones push con la app cerrada. Las tasas fiscales opcionales deben comprobarse para la fecha de uso.

Puedes preparar [Anotar gasto y Anotar ingreso con Atajos](docs/ATAJOS-RAPIDOS.md), con confirmación manual dentro de la app.
