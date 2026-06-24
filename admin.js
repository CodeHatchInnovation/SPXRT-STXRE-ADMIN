let productosAdmin = [];
let productoSeleccionadoId = null;

// 🔥 DIRECCIONES CLAVE
const URL_PYTHON = "http://localhost:5000/api"; // Servidor local para lógica
const TODAS_LAS_TALLAS = ['25', '26', '27', '28', 'CH', 'M', 'G', 'XG', 'Unitalla'];

// ==========================================
// CONFIGURACIÓN DE EMAILJS (REAL) Y API KEY
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
                .then(() => console.log(`✅ EmailJS envió alerta para ${nombreProducto} [Talla: ${t.talla}]`))
                .catch(err => console.error("❌ Error en EmailJS:", err));
        }
    });
}

// ==========================================
// CONTROL DE LOGIN Y LOGOUT (CONECTADO A PYTHON)
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
            alert(data.error || "Usuario o contraseña incorrectos.");
        }
    } catch (error) {
        console.error("❌ Error conectando al Login de Python:", error);
        alert("No se pudo conectar con el servidor local de Python para verificar tus credenciales. ¿Prendiste el CMD?");
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
        const res = await fetch(`${URL_PYTHON}/productos`); 
        const data = await res.json();
        
        productosAdmin = data.success && data.productos ? data.productos : [];

        renderizarGridAdmin(productosAdmin);
    } catch (error) {
        console.error("❌ Error trayendo productos a través de Python:", error);
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

        const idDocumento = p.firestore_id || p.id;

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
                <button onclick="abrirModalEditar('${idDocumento}')" class="col-span-3 py-2 border border-purple-200 text-[#7c3aed] text-xs font-bold rounded-xl bg-purple-50/30 hover:bg-purple-50 transition-all">Editar</button>
                <button onclick="abrirModalEliminar('${idDocumento}')" class="py-2 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all flex items-center justify-center"><i class="ph ph-trash text-base"></i></button>
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

// Cálculo automático +20% al agregar nuevo producto
document.getElementById('add-compra').addEventListener('input', function() {
    const costo = Number(this.value || 0);
    document.getElementById('add-venta').value = (costo * 1.20).toFixed(2);
});

// 🔥 NUEVO: Cálculo automático +20% en tiempo real al EDITAR producto existente
document.getElementById('edit-compra').addEventListener('input', function() {
    const costo = Number(this.value || 0);
    document.getElementById('edit-venta').value = (costo * 1.20).toFixed(2);
});

// ==========================================
// ACCIONES: MODAL AGREGAR (FILTRO EN PYTHON)
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

    const datosCrudos = {
        nombre: document.getElementById('add-nombre').value,
        desc: document.getElementById('add-desc').value,
        img: document.getElementById('add-img').value,
        precioCompra: Number(document.getElementById('add-compra').value),
        tallas: listaTallas
    };

    try {
        const resPython = await fetch(`${URL_PYTHON}/validar-producto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosCrudos)
        });

        const respuestaPython = await resPython.json();

        if (!resPython.ok || !respuestaPython.success) {
            alert(`⚠️ Error de Validación (Python): ${respuestaPython.error}`);
            return;
        }

        const productoProcesado = respuestaPython.producto;
        const urlFirestore = `https://firestore.googleapis.com/v1/projects/spxrt-stxre/databases/(default)/documents/productos?key=${EMAILJS_PUBLIC_KEY}`;
        
        const bodyFirestore = {
            fields: {
                nombre: { stringValue: productoProcesado.nombre },
                desc: { stringValue: productoProcesado.desc },
                img: { stringValue: productoProcesado.img },
                sku: { stringValue: productoProcesado.sku },
                precioCompra: { doubleValue: productoProcesado.precioCompra },
                precioVenta: { doubleValue: productoProcesado.precioVenta },
                tallas: {
                    arrayValue: {
                        values: productoProcesado.tallas.map(t => ({
                            mapValue: {
                                fields: {
                                    talla: { stringValue: t.talla },
                                    stock: { integerValue: String(t.stock) }
                                }
                            }
                        }))
                    }
                }
            }
        };

        const resFirebase = await fetch(urlFirestore, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyFirestore)
        });

        if (resFirebase.ok) {
            verificarYEnviarEmailJS(productoProcesado.nombre, productoProcesado.tallas);
            cerrarModalAgregar();
            obtenerProductosAdmin();
        } else {
            alert("Error al intentar guardar en Firebase.");
        }
    } catch (error) {
        console.error("❌ Error en el proceso de agregado/validación:", error);
        alert("Error de comunicación. Asegúrate de tener Python encendido.");
    }
};

