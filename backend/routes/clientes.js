const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Ruta del archivo clientes.json
const clientesPath = path.join(__dirname, "../clientes.json");

/**
 * GET /api/clientes
 * Devuelve la lista de todos los clientes
 */
router.get("/", (req, res) => {
  // Crear archivo si no existe
  if (!fs.existsSync(clientesPath)) fs.writeFileSync(clientesPath, "[]");

  // Leer clientes
  const data = JSON.parse(fs.readFileSync(clientesPath, "utf8"));
  res.json(data);
});

/**
 * POST /api/clientes
 * Agrega un nuevo cliente si no existe
 */
router.post("/", (req, res) => {
  const { nombre, direccion, telefono, correo } = req.body;

  if (!nombre || !direccion || !telefono || !correo) {
    return res
      .status(400)
      .json({ mensaje: "Todos los campos son obligatorios" });
  }

  // Crear archivo si no existe
  if (!fs.existsSync(clientesPath)) fs.writeFileSync(clientesPath, "[]");

  const clientes = JSON.parse(fs.readFileSync(clientesPath, "utf8"));

  // Verificar si el cliente ya existe
  const existe = clientes.some(
    (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
  );

  if (!existe) {
    clientes.push({ nombre, direccion, telefono, correo });
    fs.writeFileSync(clientesPath, JSON.stringify(clientes, null, 2));
  }

  res.json({ mensaje: "Cliente registrado correctamente" });
});

module.exports = router;
