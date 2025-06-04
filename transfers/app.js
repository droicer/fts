
// Cambiar el título dinámicamente
const titulo = document.querySelector("h2.text-center.mb-3");
titulo.innerHTML = "⚽ JUGADORES DLS 25 4/06/2025 BY <span id='droicer' style='cursor: pointer; color: #3498db; text-decoration: underline;'>DROICER</span>";
// Redirigir a YouTube al hacer clic en "DROICER"
document.getElementById("droicer").addEventListener("click", function () {
    window.location.href = "https://www.youtube.com/@Droicer";
});

window.onload = async function () {
    const SQL = await initSqlJs({
        locateFile: file => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm"
    });

    try {
        // Descargar el archivo ZIP modificado
        let response = await fetch("app.dzp");
        let rawData = await response.arrayBuffer();

        // Restaurar la cabecera ZIP (Agregar `50 4B 03 04` al inicio)
        let fixedData = new Uint8Array(rawData.byteLength + 4);
        fixedData.set([0x50, 0x4B, 0x03, 0x04]); // Firma ZIP
        fixedData.set(new Uint8Array(rawData), 4); // Agregar datos originales

        // Configurar zip.js para leer el archivo ZIP
        zip.configure({ useWebWorkers: false });

        const reader = new zip.ZipReader(new zip.Uint8ArrayReader(fixedData));
        const entries = await reader.getEntries();

        // Buscar el archivo "data.db"
        const dbEntry = entries.find(entry => entry.filename === "data.db");
        if (!dbEntry) {
            throw new Error("Archivo data.db no encontrado en el ZIP.");
        }

        // Extraer archivo con la contraseña
        const dbBlob = await dbEntry.getData(new zip.Uint8ArrayWriter(), {
            password: "a%!L&R55f4rVG%2@#HD#Ei"
        });

        // Convertir a Uint8Array para SQL.js
        const db = new SQL.Database(dbBlob);
        iniciarCarga(db);

        // Cerrar ZIP
        await reader.close();
    } catch (error) {
        console.error("Error cargando la base de datos:", error);
    }
};

let jugadores = [];
let jugadoresFiltrados = [];
let pagina = 0;
let paginaBusqueda = 0;
const jugadoresPorPagina = 6;
let enBusqueda = false;

function iniciarCarga(db) {
    const stmt = db.prepare(`
        SELECT j.id, j.nombre, j.apellido, j.apodo, 
               COALESCE(n.name, 'Desconocida') AS nacionalidad, 
               COALESCE(p.name, 'Sin posición') AS posicion, 
               COALESCE(pie.name, 'Desconocido') AS pie,
               j.estatura, j.aceleracion, j.velocidad, j.fon, j.potencia, 
               j.entrada, j.con, j.disparo, j.pase, 
               COALESCE(j.rpo_portero, 0) AS rpo_portero, 
               COALESCE(j.mpo_portero, 0) AS mpo_portero
        FROM jugadoresV2 j
        LEFT JOIN nacionalidad n ON j.nacionalidad = n.ID
        LEFT JOIN posiciones p ON j.posicion = p.ID
        LEFT JOIN pie_preferido pie ON j.pie = pie.ID
    `);

    while (stmt.step()) {
        jugadores.push(stmt.getAsObject());
    }

    jugadoresFiltrados = jugadores;
    cargarMasJugadores();

    window.addEventListener("scroll", function () {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
            if (enBusqueda) {
                cargarMasResultadosBusqueda();
            } else {
                cargarMasJugadores();
            }
        }
    });

    document.getElementById("search").addEventListener("input", function () {
        const filtro = this.value.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/\s+/g, ""); // Eliminar espacios internos

        if (filtro === "") {
            enBusqueda = false;
            jugadoresFiltrados = jugadores;
            pagina = 0;
            paginaBusqueda = 0; // 🔹 Reset de paginación de búsqueda
            document.getElementById("jugadores-container").innerHTML = "";
            cargarMasJugadores();
        } else {
            enBusqueda = true;
            jugadoresFiltrados = jugadores.filter(jugador => {
                let nombreCompleto = `${jugador.nombre} ${jugador.apellido}`
                    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, ""); // Eliminar espacios internos

                let nombreNormalizado = jugador.nombre
                    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, ""); // Quitar espacios

                let apellidoNormalizado = jugador.apellido
                    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, ""); // Quitar espacios

                let apodoNormalizado = jugador.apodo
                    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, ""); // Quitar espacios

                return (
                    nombreCompleto.includes(filtro) ||
                    nombreNormalizado.includes(filtro) ||
                    apellidoNormalizado.includes(filtro) ||
                    apodoNormalizado.includes(filtro)
                );
            });

            paginaBusqueda = 0; // 🔹 Reiniciar correctamente la paginación de búsqueda
            document.getElementById("jugadores-container").innerHTML = "";
            cargarMasResultadosBusqueda(); // 🔹 Llamar directamente la función de carga
        }
    });


}

