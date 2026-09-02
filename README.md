# 🌱 AgroBot Pro

Juego educativo que enseña a programar mediante comandos, ambientado en la
agricultura de El Salvador. El jugador escribe código real para dirigir un
dron que riega y rescata cultivos.

**Antoni Eduardi Elias Domínguez** — Código `1F-07`
Instituto Nacional de Apopa · 1.° F, Desarrollo de Software
Módulo 1.2 — Ing. Oscar Cortez

---

## Qué hace

- Editor de código donde el jugador escribe instrucciones para el dron
- Asistente virtual (AIDEN) que explica los comandos y guía al jugador
- Sistema de niveles: nivel 1 con frutas clásicas, nivel 2 con exóticas
- Economía de monedas para comprar plantas en la tienda
- Restricción de edad: 14 años mínimo
- Progreso guardado en base de datos MySQL

---

## Tecnologías

| Capa | Herramienta |
|---|---|
| Interfaz | HTML5, CSS3, JavaScript |
| Servidor | PHP 8.2 |
| Base de datos | MySQL / MariaDB |
| Entorno | XAMPP (Apache + MySQL) |

---

## Estructura de la base de datos

Cinco tablas relacionadas mediante llaves foráneas:

| Tabla | Contenido |
|---|---|
| `jugador` | Nombre, edad, avatar y monedas |
| `planta` | Catálogo de 20 frutas, clásicas y exóticas |
| `partida` | Nivel jugado y plantas salvadas |
| `inventario` | Plantas que el jugador ha comprado |
| `historial_codigo` | Cada programa que el jugador ha ejecutado |

---

## Instalación

**Requisitos:** XAMPP con Apache y MySQL

1. Copiar el proyecto a `C:\xampp\htdocs\agrobot\`
2. Iniciar **Apache** y **MySQL** desde el panel de XAMPP
3. Entrar a `http://localhost/phpmyadmin`
4. Importar el archivo `agrobot.sql` (pestaña **Importar**)
5. Duplicar `conexion.ejemplo.php` y renombrar la copia a `conexion.php`
6. Abrir `http://localhost/agrobot/`

---

## Archivos del servidor

| Archivo | Función |
|---|---|
| `conexion.php` | Conexión a MySQL (no se sube al repositorio) |
| `sincronizar.php` | Guarda y actualiza el perfil del jugador |
| `guardar_jugador.php` | Registro con validación de edad |
| `cargar_progreso.php` | Recupera monedas, inventario e historial |
| `plantas.php` | Catálogo filtrado por nivel |
| `comprar_planta.php` | Descuenta monedas y valida el nivel |
| `guardar_partida.php` | Registra la partida y otorga monedas |
| `guardar_codigo.php` | Almacena el código ejecutado |
| `ranking.php` | Tabla de posiciones |

---

## Nota

Al ser un proyecto en PHP con base de datos, el juego necesita un servidor
para funcionar. No se ejecuta abriendo el archivo directamente desde el
explorador: debe correr sobre XAMPP siguiendo los pasos de instalación.

Todas las consultas usan **sentencias preparadas** (`prepare` y `bind_param`)
para prevenir inyección SQL.
