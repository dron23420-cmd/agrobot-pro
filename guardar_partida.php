<?php
/* ============================================================
   guardar_partida.php
   Guarda el resultado de una partida y le suma monedas al
   jugador: 1 moneda por cada planta salvada.
   ============================================================ */

include 'conexion.php';

$d         = datosRecibidos();
$idJugador = intval($d['idJugador'] ?? 0);
$nivel     = intval($d['nivel'] ?? 1);
$salvadas  = intval($d['plantas_salvadas'] ?? 0);

if ($idJugador <= 0) {
    responder(["ok" => false, "error" => "Falta el id del jugador"]);
}

// ---- Guardar la partida ----
$sql = $con->prepare(
    "INSERT INTO partida (idJugador, nivel, plantas_salvadas) VALUES (?, ?, ?)"
);
$sql->bind_param("iii", $idJugador, $nivel, $salvadas);

if (!$sql->execute()) {
    responder(["ok" => false, "error" => "No se pudo guardar la partida"]);
}

$idPartida = $con->insert_id;

// ---- Sumar monedas ganadas ----
$premio = $salvadas; // 1 moneda por planta salvada

$actualizar = $con->prepare("UPDATE jugador SET monedas = monedas + ? WHERE idJugador = ?");
$actualizar->bind_param("ii", $premio, $idJugador);
$actualizar->execute();

// ---- Devolver el total actualizado ----
$consulta = $con->prepare("SELECT monedas FROM jugador WHERE idJugador = ?");
$consulta->bind_param("i", $idJugador);
$consulta->execute();
$monedas = $consulta->get_result()->fetch_assoc()['monedas'] ?? 0;

responder([
    "ok"              => true,
    "idPartida"       => $idPartida,
    "monedas_ganadas" => $premio,
    "monedas_total"   => intval($monedas)
]);
?>