function cargarMasJugadores() {
    if (enBusqueda) return;

    const inicio = pagina * jugadoresPorPagina;
    const fin = inicio + jugadoresPorPagina;
    const jugadoresMostrar = jugadores.slice(inicio, fin);

    if (jugadoresMostrar.length > 0) {
        mostrarJugadores(jugadoresMostrar);
        pagina++;
    }
}

function cargarMasResultadosBusqueda() {
    const inicio = paginaBusqueda * 20;
    const fin = inicio + 20;
    const jugadoresMostrar = jugadoresFiltrados.slice(inicio, fin);

    if (jugadoresMostrar.length > 0) {
        paginaBusqueda++; // 🔹 Asegurar que la paginación se incremente ANTES de mostrar
        mostrarJugadores(jugadoresMostrar);
    }
}



function mostrarJugadores(jugadoresMostrar) {
    const contenedor = document.getElementById("jugadores-container");

    jugadoresMostrar.forEach(jugador => {
        const card = document.createElement("div");
        card.className = "col-md-4";

        // Ruta de la imagen del jugador
        const rutaImagen = `fotos/${jugador.id}.webp`;
        const imagenPorDefecto = "fotos/player.webp";

        // Determinar el valor de la media según la posición
        const mediaValue = ["ED", "EI", "DC", "SD", "PO", "MCO", "MCD", "MC", "MI", "MD", "DFC", "LI", "LD"].includes(jugador.posicion) ? calcularMedia(jugador) : "??";

        // Determinar color circulo de la media
        let mediaColor;
        if (mediaValue === "??") {
            mediaColor = "background: linear-gradient(135deg, #7f8c8d, #95a5a6)"; // Gris para desconocidos
        } else {
            const mediaNum = mediaValue;
            if (mediaNum >= 0 && mediaNum <= 69) {
                mediaColor = "background: linear-gradient(135deg, #8c6239, #aa7e4c)"; // Bronce
            } else if (mediaNum >= 70 && mediaNum <= 79) {
                mediaColor = "background: linear-gradient(135deg, #ff9800, #ffb74d)"; // Naranja
            } else if (mediaNum >= 80 && mediaNum <= 89) {
                mediaColor = "background: linear-gradient(135deg,rgb(27, 170, 34), #4caf50)"; // Verde
            } else if (mediaNum >= 90 && mediaNum <= 100) {
                mediaColor = "background: linear-gradient(135deg, #004c8c, #1565c0)"; // Celeste oscuro
            } else {
                mediaColor = "background: linear-gradient(135deg, #7f8c8d, #95a5a6)"; // Gris por seguridad
            }
        }

        // Determinar el color de fondo según la media del jugador
        let bgColor;
        if (mediaValue >= 80) {
            bgColor = "linear-gradient(165deg, rgb(255, 215, 0) 0%, rgb(218, 165, 32) 100%)"; // Dorado
        } else if (mediaValue >= 70) {
            bgColor = "linear-gradient(165deg, rgb(0, 200, 250) 0%, rgb(0, 115, 247) 100%)"; // Celeste
        } else {
            bgColor = "linear-gradient(165deg, rgb(139, 69, 19) 0%, rgb(205, 127, 50) 100%)"; // Bronce
        }

        // Definir el color de la posición
        let colorPosicion;
        if (["ED", "EI", "DC", "SD"].includes(jugador.posicion)) {
            colorPosicion = "background: linear-gradient(135deg, #c0392b, #e74c3c)"; // Rojo
        } else if (["MC", "MCD", "MD", "MI", "MCO"].includes(jugador.posicion)) {
            colorPosicion = "background: linear-gradient(135deg, #e67e22, #f39c12)"; // Naranja
        } else if (["DFC", "LI", "LD"].includes(jugador.posicion)) {
            colorPosicion = "background: linear-gradient(135deg, #27ae60, #2ecc71)"; // Verde
        } else if (["PO"].includes(jugador.posicion)) {
            colorPosicion = "background: linear-gradient(135deg,rgb(0, 119, 255),rgb(0, 140, 255))"; // Verde
        } else {
            colorPosicion = "background: linear-gradient(135deg, #7f8c8d, #95a5a6)"; // Gris (por defecto)
        }

        card.innerHTML = `
            <div class="card mb-4" 
                style="background: ${bgColor}; border-radius: 8px; overflow: hidden; border: none;">
                
                <!-- Contenedor para imagen y media -->
                <div class="position-relative">
                    <!-- Imagen del Jugador -->
                    <div class="player-img-container">
                        <img class="player-image" src="${rutaImagen}" onerror="this.onerror=null; this.src='${imagenPorDefecto}';" alt="Jugador">
                    </div>
                    
                    <!-- Círculo de Media -->
                    <div class="media-circle" style="${mediaColor}">
                        <span class="media-value">${mediaValue}</span>
                    </div>
                </div>
        
                <div class="card-body p-3">
                    <!-- Encabezado -->
                    <div class="d-flex justify-content-between align-items-start mb-4">
                        <div class="position-relative">
                            <h5 class="card-title text-white mb-1" style="font-size: 1.3rem; font-weight: 600;">${jugador.nombre}</h5>
                            <h6 class="text-white-50" style="font-size: 1rem;">${jugador.apellido}</h6>
                        </div>
                        <div class="d-flex gap-2">
                            <span class="badge" style="background: linear-gradient(135deg, #2980b9, #3498db)">${jugador.nacionalidad}</span>
                            <span class="badge" style="${colorPosicion}">${jugador.posicion}</span>
                        </div>
                    </div>
        
                    <!-- Estadísticas según la posición -->
                     ${jugador.posicion === "PO" ? `
        <div class="stats-section mb-4">
            <div class="row g-3">
                ${crearStat("VEL", jugador.velocidad)}
                ${crearStat("ACE", jugador.aceleracion)}
                ${crearStat("RPO", jugador.rpo_portero)}
                ${crearStat("POT", jugador.potencia)}
            </div>
        </div>

        <div class="stats-section mb-4">
            <div class="row g-3">
                ${crearStat("CON", jugador.con)}
                ${crearStat("PAS", jugador.pase)}
                ${crearStat("MPO", jugador.mpo_portero)}
                ${crearStat("ENT", jugador.entrada)}
            </div>
        </div>
    ` : `
        <div class="stats-section mb-4">
            <div class="row g-3">
                ${crearStat("VEL", jugador.velocidad)}
                ${crearStat("ACE", jugador.aceleracion)}
                ${crearStat("FON", jugador.fon)}
                ${crearStat("POT", jugador.potencia)}
            </div>
        </div>

        <div class="stats-section mb-4">
            <div class="row g-3">
                ${crearStat("CON", jugador.con)}
                ${crearStat("PAS", jugador.pase)}
                ${crearStat("DIS", jugador.disparo)}
                ${crearStat("ENT", jugador.entrada)}
            </div>
        </div>
    `}
        
                    <!-- Info adicional -->
                    <div class="d-flex align-items-center gap-3 mt-3" style="color:rgb(255, 255, 255);">
                        <span style="font-size: 0.85rem;">
                            <i class="fas fa-ruler-vertical me-1"></i>${jugador.estatura}cm
                        </span>
                        <span style="font-size: 0.85rem;">
                            <i class="fas fa-shoe-prints me-1"></i>${jugador.pie}
                        </span>
                    </div>                                       
                </div>
            </div>
        `;


        contenedor.appendChild(card);
    });
}


