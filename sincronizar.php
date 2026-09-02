<?php
/* ============================================================
   sincronizar.php  -  AgroBot Pro
   Recibe el perfil completo del jugador y lo guarda en MySQL.
   Si el jugador ya existe (mismo nombre) lo actualiza,
   si no existe lo crea. A esto se le llama "upsert".
   ============================================================ */

include 'conexion.php';

$d       = datosRecibidos();
$nombre  = trim($d['nombre']  ?? '');
$edad    = intval($d['edad']    ?? 0);
$avatar  = substr($d['avatar']  ?? '', 0, 250);
$monedas = intval($d['monedas'] ?? 0);
$nivel   = intval($d['nivel']   ?? 1);
$salvadas= intval($d['salvadas']?? 0);

if ($nombre === '' || $edad <= 0) {
    responder(["ok" => false, "error" => "Falta nombre o edad"]);
}

// ---- Restriccion de edad ----
if ($edad < 14) {
    responder(["ok" => false, "menor" => true,
               "mensaje" => "AgroBot Pro es para jugadores de 14 anos en adelante."]);
}

// ---- Buscar si ya existe ----
$q = $con->prepare("SELECT idJugador FROM jugador WHERE nombre = ?");
$q->bind_param("s", $nombre);
$q->execute();
$fila = $q->get_result()->fetch_assoc();

if ($fila) {
    // Ya existe: actualizamos sus datos
    $id = intval($fila['idJugador']);
    $up = $con->prepare("UPDATE jugador SET edad = ?, avatar = ?, monedas = ? WHERE idJugador = ?");
    $up->bind_param("isii", $edad, $avatar, $monedas, $id);
    $up->execute();
    $nuevo = false;
} else {
    // No existe: lo creamos
    $ins = $con->prepare("INSERT INTO jugador (nombre, edad, avatar, monedas) VALUES (?, ?, ?, ?)");
    $ins->bind_param("issi", $nombre, $edad, $avatar, $monedas);
    $ins->execute();
    $id = $con->insert_id;
    $nuevo = true;
}

responder([
    "ok"        => true,
    "idJugador" => $id,
    "nuevo"     => $nuevo,
    "monedas"   => $monedas
]);
?>
