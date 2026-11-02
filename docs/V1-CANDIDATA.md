# Candidata v1.0

Fecha: 2026-11-02. Base: 8c08afb. Esta rama reúne los cambios de privacidad local, respaldo mensual y preparación de plantilla pública autorizados para revisión. El código se publica como candidata en [Finanza Geek](https://cevallosgs8-boop.github.io/finanza-geek/).

La aplicación conserva USD, textos en español y el diseño Pixel Apple. No implementa conversión internacional de moneda ni traducción general. El PIN es opcional y bloquea la interfaz contra miradas casuales; no cifra IndexedDB ni los archivos JSON. Quien olvide el PIN debe restaurar un respaldo existente después de borrar los datos del sitio, con riesgo de perder lo que no respaldó.

Las guías describen los controles disponibles y los límites de Safari. El sistema puede eliminar almacenamiento del sitio; instalar la PWA no garantiza retención indefinida. El recordatorio mensual no crea descargas automáticas. Revisa que el navegador haya iniciado la descarga y que el archivo exista.

La plantilla pública se crea en una carpeta nueva y usa datos de ejemplo inventados. Revisa el resultado y sus recursos antes de compartir. La copia limpia está en un repositorio público nuevo y dispone de GitHub Pages con HTTPS. El historial local de desarrollo se mantiene separado. La validación detallada en Safari/iPhone y las pruebas con datos reales siguen siendo independientes de las pruebas de navegador.

Verificación inicial de la candidata, 2 de noviembre de 2026: Node ejecutó 602 casos, con 601 aprobados, cero fallidos y uno omitido porque el entorno no permite crear junctions; ese control conserva cobertura determinista. Sintaxis comprobada en 94 archivos JavaScript. El navegador pasó 104/104 con IndexedDB temporal real. Ajustes abre en Privacidad; se comprobaron cuatro anchos y la recarga con el servidor de prueba detenido. Los datos de QA son ficticios. Las revisiones independientes de integridad de datos y calidad aprobaron los cambios. La validación detallada de cámara, Atajos, Calendario y continuidad entre Safari y la app instalada permanece pendiente. Esta nota no declara una release validada en dispositivo físico.

## Seguimiento: ayuda integrada de iPhone
Desde Ajustes se abre Configurar mi iPhone, con cuatro guías desplegables y enlaces de solo lectura para Atajos. La ayuda no necesita permisos de cámara, calendario ni notificaciones; describe los pasos manuales disponibles.

Verificación de este seguimiento: 606 casos Node, 605 aprobados, cero fallidos y una omisión del entorno; sintaxis en 96 archivos. Navegador 104/104 con bases temporales. CUA en una instalación local vacía verificó cuatro anchos, controles táctiles, foco, cierre y reapertura. La ayuda cargó desde caché con el servidor de prueba detenido, usando el shell r3. Calidad aprobó después de ajustar las áreas táctiles de los enlaces externos. Estas verificaciones no sustituyen la ejecución de Atajos, Fotos o Calendario en el iPhone.
