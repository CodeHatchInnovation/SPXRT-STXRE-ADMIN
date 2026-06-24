let productosAdmin = [];
let productoSeleccionadoId = null;

// 🔥 DIRECCIONES CLAVE
const URL_PYTHON = "http://localhost:5000/api"; 
const TODAS_LAS_TALLAS = ['25', '26', '27', '28', 'CH', 'M', 'G', 'XG', 'Unitalla', '3', '4', '5', '6', '7', '8'];

// ==========================================
// CONFIGURACIÓN DE EMAILJS
// ==========================================
const EMAILJS_PUBLIC_KEY = "DDMzin7mNH5wWjXBE";   
const EMAILJS_SERVICE_ID = "service_jcmou3p";   
const EMAILJS_TEMPLATE_ID = "template_bod2xn7"; 

if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

function verificarYEnviarEmailJS(nombreProducto, listaTallas) {
    listaTallas.forEach(t => {
        if (t.stock > 0 && t.stock < 10) {
            const templateParams = {
                product_name: nombreProducto,
                size_name: t.talla,
                stock_current: t.stock,
                to_email: "brandonurielescalonagarcia@gmail.com" 
            };
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                .then(() => console.log(`✅ EmailJS enviado: ${nombreProducto}`))
                .catch(err => console.error("❌ Error EmailJS:", err));
        }
    });
}

// ==========================================
// CONTROL DE LOGIN Y LOGOUT
// ==========================================
document.getElementById('form-login').onsubmit = async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const res = await fetch(`${URL_PYTHON}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, pass })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            document.getElementById('section-login').classList.add('hidden');
            document.getElementById('section-admin').classList.remove('hidden');
            obtenerProductosAdmin();
        } else {
            alert(data.error || "Credenciales incorrectas.");
        }
    } catch (error) {
        alert("Error de conexión al servidor local.");
    }
};

window.togglePassword = () => {
    const input = document.getElementById('login-pass');
    const icon = document.getElementById('eye-icon');
    input.type = input.type === "password" ? "text" : "password";
    icon.className = input.type === "password" ? "ph ph-eye text-lg" : "ph ph-eye-slash text-lg";
};

document.getElementById('btn-logout').onclick = () => {
    document.getElementById('section-admin').classList.add('hidden');
    document.getElementById('section-login').classList.remove('hidden');
};

// ==========================================
// RENDERIZADO Y BUSCADOR
// ==========================================
async function obtenerProductosAdmin() {
    try {
        const res = await fetch(`${URL_PYTHON}/productos`); 
        const data = await res.json();
        productosAdmin = data.success ? data.productos : [];
        renderizarGridAdmin(productosAdmin);
    } catch (error) { console.error("❌ Error obteniendo productos:", error); }
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
        card.className = "product-card bg-white border border-gray-100 rounded-2xl p-5 flex flex-col shadow-sm";
        card.innerHTML = `
            <div class="w-full h-40 flex items-center justify-center bg-gray-50/60 rounded-xl mb-3 overflow-hidden">
                <img src="${p.img}" class="h-32 object-contain mix-blend-multiply">
            </div>
            <h5 class="font-bold text-sm text-gray-900 truncate mb-1">${p.nombre}</h5>
            <div class="flex flex-wrap gap-1 mb-3">${badgeTallas}</div>
            <div class="space-y-1 text-xs text-gray-500 mb-5 mt-auto">
                <div>Compra: $${Number(p.precioCompra).toFixed(2)}</div>
                <div class="font-bold text-[#7c3aed]">Venta: $${Number(p.precioVenta).toFixed(2)}</div>
                <div>Stock: ${stockTotal} pzas</div>
            </div>
            <button onclick="abrirModalEditar('${p.firestore_id}')" class="w-full py-2 bg-purple-50 text-[#7c3aed] text-xs font-bold rounded-xl hover:bg-purple-100">Editar</button>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// MODAL EDITAR (BLINDADO)
// ==========================================
window.abrirModalEditar = (id) => {
    const prod = productosAdmin.find(p => p.firestore_id === id);
    if (!prod) return;

    document.getElementById('edit-id').value = prod.firestore_id;
    document.getElementById('edit-nombre').value = prod.nombre;
    document.getElementById('edit-compra').value = prod.precioCompra || 0;
    document.getElementById('edit-venta').value = (Number(prod.precioCompra || 0) * 1.20).toFixed(2);

    TODAS_LAS_TALLAS.forEach(t => {
        const objTalla = prod.tallas ? prod.tallas.find(x => x.talla === t) : null;
        const inputTalla = document.getElementById(`edit-talla-${t}`);
        // 🔥 BLINDAJE: Solo si el input existe en el HTML, asigna el valor.
        if (inputTalla) { 
            inputTalla.value = objTalla ? objTalla.stock : 0; 
        }
    });

    document.getElementById('modal-editar').classList.remove('hidden');
};

document.getElementById('form-editar').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const listaTallas = [];
    TODAS_LAS_TALLAS.forEach(t => {
        const input = document.getElementById(`edit-talla-${t}`);
        if (input) { listaTallas.push({ talla: t, stock: Number(input.value || 0) }); }
    });

    try {
        // 🔥 CAMBIO: Usamos POST en lugar de PATCH para evitar el error de CORS Preflight
        const res = await fetch(`${URL_PYTHON}/productos/${id}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                precioCompra: Number(document.getElementById('edit-compra').value),
                precioVenta: Number(document.getElementById('edit-venta').value),
                tallas: listaTallas,
                key: EMAILJS_PUBLIC_KEY
            })
        });
        if (res.ok) {
            document.getElementById('modal-editar').classList.add('hidden');
            obtenerProductosAdmin();
        } else { alert("Error al actualizar."); }
    } catch (error) { console.error("Error:", error); }
};

window.cerrarModalEditar = () => document.getElementById('modal-editar').classList.add('hidden');
document.getElementById('edit-compra').addEventListener('input', (e) => {
    document.getElementById('edit-venta').value = (Number(e.target.value) * 1.20).toFixed(2);
});
