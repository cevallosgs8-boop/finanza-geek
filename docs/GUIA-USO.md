# Guía de uso

Finanza Geek es una PWA individual para registrar y planificar finanzas en USD, con textos en español. Los datos permanecen en el almacenamiento del navegador de ese origen. No se sincronizan entre puertos, dominios ni teléfonos. La aplicación no conecta tu banco, no lee notificaciones ni ejecuta pagos reales.

## Empezar
Abre la app y crea una cuenta con el saldo inicial. Registra ingresos, gastos o transferencias en Movimientos; revisa importe, fecha y cuenta antes de guardar. Préstamos distingue lo que debes de lo que te deben. Planificar reúne calendario, recurrentes, presupuesto, metas, fondos, asesor y conciliación. La interfaz predeterminada sigue el modo claro/oscuro del sistema. El juego acompaña y nunca convierte XP en dinero.

## Instalar y usar sin conexión
En Safari abre la dirección HTTPS de tu instalación y usa Compartir > Agregar a la pantalla de inicio. La primera carga requiere conexión; después se guarda el código necesario para abrir sin red. Una dirección127.0.0.1 del computador no da acceso desde el iPhone. No se ha validado físicamente cada versión de iOS; los nombres de los controles pueden variar.

## Respaldo y restauración
En Ajustes y respaldo elige Exportar respaldo y guarda el JSON en un lugar que controles. La app solo puede confirmar que inició la descarga; verifica tú que el archivo exista y que puedes abrirlo. El PIN no se incluye. El aviso mensual puede omitirse durante el mes actual y respeta el ajuste de recordatorios de respaldo. El evento de calendario es un recordatorio externo; no crea copias por sí solo.

Importar respaldo valida un JSON de hasta5MiB y pide confirmar antes de reemplazar el snapshot financiero. Cancela si no corresponde. La restauración conserva el PIN local vigente y no mezcla dos historiales. Mantén una copia independiente antes de sustituir datos. Los respaldos1–7 compatibles se migran al esquema financiero7.

## Privacidad
En Ajustes > Privacidad puedes activar un PIN de cuatro dígitos, repetirlo y cambiarlo o desactivarlo verificando el actual. El bloqueo se activa al abrir o al ocultar la app y descarta borradores sin guardar; úsalo sabiendo ese comportamiento. No cifra los datos ni el JSON. Consulta [privacidad y recuperación](PRIVACIDAD.md).

El borrado total presenta dos pasos. Primero ofrece exportar una copia y continuar o cancelar. Después exige escribir BORRAR y, si hay PIN, verificarlo. Cancelar conserva todo. Afecta este origen, no los archivos descargados ni otras instalaciones.

## Límites
Las tasas y sus vigencias se revisan en los ajustes fiscales; no son una garantía de normativa vigente ni asesoría financiera. Esta candidata usa USD y español; no incorpora conversión de monedas ni traducción general. El buzón y los recibos contienen propuestas que debes revisar. No hay OCR interno ni avisos push desde la app cerrada. El sistema puede eliminar almacenamiento del sitio: instalación y PIN no sustituyen respaldos externos.
