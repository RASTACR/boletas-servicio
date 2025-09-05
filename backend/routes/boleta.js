// boleta.js - Rutas para generar boletas PDF con fotos optimizadas y enviar por correo

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const sharp = require("sharp"); // Librería para optimizar imágenes
require("dotenv").config();

const contadorPath = path.join(__dirname, "../boleta-counter.json");

// Configuración multer para subir fotos
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = path.join(__dirname, "../uploads/fotos");
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage });

// Obtener número de boleta con 6 dígitos, actualizando contador
function obtenerNumeroBoleta() {
    let numero = 1;
    try {
        if (fs.existsSync(contadorPath)) {
            const data = JSON.parse(fs.readFileSync(contadorPath, "utf-8"));
            numero = data.contador || 1;
        }
        fs.writeFileSync(
            contadorPath,
            JSON.stringify({ contador: numero + 1 }, null, 2)
        );
    } catch (err) {
        console.error("❌ Error al leer o escribir el contador:", err.message);
    }
    return String(numero).padStart(6, "0");
}

/**
 * Optimiza las fotos reduciendo su tamaño y calidad para PDF.
 * Recibe las rutas originales y devuelve las rutas de fotos optimizadas.
 * Las imágenes se redimensionan a max 1024x768 y calidad JPG 70%.
 *
 * @param {string[]} fotosOriginales - Rutas originales de las fotos subidas
 * @returns {Promise<string[]>} - Rutas de fotos optimizadas
 */
async function optimizarFotos(fotosOriginales) {
    const dirOptimizado = path.join(__dirname, "../uploads/fotos-opt");
    if (!fs.existsSync(dirOptimizado)) {
        fs.mkdirSync(dirOptimizado, { recursive: true });
    }

    const fotosOptimizadas = [];

    for (const fotoPath of fotosOriginales) {
        const nombreArchivo = `opt-${Date.now()}-${path.basename(fotoPath)}`;
        const rutaOpt = path.join(dirOptimizado, nombreArchivo);

        await sharp(fotoPath)
            .resize({ width: 1024, height: 768, fit: "inside" })
            .jpeg({ quality: 70 })
            .toFile(rutaOpt);

        fotosOptimizadas.push(rutaOpt);
    }

    return fotosOptimizadas;
}

/**
 * Crea el PDF de la boleta con los datos, fotos optimizadas,
 * guarda el PDF en /uploads y mantiene solo los 5 PDFs más recientes.
 *
 * @param {Object} datos - Datos del formulario
 * @param {string} numeroBoleta - Número de boleta
 * @param {string[]} fotosPaths - Rutas de fotos optimizadas
 * @returns {Promise<string>} - Ruta del PDF generado
 */
