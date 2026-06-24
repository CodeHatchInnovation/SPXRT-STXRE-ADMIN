import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Permitimos la conexión desde tu GitHub Pages sin bloqueos de CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Credenciales de administrador ocultas en el Backend
ADMIN_USER = "admin"
ADMIN_PASS = "spxrt123"

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json or {}
        usuario = data.get('user')
        contrasena = data.get('pass')
        
        if usuario == ADMIN_USER and contrasena == ADMIN_PASS:
            print("🔐 Login: ¡Acceso concedido!")
            return jsonify({"success": True, "message": "Acceso concedido"}), 200
        else:
            print("❌ Login: Intento de acceso fallido.")
            return jsonify({"success": False, "error": "Usuario o contraseña incorrectos"}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/validar-producto', methods=['POST'])
def validar_producto():
    try:
        data = request.json or {}
        
        # 1. Validaciones básicas de campos obligatorios
        nombre = data.get('nombre', '').strip()
        descripcion = data.get('desc', '').strip()
        img = data.get('img', '').strip()
        precio_compra_raw = data.get('precioCompra')
        tallas = data.get('tallas', []) # Lista de diccionarios, ej: [{"talla": "26", "stock": 5}]

        if not nombre:
            return jsonify({"success": False, "error": "El nombre del producto es obligatorio."}), 400
        if not descripcion:
            return jsonify({"success": False, "error": "La descripción del producto es obligatoria."}), 400
        if not img:
            return jsonify({"success": False, "error": "La URL de la imagen es obligatoria."}), 400
            
        # 2. Validar precio de compra
        try:
            precio_compra = float(precio_compra_raw)
            if precio_compra <= 0:
                return jsonify({"success": False, "error": "El precio de compra debe ser mayor a 0."}), 400
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "El precio de compra debe ser un número válido."}), 400

        # 3. Validar que al menos una talla tenga stock mayor a 0
        tiene_stock = False
        tallas_validas = []
        
        for t in tallas:
            talla_num = str(t.get('talla', '')).strip()
            try:
                stock_num = int(t.get('stock', 0))
            except (ValueError, TypeError):
                stock_num = 0
                
            if talla_num and stock_num > 0:
                tiene_stock = True
                tallas_validas.append({"talla": talla_num, "stock": stock_num})
            elif talla_num:
                tallas_validas.append({"talla": talla_num, "stock": 0})

        if not tiene_stock:
            return jsonify({"success": False, "error": "Debes agregar al menos una talla con stock disponible mayor a 0."}), 400

        # 4. Procesamiento lógico (Regla del +20% y Generación de SKU único)
        precio_venta = round(precio_compra * 1.20, 2)
        sku_generado = "SPX-" + str(os.urandom(2).hex().upper())

        # Estructura limpia y lista para Firebase
        producto_procesado = {
            "nombre": nombre,
            "desc": descripcion,
            "img": img,
            "precioCompra": precio_compra,
            "precioVenta": precio_venta,
            "sku": sku_generado,
            "tallas": tallas_validas
        }

        print(f"✅ Producto validado con éxito y SKU generado: {sku_generado}")
        return jsonify({"success": True, "producto": producto_procesado}), 200

    except Exception as e:
        print(f"❌ Error en validación: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    print("🚀 Servidor de Validación Local SPXRT corriendo en el puerto 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
