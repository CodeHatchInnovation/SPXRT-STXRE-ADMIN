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
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ==========================================
# CONFIGURACIÓN DE FIREBASE DIRECTA EN CÓDIGO
# ==========================================
# Armamos el diccionario exacto de Firebase sin leer archivos para evitar trabas de lectura
firebase_config = {
  "type": "service_account",
  "project_id": "spxrt-stxrx",
  "private_key_id": "90b1fa6f9df8d0bcfa0ff073f1d6b043ec1405b5",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDjk4YZsa8Ko0X0\nFUvRmUBtmSgw+UPtgYB2rtWep9hTR1Nw2cq8LeuKdno+W+6kxEk0p5yyVBriekbw\n2f3QEa13UAiq0LR9DEjnw6uTdjnMbWF9Gjt12dnEr2RoNgL7ygoX7fiXy5mKaaxq\nI7mYulwGPnF2lBnl4bgnvdgGNVZMY4KOBq2Zj54vbzjm4aqe7vTPSrW53b/93WXG\nmeSY+t/F+OTju5o1lIrrWys9J6M6CwhGl5Df1mrngl3VrpcquO4lsgkBwvRV36O6\nFZ5Jz8adnNXKOUMQPKcbDE3l0trVY9tckTUS+G9V+Q7Ok7yV64r2Gq88AhNwH2iL\nNmQojR4BAgMBAAECggEAH1wp44qHq3iaYCs7GnP62996GV2QDb+Fu1UWXNmWRsuS\nZP+uH0ZYqejvqX4zoYLm75mVT0GlvsXI1tHDVxPIiqN9vkQqSv0RYtak4xosls4P\n3BRsUy4lAySEOpQOzzGlOGzzj79ftiIfvzSTE8fCfJ3INuXrt7DmFpvjk99vt/DP\n5rJbUy/a1HoaUQevqi592H7IVQspQMqTjgeTc0SKaLZfi/OLsCSFGd64NMa9iEzq\nx7Fjde/MncARLv39RnySqQmdWhqAv9HXLJjdbHVziUqen+SbxXuN5whB4qTHlbTY\nXHNWEdagKuB6MDpFvvRyXqYpjHum+/4xD3hK1s1uTQKBgQD9wWirvw4kk0FLSSEJ\nEzdjQEwqdYfw8HR/E3n8vTuTbZrj+BOuqSO19jIPNvL6RQPh0m9b7g8pzE6J/Osw\n3yImYK/KeEoE2B2eA+ogmUQ6sSDRJ1DStZH3Tt41fiVij/UhtGRcjzMDc3xvcRxH\neK0MOE8Nm01xumyLTxXu06CXgwKBgQDlltYFGRclTBoBmNHuZdAdu+C6Yl5q9g6M\n0rpEz97FuBJ6+QExxcCJQrj3pCfWpqokXfwuDAUl5/XdAEYZYHwhVAK3E1r6I/eD\nTcu8IOMU5x9a0xAFQeHlNvU75eMYcftESvN8RO9Yn3wqyHZ3UZ+hYONLmvILw+U8\nJkotErK5KwKBgQC8qBJ9valyH9indFMPQC4pqB/4YTEUPHEgGQbUlIu6a/6ABmv7\nqtxV6BgHn769upnMRntsSW0UkkTB6juhNgNZrQCE8zF0sIg0doyWd9x2FkJjvWsl\nfMBssUIbWxHIWWbSDB+hgQVYR3/4CowPxvRA5YxAfXnyV7tjRwTzbnsyqQKBgH+n\nMVJeU/855A/VP4xU8bVGnDolrae9LfPgyw6toYi/ww662o4pDNeE0MFodXok6t8T\nnr6fklE0OwDpQRClE/+X7XaLfX8tdlZ8b/YnNvuNUmK2jebObeJ7fzkRpgYWggXD\nwsPqtEXLT0eedDf9m0soStjjywb9obyi8YVEKzlHAoGAFUooBHIRhXPrAVtDinAw\nDtZko1C4hX5wTbMlWU/f0MfqlG8D93HlR8KU4vfoENeMThX26KHRKfiuKfqaePAG\nqE2vGtdev/we/zsiCulVLp6W6PUNkRmcG4cTzgufpf6Q/u3IgbJLj5oVSd7dO47m\nR0bBZ93dKrDp/UV9uUUXsqg=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-m9nzf@spxrt-stxrx.iam.gserviceaccount.com",
  "client_id": "111422774395027599026",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-m9nzf%40spxrt-stxrx.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}

try:
    # Reparamos los saltos de línea en memoria
    firebase_config['private_key'] = firebase_config['private_key'].replace('\\n', '\n')
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("🔥 FIREBASE INYECTADO DIRECTAMENTE CON ÉXITO")
except Exception as e:
    print(f"❌ Error Firebase: {e}")
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
                return jsonify({"error": f"Firestore no inicializado: {str(init_err)}"}), 503
            
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
        return jsonify({"error": f"Falla en Firestore: {str(e)}"}), 500

@app.route('/api/productos', methods=['POST'])
def agregar_producto():
    try:
        if not db:
            return jsonify({"error": "La base de datos no está disponible."}), 503
            
        data = request.json
        precio_compra = float(data.get('precioCompra', 0))
        precio_venta = round(precio_compra * 1.20, 2)
        
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
