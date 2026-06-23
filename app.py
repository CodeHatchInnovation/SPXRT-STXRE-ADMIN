import os
import json
import firebase_admin
from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import credentials, firestore

app = Flask(__name__)

# ==========================================
# CONFIGURACIÓN DE SEGURIDAD (CORS)
# ==========================================
# Se abre CORS de forma explícita para evitar bloqueos del navegador en producción
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ==========================================
# CONFIGURACIÓN DE FIREBASE (LECTURA DIRECTA FIJA)
# ==========================================
nombre_archivo_json = 'firebase-adminsdk.json'
ruta_key = os.path.join(os.path.dirname(__file__), nombre_archivo_json)

if os.path.exists(ruta_key):
    try:
        # 1. Leer el JSON base directamente desde el repositorio
        with open(ruta_key, 'r') as f:
            firebase_config = json.load(f)
        
        # 2. Reparar los saltos de línea de la llave de forma interna en memoria
        if 'private_key' in firebase_config:
            firebase_config['private_key'] = firebase_config['private_key'].replace('\\n', '\n')
            
        # 3. Inicializar el SDK usando el diccionario ya limpio
        cred = credentials.Certificate(firebase_config)
        firebase_admin.initialize_app(cred)
        print("🔥 FIREBASE CONECTADO: Archivo JSON cargado y parseado con éxito.")
    except Exception as e:
        print(f"❌ CRÍTICO: El archivo existe, pero Firebase lo rechazó: {e}")
else:
    print(f"❌ CRÍTICO: No se encontró el archivo '{nombre_archivo_json}' en la raíz.")

# Inicializar cliente Firestore envolviéndolo de forma segura
try:
    db = firestore.client()
except Exception as e:
    print(f"❌ No se pudo conectar el cliente de Firestore: {e}")
    db = None

# ==========================================
# ENDPOINTS DE LA API (CRUD)
# ==========================================

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "Backend corriendo perfectamente en Vercel", "firebase": db is not None}), 200

@app.route('/api/productos', methods=['GET'])
def obtener_productos():
    global db
    try:
        if not db:
            try:
                db = firestore.client()
            except Exception as init_err:
                return jsonify({"error": f"Firestore no inicializado. Detalle: {str(init_err)}"}), 503
            
        productos_ref = db.collection('productos')
        docs = productos_ref.stream()
        
        lista_productos = []
        for doc in docs:
            data = doc.to_dict()
            if not data:
                continue
            # Guardamos el ID del documento de Firestore de forma segura sin pisar tu id manual
            data['firestore_id'] = doc.id
            lista_productos.append(data)
            
        return jsonify(lista_productos), 200
    except Exception as e:
        return jsonify({"error": f"Falla en Firestore: {str(e)}"}), 500

@app.route('/api/productos', methods=['POST'])
def agregar_producto():
    try:
        if not db:
            return jsonify({"error": "La base de datos no está disponible."}), 503
            
        data = request.json
        precio_compra = float(data.get('precioCompra', 0))
        
        # Regla matemática calculada en Python (+20%)
        precio_venta = round(precio_compra * 1.20, 2)
        
        nuevo_producto = {
            "nombre": data.get('nombre'),
            "desc": data.get('desc'),
            "img": data.get('img'),
            "precioCompra": precio_compra,
            "precioVenta": precio_venta,
            "sku": "SPX-" + str(os.urandom(2).hex().upper()), # SKU aleatorio único
            "tallas": data.get('tallas', [])
        }
        
        doc_ref = db.collection('productos').document()
        doc_ref.set(nuevo_producto)
        return jsonify({"message": "Producto creado con éxito", "producto": nuevo_producto}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<id>', methods=['PUT'])
def editar_producto(id):
    try:
        if not db:
            return jsonify({"error": "La base de datos no está disponible."}), 503
            
        data = request.json
        doc_ref = db.collection('productos').document(id)
        prod_doc = doc_ref.get()
        
        if not prod_doc.exists:
            return jsonify({"error": "Producto no encontrado"}), 404
            
        prod_original = prod_doc.to_dict()
        tallas_actualizadas = data.get('tallas', [])
        
        # REGLA ESTRICTA DE EDICIÓN: Mantenemos la compra original.
        precio_compra_original = float(prod_original.get('precioCompra', 0))
        precio_venta_estricto = round(precio_compra_original * 1.20, 2)
        
        actualizacion = {
            "precioVenta": precio_venta_estricto,
            "tallas": tallas_actualizadas
        }
        
        doc_ref.update(actualizacion)
        return jsonify({"message": "Producto actualizado con éxito"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<id>', methods=['DELETE'])
def eliminar_producto(id):
    try:
        if not db:
            return jsonify({"error": "La base de datos no está disponible."}), 503
            
        doc_ref = db.collection('productos').document(id)
        doc_ref.delete()
        return jsonify({"message": "Producto eliminado definitivamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
