import { 
    firestoreDB, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc 
} from "./firebase.js";

let productosAdmin = [];
let productoSeleccionadoId = null;

// ==========================================
// CONTROL DE AUTENTICACIÓN (LOGIN)
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
// CONSULTAR COLECCIÓN EN FIRESTORE
// ==========================================
async function obtenerProductosAdmin() {
    try {
        const querySnapshot = await getDocs(collection(firestoreDB, "productos"));
        productosAdmin = [];
        querySnapshot.forEach((docSnap) => {
            productosAdmin.push({
                ...docSnap.data(),
                id: docSnap.id
            });
        });
        renderizarGridAdmin(productosAdmin);
    } catch (error) {
        console.error("Error al obtener inventario:", error);
    }
}

// ==========================================
// INYECCIÓN VISUAL DE LAS TARJETAS (GRID)
// ==========================================
function renderizarGridAdmin(lista) {
    const grid = document.getElementById('grid-inventario');
    grid.innerHTML = "";

    lista.forEach(p => {
        const stockTotal = p.tallas ? p.tallas.reduce((acc, t) => acc + Number(t.stock), 0) : 0;
        
        const card = document.createElement('div');
        card.className = "product-card bg-white border border-gray-100 rounded-2xl p-5 flex flex-col relative group shadow-sm";
        card.innerHTML = `
            <div class="w-full h-40 flex items-center justify-center bg-gray-50/60 rounded-xl mb-4 overflow-hidden">
                <img src="${p.img}" class="h-32 object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105">
            </div>
            <h5 class="font-bold text-sm text-gray-900 truncate mb-3">${p.nombre}</h5>
            
            <div class="space-y-1.5 text-xs text-gray-500 mb-5">
                <div class="flex justify-between"><span>Compra:</span><span class="font-semibold text-gray-700">$${Number(p.precioCompra || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div class="flex justify-between"><span>Venta:</span><span class="font-bold text-[#7c3aed]">$${Number(p.precioVenta || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div class="flex justify-between border-t border-gray-50 pt-1 mt-1"><span>Stock:</span><span class="font-medium text-gray-800">${stockTotal} pzas</span></div>
            </div>

            <div class="mt-auto pt-2 grid grid-cols-4 gap-2">
                <button onclick="abrirModalEditar('${p.id}')" class="col-span-3 py-2 border border-purple-200 text-[#7c3aed] text-xs font-bold rounded-xl bg-purple-50/30 hover:bg-purple-50 transition-all">Editar</button>
                <button onclick="abrirModalEliminar('${p.id}')" class="py-2 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all flex items-center justify-center"><i class="ph ph-trash text-base"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// FILTRADO / BUSCADOR EN VIVO
// ==========================================
document.getElementById('admin-search').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const filtrados = productosAdmin.filter(p => p.nombre.toLowerCase().includes(query));
    renderizarGridAdmin(filtrados);
});

// ==========================================
// ACCIONES MODAL: AGREGAR PRODUCTO
// ==========================================
window.abrirModalAgregar = () => document.getElementById('modal-agregar').classList.remove('hidden');
window.cerrarModalAgregar = () => {
    document.getElementById('modal-agregar').classList.add('hidden');
    document.getElementById('form-agregar').reset();
};

document.getElementById('form-agregar').onsubmit = async (e) => {
    e.preventDefault();
    const nuevo = {
        nombre: document.getElementById('add-nombre').value,
        desc: document.getElementById('add-desc').value,
        img: document.getElementById('add-img').value,
        precioCompra: Number(document.getElementById('add-compra').value),
        precioVenta: Number(document.getElementById('add-venta').value),
        sku: "SPX-" + Math.floor(1000 + Math.random() * 9000),
        tallas: [
            { talla: "25", stock: Number(document.getElementById('add-talla-25').value) },
            { talla: "26", stock: Number(document.getElementById('add-talla-26').value) },
            { talla: "27", stock: Number(document.getElementById('add-talla-27').value) },
            { talla: "28", stock: Number(document.getElementById('add-talla-28').value) }
        ]
    };

    try {
        await addDoc(collection(firestoreDB, "productos"), nuevo);
        cerrarModalAgregar();
        obtenerProductosAdmin();
    } catch (err) {
        console.error("Error al añadir producto:", err);
    }
};

// ==========================================
// ACCIONES MODAL: EDITAR PRODUCTO
// ==========================================
window.abrirModalEditar = (id) => {
    const prod = productosAdmin.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('edit-id').value = prod.id;
    document.getElementById('edit-nombre').value = prod.nombre;
    document.getElementById('edit-compra').value = prod.precioCompra || 0;
    document.getElementById('edit-venta').value = prod.precioVenta || 0;

    ['25', '26', '27', '28'].forEach(t => {
        const objTalla = prod.tallas ? prod.tallas.find(x => x.talla == t) : null;
        document.getElementById(`edit-talla-${t}`).value = objTalla ? objTalla.stock : 0;
    });

    document.getElementById('modal-editar').classList.remove('hidden');
};

window.cerrarModalEditar = () => document.getElementById('modal-editar').classList.add('hidden');

document.getElementById('form-editar').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const docRef = doc(firestoreDB, "productos", id);

    const actualizacion = {
        nombre: document.getElementById('edit-nombre').value,
        precioCompra: Number(document.getElementById('edit-compra').value),
        precioVenta: Number(document.getElementById('edit-venta').value),
        tallas: [
            { talla: "25", stock: Number(document.getElementById('edit-talla-25').value) },
            { talla: "26", stock: Number(document.getElementById('edit-talla-26').value) },
            { talla: "27", stock: Number(document.getElementById('edit-talla-27').value) },
            { talla: "28", stock: Number(document.getElementById('edit-talla-28').value) }
        ]
    };

    try {
        await updateDoc(docRef, actualizacion);
        cerrarModalEditar();
        obtenerProductosAdmin();
    } catch (err) {
        console.error("Error al actualizar producto:", err);
    }
};

// ==========================================
// ACCIONES MODAL: ELIMINAR PRODUCTO
// ==========================================
window.abrirModalEliminar = (id) => {
    const prod = productosAdmin.find(p => p.id === id);
    if (!prod) return;

    productoSeleccionadoId = id;
    document.getElementById('del-img').src = prod.img;
    document.getElementById('del-nombre').innerText = prod.nombre;
    document.getElementById('del-sku').innerText = prod.sku || 'SKU-GENÉRICO';
    document.getElementById('modal-eliminar').classList.remove('hidden');
};

window.cerrarModalEliminar = () => document.getElementById('modal-eliminar').classList.add('hidden');

document.getElementById('btn-confirmar-eliminar').onclick = async () => {
    if (!productoSeleccionadoId) return;
    try {
        await deleteDoc(doc(firestoreDB, "productos", productoSeleccionadoId));
        cerrarModalEliminar();
        obtenerProductosAdmin();
    } catch (err) {
        console.error("Error al eliminar producto:", err);
    }
};
