import os
import json
import firebase_admin
from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import credentials, firestore

app = Flask(__name__)

# Permitimos que tu GitHub Pages local o en línea se conecte sin bloqueos de CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

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
        print("🔥 FIREBASE CONECTADO LOCALMENTE: Éxito total.")
    except Exception as e:
        print(f"❌ CRÍTICO: Firebase rechazó el archivo: {e}")
else:
    print(f"❌ CRÍTICO: No se encontró el archivo '{nombre_archivo_json}' en esta carpeta.")

try:
    db = firestore.client()
except Exception as e:
    print(f"❌ No se pudo conectar el cliente de Firestore: {e}")
    db = None

# ==========================================
# ENDPOINTS DE LA API (TODO EL TRABAJO PASA POR AQUÍ)
# ==========================================

@app.route('/api/productos', methods=['GET'])
def obtener_productos():
    global db
    try:
        if not db:
            db = firestore.client()
            
        productos_ref = db.collection('productos')
        docs = productos_ref.stream()
        
        lista_productos = []
        for doc in docs:
            data = doc.to_dict()
            if not data:
                continue
            data['firestore_id'] = doc.id
            lista_productos.append(data)
            
        return jsonify(lista_productos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos', methods=['POST'])
def agregar_producto():
    try:
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
        return jsonify({"message": "Creado con éxito", "producto": nuevo_producto}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<id>', methods=['PUT'])
def editar_producto(id):
    try:
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
        return jsonify({"message": "Actualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<id>', methods=['DELETE'])
def eliminar_producto(id):
    try:
        doc_ref = db.collection('productos').document(id)
        doc_ref.delete()
        return jsonify({"message": "Eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Arranca localmente en el puerto 5000 con autorecarga activa (debug=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
