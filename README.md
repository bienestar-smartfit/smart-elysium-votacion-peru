# Smart Elysium Perú

Votación de los 12 reconocimientos **Los Dioses del Olimpo Smart Fit** para el equipo de Perú (Lima, 11 de diciembre). Cada persona entra con su correo corporativo de Google y vota por un nominado en cada categoría.

Es la misma votación de Colombia ([smart-elysium-votacion](https://github.com/bienestar-smartfit/smart-elysium-votacion)), con estos cambios:

- Una sola sede, **Lima**: no se pide elegir ciudad.
- La lista de nominados es la base de colaboradores de Perú.
- Zona horaria `America/Lima`.

- **Página pública (GitHub Pages):** `index.html` presenta las categorías y lleva al enlace de votación.
- **Votación (Google Apps Script):** `apps-script/` guarda los votos en una hoja de cálculo de Google.

## Cómo funciona

| | |
|---|---|
| Quién vota | Cualquier persona con cuenta del dominio corporativo |
| Votos | Cada persona vota en las categorías que quiera (una, varias o las 12) y pulsa **Enviar votos**. Se envían una sola vez y no se pueden cambiar |
| Dónde quedan | Hoja **Votos** de la hoja de cálculo |
| Quién ve el conteo | El dueño del script y los correos en **Config › organizadores** |
| Resultados | El organizador los publica: todos ven el top 3 por categoría |

## Instalación (10 minutos, una sola vez)

1. **Crea la hoja de cálculo.** En Google Drive, con tu cuenta corporativa, crea una hoja nueva llamada `Smart Elysium Perú – Votos`.
2. **Abre Apps Script.** En la hoja: *Extensiones › Apps Script*.
3. **Copia el código.**
   - Reemplaza el contenido de `Código.gs` con [`apps-script/Code.gs`](apps-script/Code.gs).
   - *Archivo › + › HTML*, nómbralo `Index` y pega [`apps-script/Index.html`](apps-script/Index.html).
   - *Configuración del proyecto ›* activa “Mostrar el archivo de manifiesto `appsscript.json`” y pega [`apps-script/appsscript.json`](apps-script/appsscript.json).
4. **Crea las hojas.** En el editor elige la función `setup` y pulsa *Ejecutar*. Acepta los permisos. Aparecerán las pestañas **Votos**, **Votados** y **Config**.
5. **Carga la lista de Perú.** En la pestaña **Votados**, desde la fila 2, pega Nombre, Correo y Área de los colaboradores (el archivo `votados-peru.csv` que se entrega aparte; la lista no se sube a este repositorio porque es público). El correo es opcional: si lo agregas, nadie podrá votar por sí mismo. Si un votante escribe un nombre que no está, se agrega solo con Origen "Agregado al votar".
6. **Agrega organizadores.** En **Config**, fila `organizadores`, escribe los correos separados por coma.
7. **Publica.** *Implementar › Nueva implementación › Aplicación web*:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario de tu dominio**

   Copia la URL que termina en `/exec`.
8. **Conecta GitHub Pages.** Pega esa URL en [`config.js`](config.js):
   ```js
   window.SMART_ELYSIUM_URL = "https://script.google.com/a/macros/.../exec";
   ```
   Y activa Pages en *Settings › Pages › Deploy from a branch › main / (root)*.

## Durante el evento

En la parte inferior de la página de votación, los organizadores ven el **Panel del organizador**:

- **Cerrar votación**: nadie más puede votar.
- **Publicar resultados**: guarda el top 3 de cada categoría y lo muestra a todos.
- **Reabrir / Ocultar resultados**: deshace lo anterior.

El detalle completo de votos siempre está en la hoja **Votos**.

## Actualizar el código

Si cambias algo en `apps-script/`, cópialo de nuevo al editor y usa *Implementar › Gestionar implementaciones › Editar › Nueva versión* para conservar la misma URL.
