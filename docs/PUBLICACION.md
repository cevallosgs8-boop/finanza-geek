# Preparar una publicación limpia

La candidata local no se ha publicado. La rama de desarrollo conserva documentación histórica y personalización: no la conviertas directamente en un repositorio público. Usa la copia generada por lista permitida, sin historial Git, y revisa su contenido antes de compartirla.

## Crear y revisar la copia
En el proyecto de desarrollo ejecuta `node scripts/prepare-public.mjs`. Genera dist-public en una carpeta nueva y rechaza sobrescribir una existente. Si ya tienes una copia, elige otra carpeta nueva dentro del proyecto con --output. No se elimina ningún directorio ni se ejecuta una subida. La copia excluye .git, agentes, notas privadas y documentos históricos, conserva licencias y usa nombres de mascotas neutrales. Los nombres que configuraste en tu navegador no forman parte de la copia.

Abre la copia con su servidor local, ejecuta sus pruebas de navegador y revisa todos los archivos, ejemplos e imágenes. Verifica que cada importación y recurso offline exista. No añadas tus datos para que otras personas puedan probarla: una instalación nueva empieza vacía.

## GitHub Pages
Una vez revisado el resultado, crea un repositorio nuevo para la copia limpia; no envíes el historial del entorno de desarrollo. La publicación debe tener un destino acordado y contenido concreto revisado. GitHub documenta crear el repositorio, elegir la fuente de Pages y publicar un index.html en la raíz; para sitio estático sin Jekyll se incluye .nojekyll. Sigue la [guía oficial de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

En un repositorio público, GitHub ejecuta escaneo de secretos automáticamente, pero no detecta todos los datos personales: revisa también el contenido. Consulta [escaneo de secretos](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning). Si ya compartiste una credencial, revócala; si publicaste información personal, quitarla del último archivo no elimina el historial.

Desde Safari en iPhone puedes gestionar el repositorio y sus ajustes web. Cargar muchos archivos, conservar carpetas y ejecutar Node requiere una herramienta o un computador apropiados; no se ha ensayado aquí un flujo completo desde el teléfono. No se promete una carga de carpeta desde Safari ni se sustituye esa prueba por el navegador de escritorio. La app publicada usa HTTPS, pero cambiar de dirección cambia también el almacenamiento: mueve tus datos mediante un respaldo revisado.
