# Anotar gastos e ingresos con Atajos

La app está en [Finanza Geek](https://cevallosgs8-boop.github.io/finanza-geek/). Esta guía usa el flujo de enlaces que ya ofrece la candidata v1.0. No instala un atajo automáticamente ni lee avisos bancarios.

## Anotar gasto
1. Abre Atajos en el iPhone, crea un atajo y llámalo **Anotar gasto**.
2. Añade una acción **URL** y pega esta dirección completa:

```text
https://cevallosgs8-boop.github.io/finanza-geek/#nuevo?tipo=gasto
```

3. Añade **Abrir URLs** y usa como entrada el resultado de URL. El nombre puede aparecer como «Abrir URL» según el idioma o versión.
4. Ejecuta el atajo. En Finanza Geek, elige cuenta y completa importe, fecha y categoría. Revisa y guarda tú mismo. Abrir el enlace no registra un movimiento.

## Anotar ingreso
Duplica el atajo, cambia su nombre a **Anotar ingreso** y sustituye la URL por:

```text
https://cevallosgs8-boop.github.io/finanza-geek/#nuevo?tipo=ingreso
```

Elige la cuenta de destino y revisa los datos antes de guardar.

## Pedir el importe desde el atajo
Si prefieres escribir el importe antes de abrir la app, añade **Solicitar entrada** al principio, con tipo **Número** y una pregunta como «¿Cuánto fue?». En la acción URL, usa esta estructura:

```text
https://cevallosgs8-boop.github.io/finanza-geek/#nuevo?tipo=gasto&monto=[Importe]
```

**[Importe] representa la variable de salida de Solicitar entrada**: insértala con el selector de variables de Atajos, sin escribir los corchetes como texto. Para el ingreso, cambia solo `tipo=gasto` por `tipo=ingreso`. No formatees el número como moneda ni añadas separadores de miles. La app admite coma o punto decimal y hasta dos decimales; un valor vacío, cero o inválido se revisa en el formulario y no se guarda automáticamente. Si el número llega con otro formato, usa el atajo sencillo y escribe el importe dentro de la app.

Deja comercio, cuenta, categoría y fecha para completarlos en la app. Así no necesitas codificar texto variable ni poner datos personales en el enlace. Los parámetros van después de #; no los conviertas en una consulta antes de ese símbolo. El enlace puede quedar en el historial del navegador o del atajo: evita datos sensibles.

## Siri y prueba en el teléfono
Una vez creado, puedes pedirle a Siri que ejecute el nombre del atajo. El sistema puede pedir que desbloquees el iPhone. Si Finanza Geek solicita su PIN, introdúcelo tú mismo; el atajo no debe guardarlo.

Atajos puede abrir Safari en lugar de la app instalada. Comprueba que aparecen tus cuentas antes de registrar nada. Si ves una instalación vacía, detén la prueba y vuelve al icono que usas normalmente; no crees cuentas duplicadas ni restaures encima de datos existentes para intentar corregirlo. La continuidad entre Safari y la app instalada requiere comprobación en tu dispositivo.

Prueba primero con un movimiento ficticio y **cancela** el formulario: el saldo y el historial deben permanecer iguales. Después, si quieres verificar el guardado, hazlo solo con datos de prueba y confirma una sola vez.

Los enlaces se comprobaron con la lógica real de la app; la creación y ejecución de los atajos en el dispositivo siguen pendientes.

## Referencias
- [Apple: Solicitar entrada en iPhone o iPad](https://support.apple.com/es-us/guide/shortcuts/apd68b5c9161/ios).
- [Apple: ejecutar atajos con Siri](https://support.apple.com/es-us/guide/shortcuts/apd07c25bb38/ios).
- [Apple: introducción a Atajos](https://support.apple.com/es-lamr/guide/shortcuts/apdf22b0444c/ios).
