# Candidata local v1.0

Fecha: 2026-11-02. Base: 8c08afb. Esta rama reúne los cambios de privacidad local, respaldo mensual y preparación de plantilla pública autorizados para revisión. El resultado sigue siendo una candidata local.

La aplicación conserva USD, textos en español y el diseño Pixel Apple. No implementa conversión internacional de moneda ni traducción general. El PIN es opcional y bloquea la interfaz contra miradas casuales; no cifra IndexedDB ni los archivos JSON. Quien olvide el PIN debe restaurar un respaldo existente después de borrar los datos del sitio, con riesgo de perder lo que no respaldó.

Las guías describen los controles disponibles y los límites de Safari. El sistema puede eliminar almacenamiento del sitio; instalar la PWA no garantiza retención indefinida. El recordatorio mensual no crea descargas automáticas. Revisa que el navegador haya iniciado la descarga y que el archivo exista.

La plantilla pública se crea en una carpeta nueva y usa datos de ejemplo inventados. Revisa el resultado y sus recursos antes de compartir. No se ha configurado un repositorio remoto ni realizado una publicación. La validación física en Safari/iPhone y las pruebas con datos reales quedan pendientes; no se presentan como realizadas por una prueba de navegador.

Verificación local del 2 de noviembre de 2026: Node ejecutó 602 casos, con 601 aprobados, cero fallidos y uno omitido porque el entorno no permite crear junctions; ese control conserva cobertura determinista. Sintaxis comprobada en 94 archivos JavaScript. El navegador pasó 104/104 con IndexedDB temporal real. Ajustes abre en Privacidad; se comprobaron cuatro anchos y la recarga con el servidor de prueba detenido. Los datos de QA son ficticios. Las revisiones independientes de integridad de datos y calidad aprobaron los cambios. Safari/iPhone físico, cámara, Atajos y publicación permanecen pendientes. Esta nota no declara una release validada en dispositivo físico.
