const jugadoresAzules = [25837, 25835, 25836, 25841, 25842, 25844, 25845, 25846, 25847, 25849, 25977, 26022];
const jugadoresMorados = [25982, 25983, 25984, 25985, 25986, 25987, 25988, 25989, 25990, 25991, 25992];
const jugadoresNegros = [24595, 24596, 24597, 24598, 25089, 25090, 25091, 25092, 25093, 25094, 25095, 25096, 25097, 25098, 25099, 25100];

let jugadores = [];
let jugadoresFiltrados = [];
let pagina = 0;
let paginaBusqueda = 0;
const jugadoresPorPagina = 6;
let enBusqueda = false;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('droicer').addEventListener('click', () => {
        window.location.href = 'https://www.youtube.com/@Droicer';
    });

    initApp();
});

async function initApp() {
    if (typeof zip === 'undefined') {
        console.error('JSZip no está definido. Asegúrate de que la librería JSZip esté cargada.');
        return;
    }

    const SQL = await initSqlJs({
        locateFile: () => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm"
    });

    try {
        let response = await fetch("app.dzp");
        let rawData = await response.arrayBuffer();
        let fixedData = new Uint8Array(rawData.byteLength + 4);
        fixedData.set([0x50, 0x4B, 0x03, 0x04]);
        fixedData.set(new Uint8Array(rawData), 4);

        zip.configure({ useWebWorkers: false });
        const reader = new zip.ZipReader(new zip.Uint8ArrayReader(fixedData));
        const entries = await reader.getEntries();
        const dbEntry = entries.find(entry => entry.filename === "data.db");
        if (!dbEntry) throw new Error("Archivo data.db no encontrado en el ZIP.");

        const dbBlob = await dbEntry.getData(new zip.Uint8ArrayWriter(), {
            password: "a%!L&R55f4rVG%2@#HD#Ei"
        });

        const db = new SQL.Database(dbBlob);
        iniciarCarga(db);
        await reader.close();
    } catch (error) {
        console.error("Error cargando la base de datos:", error);
    }
}

function llenarFiltros(db) {
    const selectNacionalidad = document.getElementById("filtro-nacionalidad");
    const selectPosicion = document.getElementById("filtro-posicion");

    const stmtNac = db.prepare("SELECT DISTINCT name FROM nacionalidad ORDER BY name ASC");
    while (stmtNac.step()) {
        const option = document.createElement("option");
        option.value = option.textContent = stmtNac.getAsObject().name;
        selectNacionalidad.appendChild(option);
    }

    const stmtPos = db.prepare("SELECT DISTINCT name FROM posiciones ORDER BY name ASC");
    while (stmtPos.step()) {
        const option = document.createElement("option");
        option.value = option.textContent = stmtNac.getAsObject().name;
        selectPosicion.appendChild(option);
    }
}

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

    while (stmt.step()) jugadores.push(stmt.getAsObject());
    llenarFiltros(db);
    jugadoresFiltrados = jugadores;
    cargarMasJugadores();

    document.getElementById("filtro-color").addEventListener("change", aplicarBusquedaYFiltros);
    document.getElementById("search").addEventListener("input", aplicarBusquedaYFiltros);
    document.getElementById("filtro-nacionalidad").addEventListener("change", aplicarBusquedaYFiltros);
    document.getElementById("filtro-posicion").addEventListener("change", aplicarBusquedaYFiltros);

    window.addEventListener("scroll", () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
            enBusqueda ? cargarMasResultadosBusqueda() : cargarMasJugadores();
        }
    });
}

function aplicarBusquedaYFiltros() {
    const texto = document.getElementById("search").value.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const nacionalidad = document.getElementById("filtro-nacionalidad").value;
    const posicion = document.getElementById("filtro-posicion").value;
    const color = document.getElementById("filtro-color").value;

    jugadoresFiltrados = jugadores.filter(jugador => {
        const nombreCompleto = `${jugador.nombre} ${jugador.apellido}`.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const nombre = jugador.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const apellido = jugador.apellido.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const apodo = jugador.apodo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");

        const coincideTexto = texto === "" || nombreCompleto.includes(texto) || nombre.includes(texto) || apellido.includes(texto) || apodo.includes(texto);
        const coincideNacionalidad = !nacionalidad || jugador.nacionalidad === nacionalidad;
        const coincidePosicion = !posicion || jugador.posicion === posicion;
        let coincideColor = true;
        if (color === "azul") coincideColor = jugadoresAzules.includes(jugador.id);
        else if (color === "morado") coincideColor = jugadoresMorados.includes(jugador.id);
        else if (color === "negro") coincideColor = jugadoresNegros.includes(jugador.id);

        return coincideTexto && coincideNacionalidad && coincidePosicion && coincideColor;
    });

    pagina = 0;
    paginaBusqueda = 0;
    enBusqueda = texto !== "";
    document.getElementById("jugadores-container").innerHTML = "";
    enBusqueda ? cargarMasResultadosBusqueda() : cargarMasJugadores();
}