// ==========================================
// ACCIONES: MODAL EDITAR (CON PRECIO DINÁMICO)
// ==========================================
window.abrirModalEditar = (id) => {
    const prod = productosAdmin.find(p => (p.firestore_id === id || p.id === id));
    if (!prod) return;

    const idDocumento = prod.firestore_id || prod.id;
    document.getElementById('edit-id').value = idDocumento;
    
    const inputNombre = document.getElementById('edit-nombre');
    inputNombre.value = prod.nombre;
    inputNombre.disabled = true; 
    inputNombre.className = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 cursor-not-allowed text-gray-400 font-medium select-none";

    // 🔓 CORREGIDO: Ahora el precio de compra SÍ se puede editar libremente
    const inputCompra = document.getElementById('edit-compra');
    inputCompra.value = prod.precioCompra || 0;
    inputCompra.disabled = false;
    inputCompra.className = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-purple-500 font-medium text-gray-800";

    // 🔒 El precio de venta permanece bloqueado, calculándose dinámicamente
    const inputVenta = document.getElementById('edit-venta');
    inputVenta.value = (Number(prod.precioCompra || 0) * 1.20).toFixed(2);
    inputVenta.disabled = true;
    inputVenta.className = "w-full px-4 py-2.5 border border-purple-200 rounded-xl text-sm bg-purple-50/60 cursor-not-allowed font-bold text-[#7c3aed] select-none";

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
    const prodOriginal = productosAdmin.find(p => (p.firestore_id === id || p.id === id));

    const nuevaCompra = float(document.getElementById('edit-compra').value || 0);
    const nuevaVenta = float(document.getElementById('edit-venta').value || 0);

    const listaTallasActualizadas = [];
    TODAS_LAS_TALLAS.forEach(t => {
        const stockInput = Number(document.getElementById(`edit-talla-${t}`).value || 0);
        listaTallasActualizadas.push({ talla: t, stock: stockInput });
    });

    try {
        // 🔥 Agregamos precioCompra y precioVenta a la máscara de actualización de Firebase para guardar los nuevos valores económicos
        const urlDoc = `https://firestore.googleapis.com/v1/projects/e-commerce-2ff74/databases/(default)/documents/productos/${id}?updateMask.fieldPaths=tallas&updateMask.fieldPaths=precioCompra&updateMask.fieldPaths=precioVenta&key=${EMAILJS_PUBLIC_KEY}`;
        
        const bodyFirestore = {
            fields: {
                precioCompra: { doubleValue: nuevaCompra },
                precioVenta: { doubleValue: nuevaVenta },
                tallas: {
                    arrayValue: {
                        values: listaTallasActualizadas.map(t => ({
                            mapValue: {
                                fields: {
                                    talla: { stringValue: t.talla },
                                    stock: { integerValue: String(t.stock) }
                                }
                            }
                        }))
                    }
                }
            }
        };

        const res = await fetch(urlDoc, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyFirestore)
        });

        if (res.ok) {
            verificarYEnviarEmailJS(prodOriginal.nombre, listaTallasActualizadas);
            cerrarModalEditar();
            obtenerProductosAdmin();
        }
    } catch (error) {
        console.error("Error al actualizar producto:", error);
    }
};

// ==========================================
// ACCIONES: MODAL ELIMINAR
// ==========================================
window.abrirModalEliminar = (id) => {
    const prod = productosAdmin.find(p => (p.firestore_id === id || p.id === id));
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
    try {
        const urlDoc = `https://firestore.googleapis.com/v1/projects/e-commerce-2ff74/databases/(default)/documents/productos/${productoSeleccionadoId}?key=${EMAILJS_PUBLIC_KEY}`;
        const res = await fetch(urlDoc, { method: 'DELETE' });
        if (res.ok) {
            cerrarModalEliminar();
            obtenerProductosAdmin();
        }
    } catch (error) {
        console.error("Error al eliminar producto:", error);
    }
};