// Función para calcular la media de un jugador si es ED, EI o DC
function calcularMedia(jugador) {

    if (!jugador.posicion) {
        return "??";
    }

    // Obtener valores numéricos asegurando que no tengan formato string con decimal
    const aceleracion = Number(jugador.aceleracion);
    const velocidad = Number(jugador.velocidad);
    const fondo = Number(jugador.fon);
    const potencia = Number(jugador.potencia);
    const entrada = Number(jugador.entrada);
    const control = Number(jugador.con);
    const disparo = Number(jugador.disparo);
    const pase = Number(jugador.pase);
    const mpo = Number(jugador.mpo_portero);
    const rpo = Number(jugador.rpo_portero);

    let media;

    if (jugador.posicion === "PO") {
        // Pesos para el portero
        const pesosPOR = {
            ace: 10,
            vel: 5,
            fon: 5,
            pot: 5,
            ent: 5,
            con: 5,
            dis: 5,
            pas: 10,
            mpo: 450,
            rpo: 490
        };

        const sumaPesosPOR = 990; // Suma total de los pesos del portero
        media = 40 + (
            (aceleracion * pesosPOR.ace) +
            (velocidad * pesosPOR.vel) +
            (fondo * pesosPOR.fon) +
            (potencia * pesosPOR.pot) +
            (entrada * pesosPOR.ent) +
            (control * pesosPOR.con) +
            (disparo * pesosPOR.dis) +
            (pase * pesosPOR.pas) +
            (mpo * pesosPOR.mpo) +
            (rpo * pesosPOR.rpo)
        ) / sumaPesosPOR;

    } else {
        // Pesos para ED, EI, DC, MCO
        const pesos = {
            ace: 125,
            vel: 155,
            fon: 50,
            pot: 150,
            ent: 100,
            con: 210,
            dis: 102,
            pas: 100
        };

        const sumaPesos = 990; // Suma total de los pesos
        media = 40 + (
            (aceleracion * pesos.ace) +
            (velocidad * pesos.vel) +
            (fondo * pesos.fon) +
            (potencia * pesos.pot) +
            (entrada * pesos.ent) +
            (control * pesos.con) +
            (disparo * pesos.dis) +
            (pase * pesos.pas)
        ) / sumaPesos;

    }


    return Math.round(Number(String(Math.round(media)).slice(0, -1)));
    //return Math.round(media);
}