function crearPDF(datos, numeroBoleta, fotosPaths) {
    return new Promise((resolve, reject) => {
        const uploadsDir = path.join(__dirname, "../uploads");

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Limpiar PDFs antiguos, conservar solo los 5 más recientes
        if (fs.existsSync(uploadsDir)) {
            const files = fs
                .readdirSync(uploadsDir)
                .filter((f) => f.endsWith(".pdf"))
                .map((f) => ({
                    name: f,
                    time: fs.statSync(path.join(uploadsDir, f)).mtime.getTime(),
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length > 5) {
                const aEliminar = files.slice(5);
                aEliminar.forEach((file) =>
                    fs.unlinkSync(path.join(uploadsDir, file.name))
                );
            }
        }

        const pdfPath = path.join(uploadsDir, `boleta-${numeroBoleta}.pdf`);

        // Crear documento PDF con margen
        const doc = new PDFDocument({ margin: 50, autoFirstPage: true });

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // Insertar logo en esquina superior izquierda con bordes redondeados
        const logoPath = path.join(__dirname, "../../frontend/logo.jpeg");
        if (fs.existsSync(logoPath)) {
            // Obtener dimensiones reales de la imagen
            const image = doc.openImage(logoPath);
            const originalWidth = image.width;
            const originalHeight = image.height;
            const aspectRatio = originalWidth / originalHeight;

            // Tamaño deseado (ajustar height proporcionalmente)
            const desiredWidth = 100;
            const desiredHeight = desiredWidth / aspectRatio; // Mantiene proporción

            // Radio de borde (ajustable)
            const borderRadius = 15;

            doc.save();
            // Usar las dimensiones proporcionales para el recorte
            doc.roundedRect(50, 40, desiredWidth, desiredHeight, borderRadius).clip();
            doc.image(logoPath, 50, 40, {
                width: desiredWidth,
                height: desiredHeight,
            });
            doc.restore();
        }
        doc.y = 150;

        // Comenzar contenido debajo del logo

        // Título principal y número de boleta centrados
        doc
            .fontSize(26)
            .fillColor("#0D47A1")
            .font("Helvetica-Bold")
            .text("Boleta de Servicio", { align: "center" });

        doc
            .moveDown(0.3)
            .fontSize(20)
            .fillColor("#424242")
            .font("Helvetica")
            .text(`N° ${numeroBoleta}`, { align: "center" });

        // Línea divisoria azul claro
        doc
            .moveDown(0.5)
            .strokeColor("#90CAF9")
            .lineWidth(2)
            .moveTo(100, doc.y)
            .lineTo(doc.page.width - 100, doc.y)
            .stroke();

        doc.moveDown(1);

        // Opciones texto comunes
        const sectionOptions = { width: doc.page.width - 120, align: "left" };

        // Bloque Datos del Cliente (fondo y borde)
        doc.save();
        doc
            .roundedRect(50, doc.y, doc.page.width - 100, 160, 5)
            .fillAndStroke("#e3f2fd", "#cccccc");
        doc.restore();

        doc.moveDown(0.5);
        doc
            .fontSize(14)
            .fillColor("#1A237E")
            .font("Helvetica-Bold")
            .text("Datos del Cliente", 60, doc.y + 10, sectionOptions);

        doc.moveDown(0.5).fontSize(12).fillColor("black").font("Helvetica");

        doc.text(
            `Cliente: ${datos.nombreCliente || "N/A"}`,
            60,
            doc.y,
            sectionOptions
        );
        doc.text(
            `Dirección: ${datos.direccion || "N/A"}`,
            60,
            doc.y,
            sectionOptions
        );
        doc.text(`Teléfono: ${datos.telefono || "N/A"}`, 60, doc.y, sectionOptions);
        doc.text(
            `Correo: ${datos.correoCliente || "N/A"}`,
            60,
            doc.y,
            sectionOptions
        );
        doc.text(`Fecha: ${datos.fecha || "N/A"}`, 60, doc.y, sectionOptions);
        doc.text(
            `Categoría: ${datos.categoria || "N/A"}`,
            60,
            doc.y,
            sectionOptions
        );
        doc.text(`Tipo: ${datos.tipo || "N/A"}`, 60, doc.y, sectionOptions);

        doc.moveDown(2);

        // Bloque Checklist con fondo y borde
        const checklist = datos.checklist;
        const itemsPorFila = 2;
        const alturaItem = 15;
        const separacionFilas = 4;
        const filas = Math.ceil((checklist.length || 1) / itemsPorFila);
        const checklistHeight = 40 + filas * (alturaItem + separacionFilas);
        const checklistY = doc.y;

        doc.save();
        doc
            .roundedRect(50, checklistY, doc.page.width - 100, checklistHeight, 5)
            .fillAndStroke("#e3f2fd", "#cccccc");
        doc.restore();

        doc
            .fontSize(13)
            .fillColor("#1A237E")
            .font("Helvetica-Bold")
            .text("Checklist:", 60, checklistY + 10, sectionOptions);

        doc.fontSize(12).fillColor("black");

        if (Array.isArray(checklist) && checklist.length > 0) {
            let x = 60;
            let y = checklistY + 35;
            checklist.forEach((item, index) => {
                doc.text(`• ${item}`, x, y, { width: (sectionOptions.width - 20) / 2 });
                if ((index + 1) % itemsPorFila === 0) {
                    y += alturaItem + separacionFilas;
                    x = 60;
                } else {
                    x = doc.page.width / 2;
                }
            });
        } else {
            doc.text(
                "No se seleccionó ningún ítem del checklist.",
                60,
                checklistY + 35,
                sectionOptions
            );
        }

        doc.moveDown(2);

        // Bloque Comentarios con fondo y borde
        const comentariosY = doc.y;
        doc.save();
        doc
            .roundedRect(50, comentariosY, doc.page.width - 100, 60, 5)
            .fillAndStroke("#e3f2fd", "#cccccc");
        doc.restore();

        doc
            .fontSize(13)
            .fillColor("#1A237E")
            .text("Comentarios:", 60, comentariosY + 10, sectionOptions);

        doc
            .moveDown(1)
            .fontSize(12)
            .fillColor("black")
            .text(datos.comentarios || "Sin comentarios.", sectionOptions);

        doc.moveDown(2);

        // Bloque Encargado del servicio con fondo y borde
        const encargadoY = doc.y;
        doc.save();
        doc
            .roundedRect(50, encargadoY, doc.page.width - 100, 40, 5)
            .fillAndStroke("#e3f2fd", "#cccccc");
        doc.restore();

        doc
            .fontSize(12)
            .fillColor("black")
            .text(
                `Encargado del servicio: ${datos.encargado || "__________"}`,
                60,
                encargadoY + 10,
                sectionOptions
            );

        doc.moveDown(3);

        /**
         * Genera el pie de página centrado en la primera página del PDF.
         *
         * - Establece tamaño de fuente y color para el texto del pie.
         * - Define el texto que aparecerá en el pie de página.
         * - Obtiene el ancho y alto total de la página para calcular posición.
         * - Calcula la posición vertical (a 40 puntos del borde inferior).
         * - Calcula el ancho exacto del texto con la fuente actual.
         * - Calcula la posición horizontal para centrar el texto en la página.
         * - Dibuja el texto en las coordenadas calculadas, sin salto de línea.
         *
         * Esto garantiza que el texto quede centrado horizontalmente y ubicado
         * correctamente en la parte inferior, sin afectar otras partes del documento.
         */
        doc.fontSize(10).fillColor("gray"); // Tamaño y color de fuente para el pie
        const footerText = "©️ JYM ELECTROMECÁNICA - Todos los derechos reservados"; // Texto del pie
        const pageWidth = doc.page.width; // Ancho total de la página PDF
        const pageHeight = doc.page.height; // Alto total de la página PDF
        const footerY = pageHeight - 40; // Posición vertical a 40 pts del borde inferior

        const textWidth = doc.widthOfString(footerText); // Medición exacta del ancho del texto
        const x = (pageWidth - textWidth) / 2; // Posición horizontal para centrar el texto

        doc.text(footerText, x, footerY, { lineBreak: false }); // Imprime el pie centrado sin salto de línea

        // === Bloque fotos optimizadas ===
        if (fotosPaths && fotosPaths.length > 0) {
            const fotosPorPagina = 6; // máximo 6 fotos por página (mejor aprovechamiento)
            const fotosPorFila = 2;
            const anchoFoto = 250;
            const altoFoto = 180;
            const separacionX = 15;
            const separacionY = 15;

            // Nueva página antes de insertar fotos para no tapar contenido previo
            doc.addPage();

            for (let i = 0; i < fotosPaths.length; i++) {
                if (i > 0 && i % fotosPorPagina === 0) {
                    doc.addPage();
                }

                const indexEnPagina = i % fotosPorPagina;
                const fila = Math.floor(indexEnPagina / fotosPorFila);
                const columna = indexEnPagina % fotosPorFila;

                const x = 50 + columna * (anchoFoto + separacionX);
                const y = 50 + fila * (altoFoto + separacionY);

                if (fs.existsSync(fotosPaths[i])) {
                    doc.image(fotosPaths[i], x, y, {
                        width: anchoFoto,
                        height: altoFoto,
                    });
                }
            }
        }

        // Finalizar documento PDF
        doc.end();

        // Resolver o rechazar la promesa según resultado
        stream.on("finish", () => resolve(pdfPath));
        stream.on("error", (err) => reject(err));
    });
}

/**
 * Envía correo con PDF adjunto usando nodemailer
 *
 * @param {string} destino - Correo destinatario
 * @param {string} pdfPath - Ruta del PDF adjunto
 * @param {string} numeroBoleta - Número de boleta para el asunto
 */
async function enviarCorreo(destino, pdfPath, numeroBoleta) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, // Ej: mail.jymelectromecanica.com
        port: process.env.EMAIL_PORT || 465, // 587 (TLS) o 465 (SSL)
        secure: process.env.EMAIL_SECURE === "true", // true para 465, false para 587
        auth: {
            user: process.env.EMAIL_USER, // info@jymelectromecanica.com
            pass: process.env.EMAIL_PASS, // Contraseña de la cuenta de correo
        },
        tls: {
            rejectUnauthorized: false, // Útil para evitar problemas de certificados
        },
    });

    const mailOptions = {
        from: `JYM Electromecánica <${process.env.EMAIL_USER}>`, // Nombre + correo
        to: destino,
        bcc: process.env.EMAIL_BCC,
        subject: `Boleta de Servicio N° ${numeroBoleta} - ${new Date().toLocaleString()}`,
        text: `Adjunto encontrarás la boleta número ${numeroBoleta} generada el ${new Date().toLocaleString()}`,
        attachments: [{
            filename: `boleta-${numeroBoleta}.pdf`,
            path: pdfPath,
        }, ],
    };

    await transporter.sendMail(mailOptions);
}

