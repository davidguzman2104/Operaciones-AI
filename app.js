(() => {
  const form = document.getElementById("form-operacion");
  const respuestaEl = document.getElementById("respuesta");
  const ipPreview = document.getElementById("ipPreview");
  const tsPreview = document.getElementById("tsPreview");
  const btnProbar = document.getElementById("btnProbar");
  const toastEl = document.getElementById("toastEstado");
  const toast = new bootstrap.Toast(toastEl, { delay: 2500 });
  const toastMsg = document.getElementById("toastMsg");

  function showToast(msg) {
    toastMsg.textContent = msg;
    toast.show();
  }

  async function obtenerIPPublica() {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip || null;
    } catch {
      return null;
    }
  }

  function nowISO() {
    return new Date().toISOString();
  }

  async function previewData() {
    ipPreview.value = "Detectando...";
    const ip = await obtenerIPPublica();
    ipPreview.value = ip || "No disponible";
    tsPreview.value = nowISO();
  }

  // Validación Bootstrap
  (function enableValidation() {
    form.addEventListener("submit", function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add("was-validated");
    }, false);
  })();

  // Probar webhook (sin enviar instrucción)
  btnProbar.addEventListener("click", async () => {
    const webhookUrl = document.getElementById("webhookUrl").value.trim();
    if (!webhookUrl) {
      showToast("Pega primero la URL del Webhook.");
      return;
    }
    showToast("Probar Webhook: realizando POST de prueba…");
    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping: true, ts: nowISO() })
      });
      const json = await resp.json().catch(() => ({}));
      respuestaEl.textContent = JSON.stringify(json, null, 2);
      showToast(`Webhook respondió (${resp.status}).`);
    } catch (e) {
      respuestaEl.textContent = String(e);
      showToast("Error al probar el Webhook.");
    }
  });

  // Enviar instrucción
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) return;

    respuestaEl.textContent = "";
    showToast("Obteniendo IP pública…");
    const ip = await obtenerIPPublica();
    ipPreview.value = ip || "No disponible";
    tsPreview.value = nowISO();

    const instruccion = document.getElementById("instruccion").value.trim();
    const webhookUrl = document.getElementById("webhookUrl").value.trim();

    showToast("Enviando datos a n8n…");
    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruccion,
          ip_publica: ip,
          ts: tsPreview.value
        })
      });

      const json = await resp.json().catch(() => ({}));
      respuestaEl.textContent = JSON.stringify(json, null, 2);
      showToast(`Listo. Estatus ${resp.status}.`);
    } catch (err) {
      respuestaEl.textContent = String(err);
      showToast("Error al llamar al Webhook.");
    }
  });

  // Init
  previewData();
})();
