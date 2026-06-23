let productosAdmin = [];
let productoSeleccionadoId = null;

const URL_API = "https://spxrt-stxre-admin.onrender.com";
const TODAS_LAS_TALLAS = ['25', '26', '27', '28', 'CH', 'M', 'G', 'XG', 'Unitalla'];

// ==========================================
// CONFIGURACIÓN DE EMAILJS (REAL)
// ==========================================
const EMAILJS_PUBLIC_KEY = "DDMzin7mNH5wWjXBE";   
const EMAILJS_SERVICE_ID = "service_jcmou3p";   
const EMAILJS_TEMPLATE_ID = "template_bod2xn7"; 

if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// Función encargada de disparar los correos reales desde el Front
function verificarYEnviarEmailJS(nombreProducto, listaTallas) {
    listaTallas.forEach(t => {
        // Regla: stock mayor a 0 pero menor a 10 piezas
        if (t.stock > 0 && t.stock < 10) {
            const templateParams = {
                product_name: nombreProducto,
                size_name: t.talla,
                stock_current: t.stock,
                to_email: "brandonurielescalonagarcia@gmail.com" 
            };

            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                .then(() => console.log(`✅ EmailJS envió alerta para ${nombreProducto} [Talla: ${t.talla}]`))
                .catch(err => console.error("❌ Error en EmailJS:", err));
        }
    });
}

// ==========================================
// CONTROL DE LOGIN Y LOGOUT
// ==========================================
document.getElementById('form-login').onsubmit = (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    if(user === "admin" && pass === "spxrt123") {
        document.getElementById('section-login').classList.add('hidden');
        document.getElementById('section-admin').classList.remove('hidden');
        obtenerProductosAdmin();
    } else {
        alert("Usuario o contraseña incorrectos.");
    }
};

window.togglePassword = () => {
    const input = document.getElementById('login-pass');
    const icon = document.getElementById('eye-icon');
    if (input.type === "password") {
        input.type = "text";
        icon.className = "ph ph-eye-slash text-lg";
    } else {
        input.type = "password";
        icon.className = "ph ph-eye text-lg";
    }
};

document.getElementById('btn-logout').onclick = () => {
    document.getElementById('section-admin').classList.add('hidden');
    document.getElementById('section-login').classList.remove('hidden');
    document.getElementById('form-login').reset();
};

// ==========================================
// OPERACIONES DE RENDERIZADO Y BUSCADOR
// ==========================================
async function obtenerProductosAdmin() {
    try {
        const res = await fetch(URL_API);
        productosAdmin = await res.json();
        renderizarGridAdmin(productosAdmin);
    } catch (error) {
        console.error("Error conectando con Python:", error);
    }
}