// Ruta POST para recibir datos y fotos, crear PDF y enviar correo
router.post("/", upload.array("fotos", 8), async(req, res) => {
    try {
        const datos = req.body;

        // Obtener rutas originales de fotos subidas
        const fotosOriginales = req.files ? req.files.map((file) => file.path) : [];

        // Optimizar fotos para PDF (redimensionar y comprimir)
        const fotosPaths = await optimizarFotos(fotosOriginales);

        // Obtener número único de boleta
        const numeroBoleta = obtenerNumeroBoleta();

        console.log("✅ Datos recibidos:", datos);

        // Crear PDF con datos y fotos optimizadas
        const pdfPath = await crearPDF(datos, numeroBoleta, fotosPaths);
        console.log("📄 PDF generado:", pdfPath);

        // Enviar correo con PDF adjunto si correoCliente existe
        if (datos.correoCliente) {
            await enviarCorreo(datos.correoCliente, pdfPath, numeroBoleta);
            console.log("📧 Correo enviado a:", datos.correoCliente);
        }

        // --- ELIMINAR FOTOS INMEDIATAMENTE DESPUÉS DE USARLAS --- //
        const fs = require("fs");

        // Borrar fotos originales
        fotosOriginales.forEach((ruta) => {
            if (fs.existsSync(ruta)) {
                fs.unlinkSync(ruta);
            }
        });

        // Borrar fotos optimizadas
        fotosPaths.forEach((ruta) => {
            if (fs.existsSync(ruta)) {
                fs.unlinkSync(ruta);
            }
        });

        res.json({ mensaje: "✅ Boleta enviada correctamente", numeroBoleta });
    } catch (error) {
        console.error("❌ Error general:", error.message);
        res
            .status(500)
            .json({ mensaje: "❌ Error al enviar la boleta", error: error.message });
    }
});

module.exports = router;