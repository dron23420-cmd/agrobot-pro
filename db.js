/* ==========================================================================
   db.js  -  AgroBot Pro  ·  PUENTE CON LA BASE DE DATOS

   Este archivo conecta el juego con MySQL SIN modificar juego.js.

   ¿Como lo hace? Con una tecnica que se llama "envolver una funcion"
   (wrapping): guarda la funcion original del juego, la reemplaza por
   una version propia que hace lo mismo de siempre Y ADEMAS manda los
   datos al servidor. Si el servidor falla, el juego sigue funcionando
   igual con localStorage, sin romperse.

   Se carga DESPUES de juego.js:
       <script src="api.js"></script>
       <script src="juego.js"></script>
       <script src="db.js"></script>
   ========================================================================== */

(function () {
  'use strict';

  var ULTIMO_ENVIO = 0;
  var ESPERA_MS    = 1500;   // no manda mas de una vez cada 1.5 segundos
  var pendiente    = null;

  /* --------------------------------------------------------
     Manda el perfil del jugador a MySQL
     -------------------------------------------------------- */
  function sincronizar(u) {
    if (!u || !u.name || !u.age) return;

    var datos = {
      nombre:   u.name,
      edad:     u.age,
      avatar:   u.avatar || 'avatar1.png',
      monedas:  u.coins || 0,
      nivel:    u.level || 1,
      salvadas: u.totalRescues || 0
    };

    fetch('sincronizar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res.ok) {
        localStorage.setItem('idJugador', res.idJugador);
        console.log('%c[BD] Perfil guardado en MySQL · id ' + res.idJugador +
                    ' · ' + datos.monedas + ' monedas',
                    'color:#4ade80');
      } else {
        console.warn('[BD] El servidor respondio con error:', res.error);
      }
    })
    .catch(function () {
      console.warn('[BD] Sin conexion con el servidor. El juego sigue ' +
                   'guardando en el navegador.');
    });
  }

  /* --------------------------------------------------------
     Envolvemos saveUserData: sigue guardando en localStorage
     igual que antes, pero ahora tambien manda a MySQL.
     -------------------------------------------------------- */
  if (typeof window.saveUserData === 'function') {
    var guardarOriginal = window.saveUserData;

    window.saveUserData = function (d) {
      var resultado = guardarOriginal(d);   // lo de siempre

      // Espaciamos los envios para no saturar el servidor
      var ahora = Date.now();
      clearTimeout(pendiente);
      if (ahora - ULTIMO_ENVIO > ESPERA_MS) {
        ULTIMO_ENVIO = ahora;
        sincronizar(d);
      } else {
        pendiente = setTimeout(function () {
          ULTIMO_ENVIO = Date.now();
          sincronizar(d);
        }, ESPERA_MS);
      }

      return resultado;
    };

    console.log('%c[BD] Puente activo: el perfil se guarda en MySQL',
                'color:#5ce1ff');
  } else {
    console.error('[BD] No se encontro saveUserData. ' +
                  'Revisa que db.js se cargue DESPUES de juego.js.');
  }

  /* --------------------------------------------------------
     Envolvemos runCode: guarda en MySQL cada codigo ejecutado,
     para que AIDEN pueda mostrar el historial de programacion.
     -------------------------------------------------------- */
  if (typeof window.runCode === 'function') {
    var ejecutarOriginal = window.runCode;

    window.runCode = function () {
      var resultado = ejecutarOriginal.apply(this, arguments);

      try {
        var editor = document.getElementById('python-editor');
        var id     = localStorage.getItem('idJugador');

        if (editor && editor.value.trim() && id) {
          fetch('guardar_codigo.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idJugador: parseInt(id),
              codigo:    editor.value.trim(),
              resultado: 'Ejecutado desde el editor'
            })
          })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.ok) {
              console.log('%c[BD] Codigo guardado · llevas ' + res.total +
                          ' programas', 'color:#4ade80');
            }
          })
          .catch(function () { /* silencio: no molestar al jugador */ });
        }
      } catch (e) { /* nunca romper el juego por esto */ }

      return resultado;
    };
  }

  /* --------------------------------------------------------
     Funcion util: la puedes llamar desde la consola del
     navegador (F12) escribiendo  verBD()  para revisar que
     se esta guardando.
     -------------------------------------------------------- */
  window.verBD = function () {
    var id = localStorage.getItem('idJugador');
    if (!id) {
      console.log('Todavia no hay jugador guardado en MySQL. ' +
                  'Crea una cuenta primero.');
      return;
    }
    fetch('cargar_progreso.php?idJugador=' + id)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        console.log('=== TU PROGRESO EN MYSQL ===');
        console.log('Jugador :', d.jugador);
        console.log('Partidas:', d.partidas.length);
        console.log('Codigos :', d.historial.length);
        console.table(d.inventario);
      });
  };

})();
