<?php
/* ============================================================
   plantas.php
   Devuelve el catalogo de plantas de la tienda.
   Se llama asi:  plantas.php?nivel=1   (clasicas)
                  plantas.php?nivel=2   (exoticas)
                  plantas.php           (todas)
   ============================================================ */

include 'conexion.php';

$nivel = intval($_GET['nivel'] ?? 0);

if ($nivel === 1 || $nivel === 2) {
    $tipo = ($nivel === 1) ? 'clasica' : 'exotica';
    $sql = $con->prepare("SELECT idPlanta, nombre, tipo, precio, imagen FROM planta WHERE tipo = ? ORDER BY precio ASC");
    $sql->bind_param("s", $tipo);
} else {
    $sql = $con->prepare("SELECT idPlanta, nombre, tipo, precio, imagen FROM planta ORDER BY tipo, precio ASC");
}

$sql->execute();
$plantas = $sql->get_result()->fetch_all(MYSQLI_ASSOC);

foreach ($plantas as &$p) {
    $p['idPlanta'] = intval($p['idPlanta']);
    $p['precio']   = intval($p['precio']);
}

responder(["ok" => true, "nivel" => $nivel, "plantas" => $plantas]);
?>