function cargarMasJugadores() {
    if (enBusqueda) return;
    const inicio = pagina * jugadoresPorPagina;
    const fin = inicio + jugadoresPorPagina;
    const jugadoresMostrar = jugadoresFiltrados.slice(inicio, fin);
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
        paginaBusqueda++;
        mostrarJugadores(jugadoresMostrar);
    }
}

function mostrarJugadores(jugadoresMostrar) {
    const contenedor = document.getElementById("jugadores-container");
    jugadoresMostrar.forEach(jugador => {
        const card = document.createElement("div");
        card.className = "player-card";
        const rutaImagen = `fotos/${jugador.id}.webp`;
        const imagenPorDefecto = "fotos/player.webp";
        const mediaValue = ["ED", "EI", "DC", "SD", "PO", "MCO", "MCD", "MC", "MI", "MD", "DFC", "LI", "LD"].includes(jugador.posicion) ? calcularMedia(jugador) : "??";

        let cardGradient, mediaColor, borderColor;
        if (mediaValue === "??") {
            cardGradient = "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)";
            mediaColor = "#95a5a6";
            borderColor = "#7f8c8d";
        } else if (jugadoresAzules.includes(jugador.id)) {
            cardGradient = "linear-gradient(135deg, rgb(0, 37, 160) 0%, rgb(0, 37, 160) 50%, rgb(0, 37, 160) 100%)";
            mediaColor = "#f5f5dc";
            borderColor = "#dcd6f7";
        } else if (jugadoresMorados.includes(jugador.id)) {
            cardGradient = "linear-gradient(135deg, #4b0082 0%, #6a0dad 50%, #8a2be2 100%)";
            mediaColor = "#ffffff";
            borderColor = "#dcd6f7";
        } else if (jugadoresNegros.includes(jugador.id)) {
            cardGradient = "linear-gradient(135deg, #000000 0%, #1c1c1c 50%, #333333 100%)";
            mediaColor = "#e0e0e0";
            borderColor = "#555555";
        } else {
            const mediaNum = mediaValue;
            if (mediaNum >= 80 && mediaNum <= 90) {
                cardGradient = "linear-gradient(135deg, #b8860b 0%, #b8860b 50%, #b8860b 100%)";
                mediaColor = "#fff8dc";
                borderColor = "#dcd6f7";
            } else if (mediaNum >= 70 && mediaNum <= 79) {
                cardGradient = "linear-gradient(135deg, #3282b8 0%, #3282b8 50%, #3282b8 100%)";
                mediaColor = "#d0f0f9";
                borderColor = "#dcd6f7";
            } else {
                cardGradient = "linear-gradient(135deg, #5c4033 0%, #4b3621 50%, #3e2c1c 100%)";
                mediaColor = "#f5f5dc";
                borderColor = "#dcd6f7";
            }
        }

        const colorPosicion = ["ED", "EI", "DC", "SD"].includes(jugador.posicion) ? "#e74c3c" :
                              ["MC", "MCD", "MD", "MI", "MCO"].includes(jugador.posicion) ? "#f39c12" :
                              ["DFC", "LI", "LD"].includes(jugador.posicion) ? "#2ecc71" :
                              ["PO"].includes(jugador.posicion) ? "#9b59b6" : "#95a5a6";

        card.innerHTML = `
            <div style="background: ${cardGradient}; border: 3px solid ${borderColor};" class="relative">
                <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/70 to-transparent"></div>
                <div class="p-5 text-center bg-gradient-to-b from-white/15 to-transparent">
                    <div class="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-${borderColor} shadow-2xl">
                        <img class="w-full h-full object-cover bg-gray-800" src="${rutaImagen}" onerror="this.src='${imagenPorDefecto}';" alt="Jugador">
                    </div>
                    <div class="absolute top-4 right-4 w-16 h-16 bg-black/60 border-2 border-${mediaColor} rounded-full flex items-center justify-center backdrop-blur-lg shadow-xl">
                        <span class="text-${mediaColor} font-extrabold text-2xl">${mediaValue}</span>
                    </div>
                    <h3 class="text-white text-2xl font-bold mb-2 tracking-tight">${jugador.nombre} ${jugador.apellido}</h3>
                    <div class="flex justify-center gap-3 flex-wrap mb-4">
                        <span class="bg-white/30 text-white px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md border border-white/50 shadow-md">${jugador.nacionalidad}</span>
                        <span style="background: ${colorPosicion};" class="text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">${jugador.posicion}</span>
                    </div>
                </div>
                <div class="p-5 bg-black/90 backdrop-blur-lg">
                    ${jugador.posicion === "PO" ? `
                        <div class="grid grid-cols-4 gap-4 mb-4">
                            ${crearStatCircle("VEL", jugador.velocidad)}
                            ${crearStatCircle("ACE", jugador.aceleracion)}
                            ${crearStatCircle("RPO", jugador.rpo_portero)}
                            ${crearStatCircle("POT", jugador.potencia)}
                            ${crearStatCircle("CON", jugador.con)}
                            ${crearStatCircle("PAS", jugador.pase)}
                            ${crearStatCircle("MPO", jugador.mpo_portero)}
                            ${crearStatCircle("ENT", jugador.entrada)}
                        </div>
                    ` : `
                        <div class="grid grid-cols-4 gap-4 mb-4">
                            ${crearStatCircle("VEL", jugador.velocidad)}
                            ${crearStatCircle("ACE", jugador.aceleracion)}
                            ${crearStatCircle("FON", jugador.fon)}
                            ${crearStatCircle("POT", jugador.potencia)}
                            ${crearStatCircle("CON", jugador.con)}
                            ${crearStatCircle("PAS", jugador.pase)}
                            ${crearStatCircle("DIS", jugador.disparo)}
                            ${crearStatCircle("ENT", jugador.entrada)}
                        </div>
                    `}
                    <div class="flex justify-between items-center p-4 bg-black/50 rounded-xl backdrop-blur-md border border-white/20">
                        <div class="text-center">
                            <div class="text-white/80 text-xs font-medium mb-1">ALTURA</div>
                            <div class="text-white text-base font-bold">${jugador.estatura}cm</div>
                        </div>
                        <div class="w-px h-10 bg-white/30"></div>
                        <div class="text-center">
                            <div class="text-white/80 text-xs font-medium mb-1">PIE</div>
                            <div class="text-white text-base font-bold">${jugador.pie}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

function crearStatCircle(label, valor) {
    const colorTexto = obtenerColorTexto(valor);
    const valorMostrado = Math.round(valor / 10); // Scale 0-1000 to 0-100
    const circumference = 2 * Math.PI * 27; // Radius = 27px for 60x60 SVG
    const strokeDasharray = `${(valorMostrado / 100) * circumference} ${circumference}`;
    const strokeColor = {
        'red-600': '#dc2626',
        'red-500': '#ef4444',
        'orange-500': '#f97316',
        'yellow-400': '#facc15',
        'green-500': '#22c55e',
        'cyan-400': '#22d3ee',
        'white': '#ffffff'
    }[colorTexto];
    return `
        <div class="stat-circle-container">
            <svg width="60" height="60" viewBox="0 0 60 60">
                <circle class="stat-circle-bg" cx="30" cy="30" r="27"/>
                <circle class="stat-circle-progress" cx="30" cy="30" r="27" stroke="${strokeColor}" stroke-dasharray="${strokeDasharray}"/>
                <text class="stat-circle-text text-${colorTexto}" x="30" y="30" text-anchor="middle" dy=".3em">${valorMostrado}</text>
            </svg>
            <div class="stat-circle-label">${label}</div>
        </div>
    `;
}

function calcularMedia(jugador) {
    if (!jugador.posicion) return "??";
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
        const pesosPOR = { ace: 10, vel: 5, fon: 5, pot: 5, ent: 5, con: 5, dis: 5, pas: 10, mpo: 450, rpo: 490 };
        const sumaPesosPOR = 990;
        media = 40 + (
            (aceleracion * pesosPOR.ace) + (velocidad * pesosPOR.vel) + (fondo * pesosPOR.fon) +
            (potencia * pesosPOR.pot) + (entrada * pesosPOR.ent) + (control * pesosPOR.con) +
            (disparo * pesosPOR.dis) + (pase * pesosPOR.pas) + (mpo * pesosPOR.mpo) + (rpo * pesosPOR.rpo)
        ) / sumaPesosPOR;
    } else {
        const pesos = { ace: 125, vel: 155, fon: 50, pot: 150, ent: 100, con: 210, dis: 102, pas: 100 };
        const sumaPesos = 990;
        media = 40 + (
            (aceleracion * pesos.ace) + (velocidad * pesos.vel) + (fondo * pesos.fon) +
            (potencia * pesos.pot) + (entrada * pesos.ent) + (control * pesos.con) +
            (disparo * pesos.dis) + (pase * pesos.pas)
        ) / sumaPesos;
    }
    return Math.round(Number(String(Math.round(media)).slice(0, -1)));
}

function obtenerColorTexto(valor) {
    if (valor >= 0 && valor <= 499) return "red-600";
    if (valor >= 500 && valor <= 599) return "red-500";
    if (valor >= 600 && valor <= 699) return "orange-500";
    if (valor >= 700 && valor <= 799) return "yellow-400";
    if (valor >= 800 && valor <= 899) return "green-500";
    if (valor >= 900 && valor <= 1000) return "cyan-400";
    return "white";
}