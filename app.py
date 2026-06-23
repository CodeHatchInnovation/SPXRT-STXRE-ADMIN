import os
import json
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)

# ==========================================
# CONFIGURACIÓN DE SEGURIDAD (CORS)
# ==========================================
# Se abre CORS de forma explícita para evitar bloqueos del navegador en producción
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ==========================================
# CONFIGURACIÓN DE FIREBASE BLINDADA
# ==========================================
firebase_config_raw = os.environ.get('FIREBASE_CONFIG_JSON')

if firebase_config_raw:
    try:
        # 1. Intentar decodificar asumiendo que es la cadena Base64 limpia larga
        try:
            decoded_bytes = base64.b64decode(firebase_config_raw.strip())
            firebase_config = json.loads(decoded_bytes.decode('utf-8'))
            print("🚀 Firebase: Cargado exitosamente usando decodificación Base64.")
        except Exception:
            # 2. Si falla Base64, procesarlo como JSON plano (por si quitas el base64 después)
            firebase_config = json.loads(firebase_config_raw)
            if 'private_key' in firebase_config:
                firebase_config['private_key'] = firebase_config['private_key'].replace('\\n', '\n')
            print("🚀 Firebase: Cargado exitosamente usando JSON plano.")

        # Inicializar el SDK de Firebase
        cred = credentials.Certificate(firebase_config)
        firebase_admin.initialize_app(cred)
        print("🔥 Firebase inicializado con éxito y listo para operar.")
        
    except Exception as e:
        print(f"❌ CRÍTICO: Error al procesar la configuración de Firebase: {e}")
else:
    print("❌ CRÍTICO: No se encontró la variable de entorno FIREBASE_CONFIG_JSON")

# Inicializar cliente Firestore envolviéndolo de forma segura
try:
    db = firestore.client()
except Exception as e:
    print(f"❌ No se pudo conectar el cliente de Firestore: {e}")
    db = None

# ==========================================
# ENDPOINTS DE LA API (CRUD)
# ==========================================

@app.route('/api/productos', methods=['GET'])
def obtener_productos():
    try:
        if not db:
            return jsonify({"error": "La base de datos no está disponible. Revisa la configuración de Firebase."}), 503
            
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
        if not db:
            return jsonify({"error": "La base de datos no está disponible."}), 503
            
        doc_ref = db.collection('productos').document(id)
        doc_ref.delete()
        return jsonify({"message": "Producto eliminado definitivamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# CONFIGURACIÓN DE PUERTO PARA PRODUCCIÓN
# ==========================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
