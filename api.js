/* ============================================================
   api.js  -  AgroBot Pro
   Funciones que conectan el juego (juego.js) con la base de datos.
   Incluir en index.html ANTES de juego.js:
       <script src="api.js"></script>
       <script src="juego.js"></script>
   ============================================================ */

const API = {

  // Jugador actual en memoria
  jugador: null,

  /* --------------------------------------------------------
     Registrar o recuperar jugador
     -------------------------------------------------------- */
  async entrar(nombre, edad, avatar) {
    try {
      const res = await fetch('guardar_jugador.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, edad, avatar })
      });
      const data = await res.json();

      if (data.menor) {
        // Pantalla de restriccion de edad
        return { bloqueado: true, mensaje: data.mensaje };
      }
      if (!data.ok) {
        console.error('Error al entrar:', data.error);
        return { bloqueado: false, error: data.error };
      }

      API.jugador = data.jugador;
      localStorage.setItem('idJugador', data.jugador.idJugador);
      return { bloqueado: false, jugador: data.jugador, nuevo: data.nuevo };

    } catch (e) {
      console.error('Sin conexion con el servidor:', e);
      return { bloqueado: false, error: 'No hay conexion con la base de datos' };
    }
  },

  /* --------------------------------------------------------
     Cargar todo el progreso guardado
     -------------------------------------------------------- */
  async cargarProgreso(idJugador) {
    const id = idJugador || localStorage.getItem('idJugador');
    if (!id) return null;

    try {
      const res  = await fetch('cargar_progreso.php?idJugador=' + id);
      const data = await res.json();
      if (!data.ok) { console.error(data.error); return null; }

      API.jugador = data.jugador;
      return data;   // { jugador, nivel, inventario, partidas, historial }

    } catch (e) {
      console.error('Error al cargar progreso:', e);
      return null;
    }
  },

  /* --------------------------------------------------------
     Catalogo de plantas por nivel (1 = clasicas, 2 = exoticas)
     -------------------------------------------------------- */
  async plantas(nivel) {
    try {
      const res  = await fetch('plantas.php?nivel=' + nivel);
      const data = await res.json();
      return data.ok ? data.plantas : [];
    } catch (e) {
      console.error('Error al cargar plantas:', e);
      return [];
    }
  },

  /* --------------------------------------------------------
     Comprar una planta
     -------------------------------------------------------- */
  async comprar(idPlanta, nivel) {
    if (!API.jugador) return { ok: false, error: 'No hay jugador activo' };

    try {
      const res = await fetch('comprar_planta.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idJugador: API.jugador.idJugador,
          idPlanta: idPlanta,
          nivel: nivel
        })
      });
      const data = await res.json();

      if (data.ok) API.jugador.monedas = data.monedas_total;
      return data;

    } catch (e) {
      return { ok: false, error: 'Sin conexion' };
    }
  },

  /* --------------------------------------------------------
     Guardar partida terminada (suma monedas automaticamente)
     -------------------------------------------------------- */
  async guardarPartida(nivel, plantasSalvadas) {
    if (!API.jugador) return { ok: false };

    try {
      const res = await fetch('guardar_partida.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idJugador: API.jugador.idJugador,
          nivel: nivel,
          plantas_salvadas: plantasSalvadas
        })
      });
      const data = await res.json();

      if (data.ok) API.jugador.monedas = data.monedas_total;
      return data;

    } catch (e) {
      return { ok: false, error: 'Sin conexion' };
    }
  },

  /* --------------------------------------------------------
     Guardar el codigo que escribio el jugador
     -------------------------------------------------------- */
  async guardarCodigo(codigo, resultado) {
    if (!API.jugador) return { ok: false };

    try {
      const res = await fetch('guardar_codigo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idJugador: API.jugador.idJugador,
          codigo: codigo,
          resultado: resultado || ''
        })
      });
      return await res.json();
    } catch (e) {
      return { ok: false };
    }
  },

  /* --------------------------------------------------------
     Ranking de jugadores
     -------------------------------------------------------- */
  async ranking() {
    try {
      const res  = await fetch('ranking.php');
      const data = await res.json();
      return data.ok ? data.ranking : [];
    } catch (e) {
      return [];
    }
  }
};


/* ============================================================
   EJEMPLOS DE USO dentro de juego.js
   ============================================================

   // 1) Cuando el jugador llena nombre, edad y avatar:
   const r = await API.entrar('Antoni', 16, 'avatar1.png');
   if (r.bloqueado) {
       mostrarPantallaMenorDeEdad(r.mensaje);
   } else {
       actualizarMonedas(r.jugador.monedas);
   }

   // 2) Al abrir el juego, recuperar lo guardado:
   const progreso = await API.cargarProgreso();
   if (progreso) {
       actualizarMonedas(progreso.jugador.monedas);
       pintarInventario(progreso.inventario);
   }

   // 3) Llenar la tienda del nivel 1:
   const lista = await API.plantas(1);

   // 4) Comprar:
   const compra = await API.comprar(3, 1);
   if (!compra.ok) AIDEN.hablar(compra.error);

   // 5) Al terminar el nivel:
   const fin = await API.guardarPartida(1, 8);
   AIDEN.hablar('Ganaste ' + fin.monedas_ganadas + ' monedas');

   // 6) Cada vez que ejecuta codigo en el editor:
   await API.guardarCodigo('dron.regar()', 'Planta regada');

   // 7) Tabla de posiciones:
   const tabla = await API.ranking();

   ============================================================ */
