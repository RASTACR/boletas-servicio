const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const boletaRouter = require("./routes/boleta");

const app = express();

// Cargar variables del archivo .env
const envPath = path.join(__dirname, ".env");
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
    console.warn("⚠️ No se encontró el archivo .env");
} else {
    console.log("✅ El archivo .env sí existe");
}

// Mostrar la ruta actual
console.log("📁 Directorio actual:", __dirname);

// Verificar si existe el archivo index.html
const indexPath = path.join(__dirname, "../frontend/index.html");
console.log("🧪 Verificando index.html en:", indexPath);

// Middleware para analizar datos del formulario
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Exposición del endpoint para clientes

const clientesRouter = require("./routes/clientes");
app.use("/api/clientes", clientesRouter);

// Servir archivos estáticos desde la carpeta frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Usar el enrutador de boletas
app.use("/api/boleta", boletaRouter);

// Iniciar el servidor en el puerto 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});