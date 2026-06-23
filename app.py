import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app)  # Permite que JavaScript se comunique con Flask sin bloqueos

# ==========================================
# CONFIGURACIÓN DE FIREBASE (HÍBRIDA)
# ==========================================
# Intenta leer primero la llave desde las variables de entorno de Render (Producción)
# Si no existe, lee tu archivo local (Desarrollo)
firebase_key_env = os.environ.get('FIREBASE_CONFIG_JSON')

if firebase_key_env:
    try:
        cred_dict = json.loads(firebase_key_env)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("🔥 Firebase inicializado con éxito usando Variables de Entorno en Render.")
    except Exception as e:
        print(f"❌ Error al cargar la variable de entorno de Firebase: {e}")
else:
    # Tu configuración original local
    try:
        cred = credentials.Certificate("firebase-adminsdk.json")
        firebase_admin.initialize_app(cred)
        print("💻 Firebase inicializado localmente usando archivo .json.")
    except Exception as e:
        print(f"❌ Error al cargar el archivo JSON local: {e}")

db = firestore.client()

# ==========================================
# ENDPOINTS DE LA API (CRUD)
# ==========================================

@app.route('/api/productos', methods=['GET'])
def obtener_productos():
    try:
        productos_ref = db.collection('productos')
        docs = productos_ref.stream()
        lista_productos = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            lista_productos.append(data)
        return jsonify(lista_productos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos', methods=['POST'])
def agregar_producto():
    try:
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
        data = request.json
        doc_ref = db.collection('productos').document(id)
        prod_doc = doc_ref.get()
        
        if not prod_doc.exists:
            return jsonify({"error": "Producto no encontrado"}), 404
            
        prod_original = prod_doc.to_dict()
        tallas_actualizadas = data.get('tallas', [])
        
        # REGLA ESTRICTA DE EDICIÓN:
        # Se ignora cualquier intento de alterar nombre o costo. Mantenemos la compra original.
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
        doc_ref = db.collection('productos').document(id)
        doc_ref.delete()
        return jsonify({"message": "Producto eliminado definitivamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# CONFIGURACIÓN DE PUERTO PARA PRODUCCIÓN
# ==========================================
if __name__ == '__main__':
    # Render asigna dinámicamente un puerto en la variable de entorno 'PORT'
    port = int(os.environ.get('PORT', 5000))
    # Escucha en '0.0.0.0' para permitir conexiones externas en internet
    app.run(host='0.0.0.0', port=port)