function renderizarGridAdmin(lista) {
    const grid = document.getElementById('grid-inventario');
    grid.innerHTML = "";

    lista.forEach(p => {
        const tallasActivas = p.tallas ? p.tallas.filter(t => Number(t.stock) > 0) : [];
        const stockTotal = tallasActivas.reduce((acc, t) => acc + Number(t.stock), 0);
        
        const badgeTallas = tallasActivas.length > 0 
            ? tallasActivas.map(t => `<span class="bg-purple-50 text-[#7c3aed] px-1.5 py-0.5 rounded text-[10px] font-bold">${t.talla}: ${t.stock}</span>`).join(' ')
            : `<span class="text-red-400 italic text-[10px] font-bold">Agotado</span>`;

        const card = document.createElement('div');
        card.className = "product-card bg-white border border-gray-100 rounded-2xl p-5 flex flex-col relative group shadow-sm";
        card.innerHTML = `
            <div class="w-full h-40 flex items-center justify-center bg-gray-50/60 rounded-xl mb-3 overflow-hidden">
                <img src="${p.img}" class="h-32 object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105">
            </div>
            <h5 class="font-bold text-sm text-gray-900 truncate mb-1">${p.nombre}</h5>
            <div class="flex flex-wrap gap-1 mb-3 max-h-12 overflow-y-auto py-1">${badgeTallas}</div>
            <div class="space-y-1.5 text-xs text-gray-500 mb-5 mt-auto">
                <div class="flex justify-between"><span>Compra:</span><span class="font-semibold text-gray-700">$${Number(p.precioCompra || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span>Venta:</span><span class="font-bold text-[#7c3aed]">$${Number(p.precioVenta || 0).toFixed(2)}</span></div>
                <div class="flex justify-between border-t border-gray-50 pt-1 mt-1"><span>Total Stock:</span><span class="font-medium text-gray-800">${stockTotal} pzas</span></div>
            </div>
            <div class="pt-2 grid grid-cols-4 gap-2">
                <button onclick="abrirModalEditar('${p.id}')" class="col-span-3 py-2 border border-purple-200 text-[#7c3aed] text-xs font-bold rounded-xl bg-purple-50/30 hover:bg-purple-50 transition-all">Editar</button>
                <button onclick="abrirModalEliminar('${p.id}')" class="py-2 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all flex items-center justify-center"><i class="ph ph-trash text-base"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.getElementById('admin-search').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const filtrados = productosAdmin.filter(p => p.nombre.toLowerCase().includes(query));
    renderizarGridAdmin(filtrados);
});

document.getElementById('add-compra').addEventListener('input', function() {
    const costo = Number(this.value || 0);
    document.getElementById('add-venta').value = (costo * 1.20).toFixed(2);
});

// ==========================================
// ACCIONES: MODAL AGREGAR
// ==========================================
window.abrirModalAgregar = () => document.getElementById('modal-agregar').classList.remove('hidden');
window.cerrarModalAgregar = () => {
    document.getElementById('modal-agregar').classList.add('hidden');
    document.getElementById('form-agregar').reset();
};

document.getElementById('form-agregar').onsubmit = async (e) => {
    e.preventDefault();
    const listaTallas = [];
    TODAS_LAS_TALLAS.forEach(t => {
        const stockInput = Number(document.getElementById(`add-talla-${t}`).value || 0);
        listaTallas.push({ talla: t, stock: stockInput });
    });

    const nuevo = {
        nombre: document.getElementById('add-nombre').value,
        desc: document.getElementById('add-desc').value,
        img: document.getElementById('add-img').value,
        precioCompra: Number(document.getElementById('add-compra').value),
        tallas: listaTallas
    };

    const res = await fetch(URL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo)
    });

    if (res.ok) {
        const dataJson = await res.json();
        // Mandamos a EmailJS a validar si el nuevo producto entra con stock bajo
        verificarYEnviarEmailJS(nuevo.nombre, listaTallas);
        cerrarModalAgregar();
        obtenerProductosAdmin();
    }
};

// ==========================================
// ACCIONES: MODAL EDITAR (CON DISEÑO BLOQUEADO)
// ==========================================
window.abrirModalEditar = (id) => {
    const prod = productosAdmin.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('edit-id').value = prod.id;
    
    // ASIGNAR INFORMACIÓN ACTUAL Y APLICAR ESTILO VISUAL DE BLOQUEO (UX)
    const inputNombre = document.getElementById('edit-nombre');
    inputNombre.value = prod.nombre;
    inputNombre.disabled = true; 
    inputNombre.className = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 cursor-not-allowed text-gray-400 font-medium select-none focus:ring-0 focus:border-gray-200";

    const inputCompra = document.getElementById('edit-compra');
    inputCompra.value = prod.precioCompra || 0;
    inputCompra.disabled = true;
    inputCompra.className = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 cursor-not-allowed text-gray-400 font-medium select-none focus:ring-0 focus:border-gray-200";

    const inputVenta = document.getElementById('edit-venta');
    inputVenta.value = (Number(prod.precioCompra || 0) * 1.20).toFixed(2);
    inputVenta.disabled = true;
    inputVenta.className = "w-full px-4 py-2.5 border border-purple-200 rounded-xl text-sm bg-purple-50/60 cursor-not-allowed font-bold text-[#7c3aed] select-none focus:ring-0 focus:border-purple-200";

    // Cargar existencias actuales en los inputs editables de las tallas
    TODAS_LAS_TALLAS.forEach(t => {
        const objTalla = prod.tallas ? prod.tallas.find(x => x.talla === t) : null;
        document.getElementById(`edit-talla-${t}`).value = objTalla ? objTalla.stock : 0;
    });

    document.getElementById('modal-editar').classList.remove('hidden');
};

window.cerrarModalEditar = () => document.getElementById('modal-editar').classList.add('hidden');

document.getElementById('form-editar').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const prodOriginal = productosAdmin.find(p => p.id === id);

    const listaTallasActualizadas = [];
    TODAS_LAS_TALLAS.forEach(t => {
        const stockInput = Number(document.getElementById(`edit-talla-${t}`).value || 0);
        listaTallasActualizadas.push({ talla: t, stock: stockInput });
    });

    const res = await fetch(`${URL_API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tallas: listaTallasActualizadas })
    });

    if (res.ok) {
        // Al quedar guardado en Python con éxito, JS detona EmailJS para evaluar si manda correo
        verificarYEnviarEmailJS(prodOriginal.nombre, listaTallasActualizadas);
        cerrarModalEditar();
        obtenerProductosAdmin();
    }
};

// ==========================================
// ACCIONES: MODAL ELIMINAR
// ==========================================
window.abrirModalEliminar = (id) => {
    const prod = productosAdmin.find(p => p.id === id);
    if (!prod) return;

    productoSeleccionadoId = id;
    document.getElementById('del-img').src = prod.img;
    document.getElementById('del-nombre').innerText = prod.nombre;
    document.getElementById('del-sku').innerText = prod.sku || 'SPX-GEN';
    document.getElementById('modal-eliminar').classList.remove('hidden');
};

window.cerrarModalEliminar = () => document.getElementById('modal-eliminar').classList.add('hidden');

document.getElementById('btn-confirmar-eliminar').onclick = async () => {
    if (!productoSeleccionadoId) return;
    const res = await fetch(`${URL_API}/${productoSeleccionadoId}`, { method: 'DELETE' });
    if (res.ok) {
        cerrarModalEliminar();
        obtenerProductosAdmin();
    }
};
