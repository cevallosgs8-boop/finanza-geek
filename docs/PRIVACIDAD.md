# Privacidad y recuperación

La app guarda datos financieros localmente en IndexedDB. El registro del PIN y del recordatorio está separado del respaldo financiero; el servidor estático sirve código, sin una API que reciba tus movimientos. Exportar o copiar un resumen son acciones voluntarias: los archivos y textos resultantes quedan bajo tu control.

## Qué protege el PIN
Es un bloqueo de interfaz contra miradas casuales. Se guarda una verificación derivada con PBKDF2-SHA256 y una sal aleatoria, nunca el PIN en texto plano. Tras cinco intentos incorrectos hay una espera local de 30 segundos. Quien controle el navegador, sus herramientas o el almacenamiento puede eludir o probar este bloqueo. Los datos y respaldos siguen sin cifrar.

Los metadatos dañados o ilegibles mantienen la app cerrada. Un error al guardar una verificación no debe abrirla. El PIN no se exporta, y restaurar datos no desactiva un PIN vigente. La verificación Web Crypto requiere un contexto seguro como HTTPS o localhost; si no está disponible, no se ofrece activar un PIN inseguro. [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits), [parámetros PBKDF2](https://developer.mozilla.org/en-US/docs/Web/API/Pbkdf2Params).

Actualiza y cierra las pestañas de versiones anteriores antes de activar el PIN. El bloqueo depende del código de esta versión: una página antigua que no conoce el PIN no ofrece esa protección.

## Si olvidas el PIN
No hay PIN maestro. Necesitas una copia JSON que ya hayas guardado fuera de la app. Tras borrar los datos de ese sitio desde los ajustes del navegador, vuelve a abrir la instalación y restaura esa copia. Borrar el sitio puede ser irreversible y elimina los datos que no respaldaste. La app no puede recuperar un archivo que no se guardó ni descifrar datos con un PIN olvidado, porque este PIN no era una clave de cifrado.

## Almacenamiento y borrado
Los navegadores tienen cuotas y pueden eliminar almacenamiento. Mantén copias periódicas y comprueba que se descargaron: [política de almacenamiento de WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/). El borrado dentro de la app elimina estado financiero, juego, ajustes y PIN del origen actual en una transacción. Conserva solo versiones vacías y contadores de revisión para impedir que una pestaña antigua vuelva a escribir datos viejos. No borra archivos de Archivos/iCloud ni datos de otros dominios/puertos.

Los ejemplos distribuidos son ficticios. No incorpores respaldos, fotos, cuentas reales, PIN o notificaciones al repositorio. El .gitignore ayuda a excluirlos; una revisión del contenido y del historial sigue siendo necesaria antes de compartir.
