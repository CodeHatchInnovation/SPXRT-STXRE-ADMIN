import os
import json
import firebase_admin
from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import credentials, firestore

# 🔥 SOLUCIÓN CRÍTICA PARA WINDOWS: Desactiva gRPC para evitar que el script se congele
os.environ["GOOGLE_CLOUD_DISABLE_GRPC"] = "True"

app = Flask(__name__)

# Permitimos que tu GitHub Pages se conecte localmente sin bloqueos de CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Variable global para la base de datos
db = None

# ==========================================
# CONFIGURACIÓN DE FIREBASE LOCAL
# ==========================================
nombre_archivo_json = 'firebase-adminsdk.json'
ruta_key = os.path.join(os.path.dirname(__file__), nombre_archivo_json)

if os.path.exists(ruta_key):
    try:
        with open(ruta_key, 'r') as f:
            firebase_config = json.load(f)
        
        if 'private_key' in firebase_config:
            firebase_config['private_key'] = firebase_config['private_key'].replace('\\n', '\n')
            
        cred = credentials.Certificate(firebase_config)
        firebase_admin.initialize_app(cred)
        print("🔥 FIREBASE CONFIGURADO: Credenciales leídas con éxito.")
        
        # Inicializamos el cliente de Firestore de forma limpia
        db = firestore.client()
        print("⚡ CLIENTE FIRESTORE ACTIVO: Conexión establecida localmente.")
    except Exception as e:
        print(f"❌ CRÍTICO: Firebase rechazó el archivo: {e}")
else:
    print(f"❌ CRÍTICO: No se encontró el archivo '{nombre_archivo_json}' en esta carpeta.")

# ==========================================
# ENDPOINTS DE LA API (CRUD COMPLETO)
# ==========================================

@app.route('/api/productos', methods=['GET'])
def obtener_productos():
    global db
    try:
        if not db:
            db = firestore.client()
            
        # .get() es drásticamente más estable en Windows local que .stream()
        productos_ref = db.collection('productos')
        docs = productos_ref.get()
        
        lista_productos = []
        for doc in docs:
            data = doc.to_dict()
            if not data:
                continue
            data['firestore_id'] = doc.id
            lista_productos.append(data)
            
        print(f"✅ ¡Se enviaron {len(lista_productos)} productos al frontend con éxito!")
        return jsonify(lista_productos), 200
    except Exception as e:
        print(f"❌ Error interno en GET /api/productos: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos', methods=['POST'])
def agregar_producto():
    global db
    try:
        if not db:
            db = firestore.client()

        data = request.json
        precio_compra = float(data.get('precioCompra', 0))
        precio_venta = round(precio_compra * 1.20, 2) # Regla del +20%
        
        nuevo_producto = {
            "nombre": data.get('nombre'),
            "desc": data.get('desc'),
            "img": data.get('img'),
            "precioCompra": precio_compra,
            "precioVenta": precio_venta,
            "sku": "SPX-" + str(os.urandom(2).hex().upper()),
            "tallas": data.get('tallas', [])
        }
        
        doc_ref = db.collection('productos').document()
        doc_ref.set(nuevo_producto)
        print(f"✨ Producto creado con éxito: {nuevo_producto['nombre']}")
        return jsonify({"message": "Creado con éxito", "producto": nuevo_producto}), 201
    except Exception as e:
        print(f"❌ Error interno en POST /api/productos: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<id>', methods=['PUT'])
def editar_producto(id):
    global db
    try:
        if not db:
            db = firestore.client()

        data = request.json
        doc_ref = db.collection('productos').document(id)
        prod_doc = doc_ref.get()
        
        if not prod_doc.exists:
            return jsonify({"error": "No encontrado"}), 404
            
        prod_original = prod_doc.to_dict()
        precio_compra_original = float(prod_original.get('precioCompra', 0))
        
        actualizacion = {
            "precioVenta": round(precio_compra_original * 1.20, 2),
            "tallas": data.get('tallas', [])
        }
        
        doc_ref.update(actualizacion)
        print(f"🔧 Producto actualizado con éxito: ID {id}")
        return jsonify({"message": "Actualizado"}), 200
    except Exception as e:
        print(f"❌ Error interno en PUT /api/productos: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<id>', methods=['DELETE'])
def eliminar_producto(id):
    global db
    try:
        if not db:
            db = firestore.client()

        doc_ref = db.collection('productos').document(id)
        doc_ref.delete()
        print(f"🗑️ Producto eliminado con éxito: ID {id}")
        return jsonify({"message": "Eliminado"}), 200
    except Exception as e:
        print(f"❌ Error interno en DELETE /api/productos: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Arranca localmente en el puerto 5000 con autorecarga activa (debug=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
