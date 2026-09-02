<?php
/* ============================================================
   conexion.ejemplo.php  -  AgroBot Pro

   Esta es la PLANTILLA de conexion. El archivo real
   (conexion.php) no se sube a GitHub porque lleva la
   contrasena de la base de datos.

   COMO USARLA:
   1. Copia este archivo y renombra la copia a "conexion.php"
   2. Pon abajo los datos de tu servidor
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

$servidor   = "localhost";
$usuario    = "root";
$contrasena = "";          // <-- en XAMPP va vacia
$baseDatos  = "agrobot";

$con = new mysqli($servidor, $usuario, $contrasena, $baseDatos);

if ($con->connect_error) {
    echo json_encode([
        "ok"    => false,
        "error" => "No se pudo conectar a la base de datos: " . $con->connect_error
    ]);
    exit;
}

$con->set_charset("utf8mb4");

function datosRecibidos() {
    $json = json_decode(file_get_contents("php://input"), true);
    return is_array($json) ? $json : $_POST;
}

function responder($arreglo) {
    echo json_encode($arreglo, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
