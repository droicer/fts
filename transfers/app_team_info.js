const jugadoresAzules = [25837, 25835, 25836, 25841, 25842, 25844, 25845, 25846, 25847, 25849, 25977, 26022];
const jugadoresMorados = [25982, 25983, 25984, 25985, 25986, 25987, 25988, 25989, 25990, 25991, 25992];
const jugadoresNegros = [24595, 24596, 24597, 24598, 25089, 25090, 25091, 25092, 25093, 25094, 25095, 25096, 25097, 25098, 25099, 25100];

let db;

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

        db = new SQL.Database(dbBlob);
        cargarEquipo();
        await reader.close();
    } catch (error) {
        console.error("Error cargando la base de datos:", error);
    }
}

function cargarEquipo() {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('id');
    if (!teamId) {
        document.getElementById('team-name').textContent = 'Equipo no encontrado';
        return;
    }

    const stmt = db.prepare("SELECT id, nombre FROM teams WHERE id = ?");
    stmt.bind([teamId]);
    let equipo = null;
    if (stmt.step()) {
        equipo = stmt.getAsObject();
    }
    stmt.free();

    if (!equipo) {
        document.getElementById('team-name').textContent = 'Equipo no encontrado';
        return;
    }

    const logo = document.getElementById('team-logo');
    logo.src = `logos/t${equipo.id}.png`;
    logo.onerror = () => { logo.src = 'logos/default.png'; };
    document.getElementById('team-name').textContent = equipo.nombre;

    cargarJugadoresEquipo(teamId);
}

function cargarJugadoresEquipo(teamId) {
    const stmt = db.prepare(`
        SELECT j.id, j.apellido, 
               COALESCE(n.name, 'Desconocida') AS nacionalidad, 
               COALESCE(p.name, 'Sin posición') AS posicion,
               t.dorsal,
               j.aceleracion, j.velocidad, j.fon, j.potencia, j.entrada, j.con, j.disparo, j.pase, 
               COALESCE(j.rpo_portero, 0) AS rpo_portero, 
               COALESCE(j.mpo_portero, 0) AS mpo_portero
        FROM Teams_players_links t
        JOIN jugadoresV2 j ON t.id_players = j.id
        LEFT JOIN nacionalidad n ON j.nacionalidad = n.ID
        LEFT JOIN posiciones p ON j.posicion = p.ID
        WHERE t.id_team = ?
    `);
    stmt.bind([teamId]);
    
    const jugadores = [];
    while (stmt.step()) {
        jugadores.push(stmt.getAsObject());
    }
    stmt.free();

    mostrarJugadores(jugadores);
}

