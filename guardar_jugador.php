<?php
/* ============================================================
   guardar_jugador.php
   Registra un jugador nuevo. Si el nombre ya existe, devuelve
   ese jugador en lugar de crear uno repetido.
   Aplica la restriccion de edad: menores de 14 no entran.
   ============================================================ */

include 'conexion.php';

$d      = datosRecibidos();
$nombre = trim($d['nombre'] ?? '');
$edad   = intval($d['edad'] ?? 0);
$avatar = $d['avatar'] ?? 'avatar1.png';

if ($nombre === '' || $edad <= 0) {
    responder(["ok" => false, "error" => "Falta el nombre o la edad"]);
}

// ---- Restriccion de edad ----
if ($edad < 14) {
    responder([
        "ok"      => false,
        "menor"   => true,
        "mensaje" => "AgroBot Pro esta disenado para jugadores de 14 anos en adelante."
    ]);
}

// ---- Si ya existe, lo devolvemos ----
$buscar = $con->prepare("SELECT idJugador, nombre, edad, avatar, monedas FROM jugador WHERE nombre = ?");
$buscar->bind_param("s", $nombre);
$buscar->execute();
$res = $buscar->get_result();

if ($res->num_rows > 0) {
    $jugador = $res->fetch_assoc();
    responder(["ok" => true, "nuevo" => false, "jugador" => $jugador]);
}

// ---- Si no existe, lo creamos con 50 monedas de regalo ----
$insertar = $con->prepare(
    "INSERT INTO jugador (nombre, edad, avatar, monedas) VALUES (?, ?, ?, 50)"
);
$insertar->bind_param("sis", $nombre, $edad, $avatar);

if (!$insertar->execute()) {
    responder(["ok" => false, "error" => "No se pudo guardar: " . $con->error]);
}

responder([
    "ok"      => true,
    "nuevo"   => true,
    "jugador" => [
        "idJugador" => $con->insert_id,
        "nombre"    => $nombre,
        "edad"      => $edad,
        "avatar"    => $avatar,
        "monedas"   => 50
    ]
]);
?>
