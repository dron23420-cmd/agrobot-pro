<?php
/* ============================================================
   guardar_codigo.php
   Guarda cada codigo que el jugador escribe en el editor,
   para que AIDEN pueda mostrarle su historial de programacion.
   ============================================================ */

include 'conexion.php';

$d         = datosRecibidos();
$idJugador = intval($d['idJugador'] ?? 0);
$codigo    = trim($d['codigo'] ?? '');
$resultado = substr(trim($d['resultado'] ?? ''), 0, 150);

if ($idJugador <= 0 || $codigo === '') {
    responder(["ok" => false, "error" => "Falta el jugador o el codigo"]);
}

$sql = $con->prepare(
    "INSERT INTO historial_codigo (idJugador, codigo, resultado) VALUES (?, ?, ?)"
);
$sql->bind_param("iss", $idJugador, $codigo, $resultado);

if (!$sql->execute()) {
    responder(["ok" => false, "error" => "No se pudo guardar el codigo"]);
}

// Cuantas veces ha programado en total
$q = $con->prepare("SELECT COUNT(*) AS total FROM historial_codigo WHERE idJugador = ?");
$q->bind_param("i", $idJugador);
$q->execute();
$total = intval($q->get_result()->fetch_assoc()['total'] ?? 0);

responder([
    "ok"       => true,
    "idCodigo" => $con->insert_id,
    "total"    => $total
]);
?>