function mostrarJugadores(jugadores) {
    const contenedor = document.getElementById("players-menu");
    contenedor.innerHTML = '';
    
    jugadores.forEach(jugador => {
        const playerCard = document.createElement("div");
        playerCard.className = "player-card relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 flex flex-col items-center justify-center hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 border border-slate-700/50 backdrop-blur-sm group overflow-hidden";
        
        const rutaImagen = `fotos/${jugador.id}.webp`;
        const imagenPorDefecto = "fotos/player.webp";
        const mediaValue = ["ED", "EI", "DC", "SD", "PO", "MCO", "MCD", "MC", "MI", "MD", "DFC", "LI", "LD"].includes(jugador.posicion) ? calcularMedia(jugador) : "??";

        // Definir colores mejorados para la media
        let mediaColor, borderColor, cardGlow;
        if (mediaValue === "??") {
            mediaColor = "text-gray-400";
            borderColor = "border-gray-500";
            cardGlow = "shadow-gray-500/10";
        } else if (jugadoresAzules.includes(jugador.id)) {
            mediaColor = "text-blue-300";
            borderColor = "border-blue-400";
            cardGlow = "shadow-blue-500/20";
        } else if (jugadoresMorados.includes(jugador.id)) {
            mediaColor = "text-purple-300";
            borderColor = "border-purple-400";
            cardGlow = "shadow-purple-500/20";
        } else if (jugadoresNegros.includes(jugador.id)) {
            mediaColor = "text-gray-300";
            borderColor = "border-gray-500";
            cardGlow = "shadow-gray-500/20";
        } else {
            const mediaNum = mediaValue;
            if (mediaNum >= 90) {
                mediaColor = "text-yellow-300";
                borderColor = "border-yellow-400";
                cardGlow = "shadow-yellow-500/20";
            } else if (mediaNum >= 80) {
                mediaColor = "text-green-300";
                borderColor = "border-green-400";
                cardGlow = "shadow-green-500/20";
            } else if (mediaNum >= 70) {
                mediaColor = "text-blue-300";
                borderColor = "border-blue-400";
                cardGlow = "shadow-blue-500/20";
            } else {
                mediaColor = "text-gray-300";
                borderColor = "border-gray-400";
                cardGlow = "shadow-gray-500/20";
            }
        }

        // Colores mejorados para posiciones
        const posicionConfig = {
            "ED": { color: "bg-red-500", gradient: "from-red-500 to-red-600", icon: "⚽" },
            "EI": { color: "bg-red-500", gradient: "from-red-500 to-red-600", icon: "⚽" },
            "DC": { color: "bg-red-500", gradient: "from-red-500 to-red-600", icon: "🛡️" },
            "SD": { color: "bg-red-500", gradient: "from-red-500 to-red-600", icon: "🛡️" },
            "MC": { color: "bg-orange-500", gradient: "from-orange-500 to-orange-600", icon: "⚙️" },
            "MCD": { color: "bg-orange-500", gradient: "from-orange-500 to-orange-600", icon: "⚙️" },
            "MD": { color: "bg-orange-500", gradient: "from-orange-500 to-orange-600", icon: "⚙️" },
            "MI": { color: "bg-orange-500", gradient: "from-orange-500 to-orange-600", icon: "⚙️" },
            "MCO": { color: "bg-orange-500", gradient: "from-orange-500 to-orange-600", icon: "⚙️" },
            "DFC": { color: "bg-green-500", gradient: "from-green-500 to-green-600", icon: "🎯" },
            "LI": { color: "bg-green-500", gradient: "from-green-500 to-green-600", icon: "🎯" },
            "LD": { color: "bg-green-500", gradient: "from-green-500 to-green-600", icon: "🎯" },
            "PO": { color: "bg-purple-500", gradient: "from-purple-500 to-purple-600", icon: "🧤" }
        };

        const posConfig = posicionConfig[jugador.posicion] || { color: "bg-gray-500", gradient: "from-gray-500 to-gray-600", icon: "❓" };

        playerCard.innerHTML = `
            <!-- Efecto de brillo en hover -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <!-- Media Badge (esquina superior derecha) -->
            <div class="absolute top-3 right-3 ${mediaColor === "text-yellow-300" ? "bg-gradient-to-r from-yellow-400 to-yellow-500" : 
                     mediaColor === "text-green-300" ? "bg-gradient-to-r from-green-400 to-green-500" :
                     mediaColor === "text-blue-300" ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                     mediaColor === "text-purple-300" ? "bg-gradient-to-r from-purple-400 to-purple-500" :
                     "bg-gradient-to-r from-gray-400 to-gray-500"} 
                     text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                ${mediaValue}
            </div>

            <!-- Dorsal Badge (esquina superior izquierda) -->
            <div class="absolute top-3 left-3 bg-white/10 backdrop-blur-md text-white px-2 py-1 rounded-full text-xs font-bold border border-white/20">
                #${jugador.dorsal || '?'}
            </div>

            <!-- Imagen del jugador -->
            <div class="relative mb-4 group">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent rounded-full"></div>
                <img class="w-20 h-20 rounded-full object-cover ${borderColor} border-3 shadow-xl group-hover:shadow-2xl transition-all duration-300" 
                     src="${rutaImagen}" 
                     onerror="this.src='${imagenPorDefecto}';" 
                     alt="${jugador.apellido}">
                <div class="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            <!-- Nombre del jugador -->
            <h3 class="text-white text-lg font-bold mb-3 text-center tracking-wide drop-shadow-lg">
                ${jugador.apellido}
            </h3>

            <!-- Badges de información -->
            <div class="flex justify-center gap-2 flex-wrap mb-4">
                <!-- Nacionalidad -->
                <span class="bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold border border-white/30 shadow-lg hover:bg-white/30 transition-all duration-200">
                    🌍 ${jugador.nacionalidad}
                </span>
                
                <!-- Posición -->
                <span class="bg-gradient-to-r ${posConfig.gradient} text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-1">
                    <span>${posConfig.icon}</span>
                    ${jugador.posicion}
                </span>
            </div>

            <!-- Estadísticas adicionales (opcional) -->
            <div class="w-full bg-white/5 backdrop-blur-md rounded-lg p-3 border border-white/10">
                <div class="flex justify-between items-center">
                    <div class="text-center">
                        <div class="text-white/60 text-xs font-medium mb-1">Valoración</div>
                        <div class="${mediaColor} font-bold text-sm">${mediaValue}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-white/60 text-xs font-medium mb-1">Dorsal</div>
                        <div class="text-white font-bold text-sm">${jugador.dorsal || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- Indicador de rareza/tipo -->
            ${jugadoresAzules.includes(jugador.id) ? '<div class="absolute bottom-2 left-2 w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>' : 
              jugadoresMorados.includes(jugador.id) ? '<div class="absolute bottom-2 left-2 w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse"></div>' :
              jugadoresNegros.includes(jugador.id) ? '<div class="absolute bottom-2 left-2 w-3 h-3 bg-gray-400 rounded-full shadow-lg animate-pulse"></div>' : ''}
        `;
        
        // Agregar clase de brillo según la media
        playerCard.classList.add(cardGlow);
        
        contenedor.appendChild(playerCard);
    });
}

function calcularMedia(jugador) {
    if (!jugador.posicion) return "??";
    const aceleracion = Number(jugador.aceleracion) || 0;
    const velocidad = Number(jugador.velocidad) || 0;
    const fondo = Number(jugador.fon) || 0;
    const potencia = Number(jugador.potencia) || 0;
    const entrada = Number(jugador.entrada) || 0;
    const control = Number(jugador.con) || 0;
    const disparo = Number(jugador.disparo) || 0;
    const pase = Number(jugador.pase) || 0;
    const mpo = Number(jugador.mpo_portero) || 0;
    const rpo = Number(jugador.rpo_portero) || 0;

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