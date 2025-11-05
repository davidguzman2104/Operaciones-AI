(() => {
  const form = document.getElementById("form-operacion");
  const respuestaEl = document.getElementById("respuesta");
  const ipPreview = document.getElementById("ipPreview");
  const tsPreview = document.getElementById("tsPreview");
  const btnProbar = document.getElementById("btnProbar");
  const toastEl = document.getElementById("toastEstado");
  const toast = new bootstrap.Toast(toastEl, { delay: 2500 });
  const toastMsg = document.getElementById("toastMsg");

  function showToast(msg) { toastMsg.textContent = msg; toast.show(); }

  async function obtenerIPPublica() {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip || null;
    } catch { return null; }
  }

  function nowISO() { return new Date().toISOString(); }

  async function previewData() {
    ipPreview.value = "Detectando...";
    ipPreview.value = (await obtenerIPPublica()) || "No disponible";
    tsPreview.value = nowISO();
  }

  // --- util: validar URL del webhook ---
  function validarWebhookUrl(url) {
  if (!url) return { ok: false, msg: "https://david3028.app.n8n.cloud/webhook-test/operacion-ai" };
  if (!/^https?:\/\//i.test(url)) return { ok: false, msg: "La URL debe iniciar con https://." };
  // ✅ Permitir test y prod
  if (!url.includes("/webhook-test/") && !url.includes("/webhook/"))
    return { ok: false, msg: "Usa la URL de test o la de producción." };
  return { ok: true };
}

  // --- util: POST con timeout y parse seguro ---
  async function postJSON(url, payload, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    }).finally(() => clearTimeout(t));

    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: resp.ok, status: resp.status, data };
  }

  // Validación Bootstrap
  (function enableValidation() {
    form.addEventListener("submit", function (event) {
      if (!form.checkValidity()) { event.preventDefault(); event.stopPropagation(); }
      form.classList.add("was-validated");
    }, false);
  })();

  // Probar webhook (sin enviar instrucción)
  btnProbar.addEventListener("click", async () => {
    const webhookUrl = document.getElementById("webhookUrl").value.trim();
    const v = validarWebhookUrl(webhookUrl);
    if (!v.ok) { showToast(v.msg); return; }

    showToast("Probar Webhook: realizando POST de prueba…");
    try {
      const res = await postJSON(webhookUrl, { ping: true, ts: nowISO() });
      respuestaEl.textContent = JSON.stringify(res, null, 2);
      showToast(`Webhook respondió (${res.status}).`);
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

  // NUEVO: leer A y B (si se llenaron)
  const aStr = document.getElementById("operandoA").value.trim();
  const bStr = document.getElementById("operandoB").value.trim();
  const aNum = aStr === "" ? undefined : Number(aStr);
  const bNum = bStr === "" ? undefined : Number(bStr);

  const v = validarWebhookUrl(webhookUrl);
  if (!v.ok) { showToast(v.msg); return; }

  showToast("Enviando datos a n8n…");
  try {
    const payload = {
      instruccion,
      ip_publica: ip,
      ts: tsPreview.value,
      // Sólo incluye A/B si son números válidos
      ...(Number.isFinite(aNum) ? { a: aNum } : {}),
      ...(Number.isFinite(bNum) ? { b: bNum } : {}),
    };

    const res = await postJSON(webhookUrl, payload);
    respuestaEl.textContent = JSON.stringify(res, null, 2);
    showToast(`Listo. Estatus ${res.status}.`);
  } catch (err) {
    respuestaEl.textContent = String(err);
    showToast("Error al llamar al Webhook.");
  }
});


  // Init
  previewData();
})();
