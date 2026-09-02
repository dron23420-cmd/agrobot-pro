<?php
/* ============================================================
   cargar_progreso.php
   Devuelve todo lo del jugador cuando entra al juego:
   sus datos, monedas, inventario, partidas e historial de codigo.
   Se llama asi:  cargar_progreso.php?idJugador=1
   ============================================================ */

include 'conexion.php';

$idJugador = intval($_GET['idJugador'] ?? 0);

if ($idJugador <= 0) {
    responder(["ok" => false, "error" => "Falta el id del jugador"]);
}

// ---- Datos del jugador ----
$q = $con->prepare("SELECT idJugador, nombre, edad, avatar, monedas FROM jugador WHERE idJugador = ?");
$q->bind_param("i", $idJugador);
$q->execute();
$jugador = $q->get_result()->fetch_assoc();

if (!$jugador) {
    responder(["ok" => false, "error" => "Ese jugador no existe"]);
}

// ---- Inventario ----
$q = $con->prepare(
    "SELECT p.idPlanta, p.nombre, p.tipo, p.imagen, i.cantidad
     FROM inventario i
     JOIN planta p ON i.idPlanta = p.idPlanta
     WHERE i.idJugador = ?"
);
$q->bind_param("i", $idJugador);
$q->execute();
$inventario = $q->get_result()->fetch_all(MYSQLI_ASSOC);

// ---- Partidas ----
$q = $con->prepare(
    "SELECT nivel, plantas_salvadas, fecha
     FROM partida WHERE idJugador = ? ORDER BY fecha DESC LIMIT 10"
);
$q->bind_param("i", $idJugador);
$q->execute();
$partidas = $q->get_result()->fetch_all(MYSQLI_ASSOC);

// ---- Historial de codigo ----
$q = $con->prepare(
    "SELECT codigo, resultado, fecha
     FROM historial_codigo WHERE idJugador = ? ORDER BY fecha DESC LIMIT 20"
);
$q->bind_param("i", $idJugador);
$q->execute();
$historial = $q->get_result()->fetch_all(MYSQLI_ASSOC);

// ---- Nivel maximo alcanzado ----
$nivelMax = 1;
foreach ($partidas as $p) {
    if ($p['nivel'] > $nivelMax) $nivelMax = intval($p['nivel']);
}

responder([
    "ok"         => true,
    "jugador"    => $jugador,
    "nivel"      => $nivelMax,
    "inventario" => $inventario,
    "partidas"   => $partidas,
    "historial"  => $historial
]);
?>
