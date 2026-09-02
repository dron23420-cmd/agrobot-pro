<?php
/* ============================================================
   comprar_planta.php
   Descuenta monedas y agrega la planta al inventario.
   Valida que la planta corresponda al nivel: nivel 1 solo
   clasicas, nivel 2 solo exoticas (no se mezclan).
   ============================================================ */

include 'conexion.php';

$d         = datosRecibidos();
$idJugador = intval($d['idJugador'] ?? 0);
$idPlanta  = intval($d['idPlanta']  ?? 0);
$nivel     = intval($d['nivel']     ?? 1);

if ($idJugador <= 0 || $idPlanta <= 0) {
    responder(["ok" => false, "error" => "Faltan datos de la compra"]);
}

// ---- Buscar la planta ----
$q = $con->prepare("SELECT nombre, tipo, precio FROM planta WHERE idPlanta = ?");
$q->bind_param("i", $idPlanta);
$q->execute();
$planta = $q->get_result()->fetch_assoc();

if (!$planta) {
    responder(["ok" => false, "error" => "Esa planta no existe"]);
}

// ---- Validar que sea del nivel correcto ----
$tipoEsperado = ($nivel == 1) ? 'clasica' : 'exotica';
if ($planta['tipo'] !== $tipoEsperado) {
    responder([
        "ok"    => false,
        "error" => "La " . $planta['nombre'] . " no pertenece al nivel " . $nivel
    ]);
}

// ---- Revisar monedas ----
$q2 = $con->prepare("SELECT monedas FROM jugador WHERE idJugador = ?");
$q2->bind_param("i", $idJugador);
$q2->execute();
$monedas = intval($q2->get_result()->fetch_assoc()['monedas'] ?? 0);

if ($monedas < $planta['precio']) {
    responder([
        "ok"      => false,
        "error"   => "No te alcanzan las monedas",
        "faltan"  => $planta['precio'] - $monedas
    ]);
}

// ---- Cobrar ----
$cobrar = $con->prepare("UPDATE jugador SET monedas = monedas - ? WHERE idJugador = ?");
$cobrar->bind_param("ii", $planta['precio'], $idJugador);
$cobrar->execute();

// ---- Agregar al inventario (si ya la tiene, suma cantidad) ----
$existe = $con->prepare("SELECT idInventario FROM inventario WHERE idJugador = ? AND idPlanta = ?");
$existe->bind_param("ii", $idJugador, $idPlanta);
$existe->execute();
$fila = $existe->get_result()->fetch_assoc();

if ($fila) {
    $sumar = $con->prepare("UPDATE inventario SET cantidad = cantidad + 1 WHERE idInventario = ?");
    $sumar->bind_param("i", $fila['idInventario']);
    $sumar->execute();
} else {
    $nuevo = $con->prepare("INSERT INTO inventario (idJugador, idPlanta, cantidad) VALUES (?, ?, 1)");
    $nuevo->bind_param("ii", $idJugador, $idPlanta);
    $nuevo->execute();
}

responder([
    "ok"            => true,
    "mensaje"       => "Compraste una " . $planta['nombre'],
    "monedas_total" => $monedas - $planta['precio']
]);
?>
