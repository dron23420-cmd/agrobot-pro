# AgroBot Pro — Base de datos con XAMPP

**Antoni Eduardi Elias Dominguez — 1F-07**
Instituto Nacional de Apopa · 1.° F Desarrollo de Software

---

## Archivos incluidos

| Archivo | Para qué sirve |
|---|---|
| `agrobot.sql` | Crea la base de datos, las 5 tablas y los datos de prueba |
| `conexion.php` | Conexión a MySQL (lo usan todos los demás) |
| `guardar_jugador.php` | Registra al jugador y aplica la restricción de 14 años |
| `cargar_progreso.php` | Devuelve monedas, inventario, partidas e historial |
| `plantas.php` | Catálogo de la tienda filtrado por nivel |
| `comprar_planta.php` | Descuenta monedas y guarda la planta |
| `guardar_partida.php` | Guarda el nivel terminado y suma monedas |
| `guardar_codigo.php` | Guarda lo que el jugador programa |
| `ranking.php` | Tabla de posiciones |
| `api.js` | Funciones JavaScript para llamar todo lo anterior |

---

## Instalación paso a paso

### 1. Encender XAMPP
Abre el **XAMPP Control Panel** y dale **Start** a:
- **Apache**
- **MySQL**

Los dos deben quedar en verde.

### 2. Copiar la carpeta
Pon todos estos archivos junto a tu juego en:

```
C:\xampp\htdocs\agrobot\
```

La carpeta debe quedar así:

```
C:\xampp\htdocs\agrobot\
   ├─ index.html
   ├─ estilos.css
   ├─ juego.js
   ├─ api.js
   ├─ conexion.php
   ├─ guardar_jugador.php
   ├─ cargar_progreso.php
   ├─ plantas.php
   ├─ comprar_planta.php
   ├─ guardar_partida.php
   ├─ guardar_codigo.php
   ├─ ranking.php
   └─ img\   (fotos de las frutas)
```

### 3. Importar la base de datos
1. Abre `http://localhost/phpmyadmin`
2. Pestaña **Importar**
3. **Seleccionar archivo** → busca `agrobot.sql`
4. Botón **Continuar**

Debe aparecer la base `agrobot` en el menú izquierdo con 5 tablas y las 20 frutas ya cargadas.

### 4. Conectar el juego
En tu `index.html`, antes de `juego.js`:

```html
<script src="api.js"></script>
<script src="juego.js"></script>
```

### 5. Probar
Abre en el navegador:

```
http://localhost/agrobot/
```

Para probar que los PHP responden, entra directo a:

```
http://localhost/agrobot/plantas.php?nivel=1
http://localhost/agrobot/ranking.php
```

Deben salir datos en formato JSON.

---

## Errores comunes

**"Undefined function mysqli" o el PHP se ve como texto**
Abriste el archivo con doble clic. Tiene que ser por `http://localhost/`, nunca por `file:///`.

**MySQL no arranca en XAMPP**
El puerto 3306 está ocupado por otro MySQL instalado en la PC. Desinstálalo o cambia el puerto en `my.ini`.

**"Access denied for user 'root'"**
Le pusiste contraseña a MySQL. Ponla en `conexion.php` en la variable `$contrasena`.

**"Unknown database 'agrobot'"**
No se importó el `.sql`. Repite el paso 3.

**El juego no guarda nada pero no da error**
Abre la consola del navegador con **F12** y revisa la pestaña Network para ver qué responde el PHP.

---

## Las 5 tablas

```
jugador          → idJugador, nombre, edad, avatar, monedas
planta           → idPlanta, nombre, tipo, precio, imagen
partida          → idPartida, idJugador, nivel, plantas_salvadas, fecha
inventario       → idInventario, idJugador, idPlanta, cantidad
historial_codigo → idCodigo, idJugador, codigo, resultado, fecha
```

Todas con llave primaria autoincrementable y 5 campos, siguiendo el estilo del ejemplo del profe.
