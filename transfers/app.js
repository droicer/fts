window.onload = async function () {
    const SQL = await initSqlJs({
        locateFile: file => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm"
    });

    fetch("data.db")
        .then(response => response.arrayBuffer())
        .then(data => {
            const db = new SQL.Database(new Uint8Array(data));
            iniciarCarga(db);
        })
        .catch(error => console.error("Error cargando la base de datos:", error));
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
               j.entrada, j.con, j.disparo, j.pase, j.centro, j.cabeza, 
               COALESCE(j.rpo_portero, 0) AS rpo_portero, 
               COALESCE(j.mpo_portero, 0) AS mpo_portero
        FROM jugadores j
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
        const filtro = this.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (filtro === "") {
            enBusqueda = false;
            jugadoresFiltrados = jugadores;
            pagina = 0;
            document.getElementById("jugadores-container").innerHTML = "";
            cargarMasJugadores();
        } else {
            enBusqueda = true;
            jugadoresFiltrados = jugadores.filter(jugador =>
                jugador.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(filtro) ||
                jugador.apellido.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(filtro) ||
                jugador.apodo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(filtro)
            );

            paginaBusqueda = 0;
            document.getElementById("jugadores-container").innerHTML = "";
            mostrarJugadores(jugadoresFiltrados.slice(0, 20));
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
    contenedor.innerHTML = "";
    const inicio = paginaBusqueda * 20;
    const fin = inicio + 20;
    const jugadoresMostrar = jugadoresFiltrados.slice(inicio, fin);

    if (jugadoresMostrar.length > 0) {
        mostrarJugadores(jugadoresMostrar);
        paginaBusqueda++;
    }

}

function mostrarJugadores(jugadoresMostrar) {
    const contenedor = document.getElementById("jugadores-container");

    const convertirEstadistica = (valor) => {
        return Number(String(valor).slice(0, -1)); // Convierte a string, elimina el último dígito y vuelve a número
    };
    

    jugadoresMostrar.forEach(jugador => {
        const card = document.createElement("div");
        card.className = "col-md-4";
        card.innerHTML = `
            <div class="card mb-4" 
                 style="background: linear-gradient(165deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 8px; overflow: hidden; border: none;">
                <div class="card-body p-3">
                    <!-- Encabezado -->
                    <div class="d-flex justify-content-between align-items-start mb-4">
                        <div class="position-relative">
                            <h5 class="card-title text-white mb-1" style="font-size: 1.3rem; font-weight: 600;">${jugador.nombre}</h5>
                            <h6 class="text-white-50" style="font-size: 1rem;">${jugador.apellido}</h6>
                        </div>
                        <div class="d-flex gap-2">
                            <span class="badge" style="background: linear-gradient(135deg, #2980b9, #3498db)">${jugador.nacionalidad}</span>
                            <span class="badge" style="background: linear-gradient(135deg, #27ae60, #2ecc71)">${jugador.posicion}</span>
                        </div>
                    </div>

                    <!-- Características Físicas -->
                    <div class="stats-section mb-4">
                        <h6 class="text-white-50 mb-3" style="font-size: 0.9rem;">FÍSICAS</h6>
                        <div class="row g-3">
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #e1b12c, #fbc531)">
                                        <span class="stat-value">${convertirEstadistica(jugador.velocidad)}</span>
                                        <span class="stat-label">VEL</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #e1b12c, #fbc531)">
                                        <span class="stat-value">${convertirEstadistica(jugador.aceleracion)}</span>
                                        <span class="stat-label">ACE</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #e1b12c, #fbc531)">
                                        <span class="stat-value">${convertirEstadistica(jugador.fon)}</span>
                                        <span class="stat-label">FON</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #e1b12c, #fbc531)">
                                        <span class="stat-value">${convertirEstadistica(jugador.potencia)}</span>
                                        <span class="stat-label">POT</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Habilidades Técnicas -->
                    <div class="stats-section mb-4">
                        <h6 class="text-white-50 mb-3" style="font-size: 0.9rem;">TÉCNICAS</h6>
                        <div class="row g-3">
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #44bd32, #4cd137)">
                                        <span class="stat-value">${convertirEstadistica(jugador.con)}</span>
                                        <span class="stat-label">CON</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #44bd32, #4cd137)">
                                        <span class="stat-value">${convertirEstadistica(jugador.pase)}</span>
                                        <span class="stat-label">PAS</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #44bd32, #4cd137)">
                                        <span class="stat-value">${convertirEstadistica(jugador.disparo)}</span>
                                        <span class="stat-label">DIS</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-circle-wrapper">
                                    <div class="stat-circle" style="background: linear-gradient(135deg, #44bd32, #4cd137)">
                                        <span class="stat-value">${convertirEstadistica(jugador.entrada)}</span>
                                        <span class="stat-label">ENT</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${jugador.posicion === 'PO- Portero' ? `
                        <div class="stats-section mt-4">
                            <h6 class="text-white-50 mb-3" style="font-size: 0.9rem;">PORTERO</h6>
                            <div class="row g-3">
                                <div class="col-3">
                                    <div class="stat-circle-wrapper">
                                        <div class="stat-circle" style="background: linear-gradient(135deg, #9c88ff, #8c7ae6)">
                                            <span class="stat-value">${convertirEstadistica(jugador.rpo_portero)}</span>
                                            <span class="stat-label">REF</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-3">
                                    <div class="stat-circle-wrapper">
                                        <div class="stat-circle" style="background: linear-gradient(135deg, #9c88ff, #8c7ae6)">
                                            <span class="stat-value">${convertirEstadistica(jugador.mpo_portero)}</span>
                                            <span class="stat-label">MAN</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    <!-- Info adicional -->
                    
                    <div class="d-flex align-items-center gap-3" style="color: #ffffff80;">
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

// Estilos necesarios
const styles = document.createElement('style');
styles.textContent = `
    .stat-circle-wrapper {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .stat-circle-wrapper::before {
        content: '';
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        animation: pulse 2s infinite;
    }

    .stat-circle {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        position: relative;
        z-index: 1;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    
    .stat-value {
        font-size: 0.9rem;
        font-weight: bold;
        line-height: 1;
    }
    
    .stat-label {
        font-size: 0.5rem;
        text-transform: uppercase;
        opacity: 0.9;
        margin-top: 1px;
    }

    .card {
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    
    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }

    .badge {
        padding: 0.4em 0.8em;
        font-weight: 500;
        font-size: 0.8rem;
    }

    @keyframes pulse {
        0% {
            transform: scale(0.95);
            opacity: 0.5;
        }
        50% {
            transform: scale(1.05);
            opacity: 0.3;
        }
        100% {
            transform: scale(0.95);
            opacity: 0.5;
        }
    }

    .stats-section {
        position: relative;
    }

    .stats-section::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 0;
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, 
            rgba(255,255,255,0) 0%, 
            rgba(255,255,255,0.1) 50%, 
            rgba(255,255,255,0) 100%
        );
    }
`;
document.head.appendChild(styles);