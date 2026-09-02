<?php
/* ============================================================
   ranking.php
   Tabla de posiciones: los 10 jugadores con mas plantas salvadas.
   Se llama asi:  ranking.php
   ============================================================ */

include 'conexion.php';

$sql = "SELECT j.idJugador,
               j.nombre,
               j.avatar,
               j.monedas,
               COALESCE(SUM(pa.plantas_salvadas), 0) AS total_salvadas,
               COUNT(pa.idPartida)                   AS partidas_jugadas
        FROM jugador j
        LEFT JOIN partida pa ON j.idJugador = pa.idJugador
        GROUP BY j.idJugador
        ORDER BY total_salvadas DESC, j.monedas DESC
        LIMIT 10";

$resultado = $con->query($sql);

if (!$resultado) {
    responder(["ok" => false, "error" => "Error en la consulta: " . $con->error]);
}

$tabla = [];
$puesto = 1;

while ($fila = $resultado->fetch_assoc()) {
    $fila['puesto']           = $puesto++;
    $fila['total_salvadas']   = intval($fila['total_salvadas']);
    $fila['partidas_jugadas'] = intval($fila['partidas_jugadas']);
    $tabla[] = $fila;
}

responder(["ok" => true, "ranking" => $tabla]);
?>
