-- ============================================================
-- BASE DE DATOS: agrobot
-- Proyecto: AgroBot Pro
-- Autor: Antoni Eduardi Elias Dominguez (1F-07)
-- Instituto Nacional de Apopa - 1.° F Desarrollo de Software
-- ============================================================
-- COMO USAR:
-- 1. Abrir http://localhost/phpmyadmin
-- 2. Pestaña "Importar" -> Seleccionar este archivo -> Continuar
--    (o pegar todo el contenido en la pestaña "SQL")
-- ============================================================

DROP DATABASE IF EXISTS agrobot;
CREATE DATABASE agrobot CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE agrobot;

-- ------------------------------------------------------------
-- TABLA 1: jugador
-- ------------------------------------------------------------
CREATE TABLE jugador (
  idJugador INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(50)  NOT NULL,
  edad      INT          NOT NULL,
  avatar    VARCHAR(255) DEFAULT 'avatar1.png',
  monedas   INT          DEFAULT 50
);

-- ------------------------------------------------------------
-- TABLA 2: planta
-- (nivel 1 = clasicas, nivel 2 = exoticas, no se mezclan)
-- ------------------------------------------------------------
CREATE TABLE planta (
  idPlanta INT AUTO_INCREMENT PRIMARY KEY,
  nombre   VARCHAR(50) NOT NULL,
  tipo     ENUM('clasica','exotica') NOT NULL,
  precio   INT NOT NULL,
  imagen   VARCHAR(255)
);

-- ------------------------------------------------------------
-- TABLA 3: partida
-- ------------------------------------------------------------
CREATE TABLE partida (
  idPartida        INT AUTO_INCREMENT PRIMARY KEY,
  idJugador        INT NOT NULL,
  nivel            INT NOT NULL,
  plantas_salvadas INT DEFAULT 0,
  fecha            DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idJugador) REFERENCES jugador(idJugador) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TABLA 4: inventario
-- ------------------------------------------------------------
CREATE TABLE inventario (
  idInventario INT AUTO_INCREMENT PRIMARY KEY,
  idJugador    INT NOT NULL,
  idPlanta     INT NOT NULL,
  cantidad     INT DEFAULT 1,
  FOREIGN KEY (idJugador) REFERENCES jugador(idJugador) ON DELETE CASCADE,
  FOREIGN KEY (idPlanta)  REFERENCES planta(idPlanta)
);

-- ------------------------------------------------------------
-- TABLA 5: historial_codigo
-- (guarda todo lo que el jugador ha programado)
-- ------------------------------------------------------------
CREATE TABLE historial_codigo (
  idCodigo  INT AUTO_INCREMENT PRIMARY KEY,
  idJugador INT NOT NULL,
  codigo    TEXT NOT NULL,
  resultado VARCHAR(150),
  fecha     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idJugador) REFERENCES jugador(idJugador) ON DELETE CASCADE
);

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- 10 frutas clasicas (NIVEL 1)
INSERT INTO planta (nombre, tipo, precio, imagen) VALUES
('Mango',    'clasica', 20, 'img/mango.jpg'),
('Jocote',   'clasica', 15, 'img/jocote.jpg'),
('Marañon',  'clasica', 18, 'img/maranon.jpg'),
('Guineo',   'clasica', 12, 'img/guineo.jpg'),
('Papaya',   'clasica', 22, 'img/papaya.jpg'),
('Naranja',  'clasica', 16, 'img/naranja.jpg'),
('Sandia',   'clasica', 25, 'img/sandia.jpg'),
('Piña',     'clasica', 24, 'img/pina.jpg'),
('Coco',     'clasica', 28, 'img/coco.jpg'),
('Aguacate', 'clasica', 30, 'img/aguacate.jpg');

-- 10 frutas exoticas (NIVEL 2)
INSERT INTO planta (nombre, tipo, precio, imagen) VALUES
('Pitahaya',   'exotica', 45, 'img/pitahaya.jpg'),
('Nance',      'exotica', 35, 'img/nance.jpg'),
('Zapote',     'exotica', 40, 'img/zapote.jpg'),
('Guayaba',    'exotica', 33, 'img/guayaba.jpg'),
('Anona',      'exotica', 42, 'img/anona.jpg'),
('Mamey',      'exotica', 48, 'img/mamey.jpg'),
('Paterna',    'exotica', 38, 'img/paterna.jpg'),
('Granadilla', 'exotica', 44, 'img/granadilla.jpg'),
('Carambola',  'exotica', 46, 'img/carambola.jpg'),
('Tamarindo',  'exotica', 36, 'img/tamarindo.jpg');

-- Jugadores de prueba
INSERT INTO jugador (nombre, edad, avatar, monedas) VALUES
('Antoni', 16, 'avatar1.png', 50),
('Sofia',  15, 'avatar2.png', 120),
('Carlos', 17, 'avatar3.png', 85);

-- Partidas de prueba
INSERT INTO partida (idJugador, nivel, plantas_salvadas) VALUES
(1, 1, 8),
(2, 1, 10),
(2, 2, 6),
(3, 1, 5);

-- Inventario de prueba
INSERT INTO inventario (idJugador, idPlanta, cantidad) VALUES
(1, 1, 2),
(1, 3, 1),
(2, 11, 1);

-- Historial de codigo de prueba
INSERT INTO historial_codigo (idJugador, codigo, resultado) VALUES
(1, 'dron.avanzar()\ndron.regar()', 'Planta regada con exito'),
(1, 'dron.girar("derecha")', 'El dron giro a la derecha');

-- ============================================================
-- CONSULTAS DE EJEMPLO
-- ============================================================

-- Consulta 1: todos los jugadores
SELECT * FROM jugador;

-- Consulta 2: solo las plantas del nivel 1
SELECT nombre, precio FROM planta WHERE tipo = 'clasica';

-- Consulta 3: inventario con nombre de jugador y planta
SELECT j.nombre AS jugador, p.nombre AS planta, i.cantidad
FROM inventario i
JOIN jugador j ON i.idJugador = j.idJugador
JOIN planta  p ON i.idPlanta  = p.idPlanta;

-- Consulta 4: ranking por plantas salvadas
SELECT j.nombre, SUM(pa.plantas_salvadas) AS total
FROM jugador j
JOIN partida pa ON j.idJugador = pa.idJugador
GROUP BY j.idJugador
ORDER BY total DESC;
