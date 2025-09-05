document.addEventListener("DOMContentLoaded", function() {
    const categoriaSelect = document.getElementById("categoria");
    const tipoTrabajoSelect = document.getElementById("tipo");
    const form = document.getElementById("boletaForm");

    const opcionesPorCategoria = {
        "Aire acondicionado": [
            "Instalación",
            "Mantenimiento preventivo",
            "Mantenimiento correctivo",
        ],
        Elevadores: [
            "Instalación",
            "Mantenimiento preventivo",
            "Mantenimiento correctivo",
        ],
        Generadores: [
            "Instalación",
            "Mantenimiento preventivo",
            "Mantenimiento correctivo",
        ],
        "Bombas de agua": [
            "Instalación",
            "Mantenimiento preventivo",
            "Mantenimiento correctivo",
        ],
        "Sistema eléctrico": [
            "Instalación",
            "Mantenimiento preventivo",
            "Mantenimiento correctivo",
        ],
        Otro: [
            "Instalación",
            "Mantenimiento preventivo",
            "Mantenimiento correctivo",
        ],
    };

    categoriaSelect.addEventListener("change", function() {
        const categoriaSeleccionada = categoriaSelect.value;
        const tipos = opcionesPorCategoria[categoriaSeleccionada] || [];

        tipoTrabajoSelect.innerHTML =
            '<option value="">Seleccione una opción</option>';
        tipos.forEach((tipo) => {
            const option = document.createElement("option");
            option.value = tipo;
            option.textContent = tipo;
            tipoTrabajoSelect.appendChild(option);
        });
    });

    // Envío del formulario con fetch
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const formData = new FormData(form);

        fetch("http://localhost:5000/api/boletas", {
                method: "POST",
                body: formData,
            })
            .then((response) => {
                if (response.ok) {
                    alert("✅ Boleta enviada correctamente");
                    form.reset();
                    tipoTrabajoSelect.innerHTML =
                        '<option value="">Seleccione una opción</option>';
                } else {
                    alert("❌ Error al enviar la boleta");
                }
            })
            .catch((error) => {
                console.error("Error en el envío:", error);
                alert("❌ Error en el envío de la boleta");
            });
    });
});