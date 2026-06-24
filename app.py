from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
# Permitimos CORS para que tu GitHub Pages pueda consultar este servidor local sin trabas
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Cuentas de Administrador Autorizadas
USUARIOS_ADMIN = {
    "admin": "spxrt123"
}

@app.route('/api/login', methods=['POST'])
def login_admin():
    try:
        data = request.json or {}
        username = data.get('user')
        password = data.get('pass')

        if not username or not password:
            return jsonify({"success": False, "error": "Campos incompletos."}), 400

        if username in USUARIOS_ADMIN and USUARIOS_ADMIN[username] == password:
            return jsonify({"success": True, "message": "Autenticación exitosa."}), 200
        else:
            return jsonify({"success": False, "error": "Credenciales inválidas."}), 401
            
    except Exception as e:
        return jsonify({"success": False, "error": f"Fallo en servidor: {str(e)}"}), 500


@app.route('/api/validar-producto', methods=['POST'])
def validar_producto():
    try:
        data = request.json or {}
        nombre = data.get('nombre', '').strip()
        desc = data.get('desc', '').strip()
        img = data.get('img', '').strip()
        precio_compra = float(data.get('precioCompra', 0))
        tallas = data.get('tallas', [])

        if not nombre or not img or precio_compra <= 0:
            return jsonify({"success": False, "error": "Nombre, imagen y precio de compra son requeridos."}), 400

        # Lógica de Negocio: Cálculo automático del 20% de ganancia
        precio_venta = round(precio_compra * 1.20, 2)
        
        # Generación de SKU simplificado para la tienda
        sku_generado = f"SPX-{nombre[:3].upper()}-{int(precio_compra)}"

        producto_procesado = {
            "nombre": nombre,
            "desc": desc,
            "img": img,
            "sku": sku_generado,
            "precioCompra": precio_compra,
            "precioVenta": precio_venta,
            "tallas": tallas
        }

        return jsonify({"success": True, "producto": producto_procesado}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# 🔥 RUTA CORREGIDA CON TU ID DE PROYECTO REAL (e-commerce-2ff74)
@app.route('/api/productos', methods=['GET'])
def obtener_productos_contingencia():
    try:
        # Apuntamos directamente a tu ID de proyecto real para traer los Nike Total 90 y los demás documentos
        url = "https://firestore.googleapis.com/v1/projects/e-commerce-2ff74/databases/(default)/documents/productos?alt=json"
        res = requests.get(url)
        data = res.json()
        
        productos = []
        if "documents" in data:
            for doc in data["documents"]:
                fields = doc.get("fields", {})
                id_doc = doc.get("name", "").split('/')[-1]
                
                # Desglose estructurado del array de tallas mapeado desde el JSON crudo de Google
                lista_tallas = []
                tallas_raw = fields.get("tallas", {}).get("arrayValue", {}).get("values", [])
                for t in tallas_raw:
                    map_f = t.get("mapValue", {}).get("fields", {})
                    lista_tallas.append({
                        "talla": map_f.get("talla", {}).get("stringValue", ""),
                        "stock": int(map_f.get("stock", {}).get("integerValue", 0))
                    })
                
                productos.append({
                    "firestore_id": id_doc,
                    "nombre": fields.get("nombre", {}).get("stringValue", ""),
                    "desc": fields.get("desc", {}).get("stringValue", ""),
                    "img": fields.get("img", {}).get("stringValue", ""),
                    "sku": fields.get("sku", {}).get("stringValue", ""),
                    "precioCompra": float(fields.get("precioCompra", {}).get("doubleValue", fields.get("precioCompra", {}).get("integerValue", 0))),
                    "precioVenta": float(fields.get("precioVenta", {}).get("doubleValue", fields.get("precioVenta", {}).get("integerValue", 0))),
                    "tallas": lista_tallas
                })
                
        return jsonify({"success": True, "productos": productos}), 200
    except Exception as e:
        return jsonify({"success": False, "error": f"Error de comunicación backend: {str(e)}"}), 500


if __name__ == '__main__':
    # Lanzamos el backend local en el puerto 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
