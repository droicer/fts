let db;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('droicer').addEventListener('click', () => {
        window.location.href = 'https://www.youtube.com/@Droicer';
    });

    // Agregar evento de búsqueda
    document.getElementById('search-input').addEventListener('input', (e) => {
        buscarEquipos(e.target.value);
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
        cargarEquipos();
        await reader.close();
    } catch (error) {
        console.error("Error cargando la base de datos:", error);
    }
}

function cargarEquipos() {
    const stmt = db.prepare("SELECT id, nombre FROM teams ORDER BY nombre ASC");
    const equipos = [];
    while (stmt.step()) {
        equipos.push(stmt.getAsObject());
    }
    stmt.free();
    mostrarEquipos(equipos);
}

function buscarEquipos(query) {
    if (!query.trim()) {
        cargarEquipos(); // Si la búsqueda está vacía, mostrar todos los equipos
        return;
    }

    // Normalizar el término de búsqueda en JavaScript
    const searchTerm = `%${query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "")}%`;

    const stmt = db.prepare(`
        SELECT DISTINCT t.id, t.nombre 
        FROM teams t
        LEFT JOIN Teams_players_links tpl ON t.id = tpl.id_team
        LEFT JOIN jugadoresV2 p ON tpl.id_players = p.id
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            LOWER(t.nombre), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'), ' ', ''), 'à', 'a'), 'è', 'e'), 'ì', 'i') LIKE :searchTerm
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            LOWER(p.nombre), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'), ' ', ''), 'à', 'a'), 'è', 'e'), 'ì', 'i') LIKE :searchTerm
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            LOWER(p.apellido), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'), ' ', ''), 'à', 'a'), 'è', 'e'), 'ì', 'i') LIKE :searchTerm
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            LOWER(p.apodo), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'), ' ', ''), 'à', 'a'), 'è', 'e'), 'ì', 'i') LIKE :searchTerm
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            LOWER(p.nombre || p.apellido), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'), ' ', ''), 'à', 'a'), 'è', 'e'), 'ì', 'i') LIKE :searchTerm
        ORDER BY t.nombre ASC
    `);
    stmt.bind({ ':searchTerm': searchTerm });

    const equipos = [];
    while (stmt.step()) {
        equipos.push(stmt.getAsObject());
    }
    stmt.free();
    mostrarEquipos(equipos);
}

function mostrarEquipos(equipos) {
    const contenedor = document.getElementById("teams-menu");
    contenedor.innerHTML = ''; // Clear previous content
    if (equipos.length === 0) {
        contenedor.innerHTML = '<p class="text-white text-center">No se encontraron equipos o jugadores.</p>';
        return;
    }
    equipos.forEach(equipo => {
        const teamCard = document.createElement("div");
        teamCard.className = "team-card bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-600 transition duration-200 cursor-pointer shadow-md";
        const rutaImagen = `logos/t${equipo.id}.png`;
        const imagenPorDefecto = "logos/default.png";

        teamCard.innerHTML = `
            <img class="w-16 h-16 object-contain mb-2" src="${rutaImagen}" onerror="this.src='${imagenPorDefecto}';" alt="${equipo.nombre}">
            <span class="text-white text-sm font-semibold text-center">${equipo.nombre}</span>
        `;
        teamCard.addEventListener('click', () => {
            window.location.href = `team.html?id=${equipo.id}`;
        });
        contenedor.appendChild(teamCard);
    });
}