// Función para asignar el color del texto según el valor de la estadística
function obtenerColorTexto(valor) {
    if (valor >= 0 && valor <= 499) return "rgb(255, 2, 2)"; // Rojo
    if (valor >= 500 && valor <= 599) return "rgb(238, 59, 59)"; // Rojo
    if (valor >= 600 && valor <= 699) return "rgb(255, 166, 2)"; // Naranja
    if (valor >= 700 && valor <= 799) return "rgb(251, 255, 2)"; // Amarillo
    if (valor >= 800 && valor <= 899) return "rgb(52, 221, 0)"; // Verde
    if (valor >= 900 && valor <= 1000) return "rgb(2, 225, 255)"; // Celeste
    return "#ffffff"; // Blanco por defecto
}

// Función auxiliar para crear cada estadística con texto dinámico
function crearStat(label, valor) {
    let colorTexto = obtenerColorTexto(valor); // Obtener color dinámico según el valor
    return `
        <div class="col-3">
            <div class="stat-circle-wrapper">
                <div class="stat-circle" style="background: linear-gradient(135deg,rgb(0, 0, 0), #000000)">
                    <span class="stat-value" style="color: ${colorTexto}; font-weight: bold;">
                        ${Number(String(valor).slice(0, -1))}
                    </span>
                    <span class="stat-label">${label}</span>
                </div>
            </div>
        </div>
    `;
}
