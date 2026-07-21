(() => {
  "use strict";

  const STORAGE_KEY = "dla_kalkulator_v2";
  const defaultState = {
    settings: { hourlyRate: 5, powerPrice: 0.35, defaultProfit: 30, rounding: 0.1 },
    materials: [],
    projects: [],
    lastPrice: null,
    activeCalc: "calc3d"
  };

  let state = loadState();
  let deferredPrompt = null;

  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n || 0));
  const number = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    return Number(String(value ?? "").replace(",", ".")) || 0;
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2));
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultState, ...saved, settings: { ...defaultState.settings, ...(saved?.settings || {}) } };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateStats();
  }

  function setView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === view));
    document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "materials") renderMaterials();
    if (view === "projects") renderProjects();
    if (view === "calculator") renderCalculator();
    if (view === "settings") fillSettings();
  }

  function updateStats() {
    $("statMaterials").textContent = state.materials.length;
    $("statProjects").textContent = state.projects.length;
    $("statLastPrice").textContent = state.lastPrice == null ? "–" : money(state.lastPrice);
  }

  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  document.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => {
    state.activeCalc = btn.dataset.open;
    saveState();
    setView("calculator");
  }));

  // MATERIALS
  const materialDialog = $("materialDialog");
  $("addMaterialBtn").addEventListener("click", () => openMaterialDialog());
  $("closeMaterialDialog").addEventListener("click", () => materialDialog.close());
  $("materialSearch").addEventListener("input", renderMaterials);
  $("materialFilter").addEventListener("change", renderMaterials);
  ["purchasePrice","purchaseQuantity"].forEach(id => $(id).addEventListener("input", updateUnitPreview));

  function openMaterialDialog(material = null) {
    $("materialDialogTitle").textContent = material ? "Material bearbeiten" : "Material hinzufügen";
    $("materialId").value = material?.id || "";
    $("materialName").value = material?.name || "";
    $("materialArea").value = material?.area || "3D-Druck";
    $("purchasePrice").value = material?.purchasePrice ?? "";
    $("purchaseQuantity").value = material?.purchaseQuantity ?? "";
    $("materialUnit").value = material?.unit || "g";
    $("materialNote").value = material?.note || "";
    updateUnitPreview();
    materialDialog.showModal();
  }

  function updateUnitPreview() {
    const q = number($("purchaseQuantity").value);
    const p = number($("purchasePrice").value);
    $("unitPricePreview").textContent = q > 0 ? `${money(p/q)} / ${$("materialUnit").value}` : "0,00 €";
  }

  $("materialUnit").addEventListener("change", updateUnitPreview);

  $("materialForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("materialName").value.trim();
    const purchasePrice = number($("purchasePrice").value);
    const purchaseQuantity = number($("purchaseQuantity").value);
    if (!name || purchasePrice < 0 || purchaseQuantity <= 0) {
      alert("Bitte Materialname, Preis und eine gültige Menge eingeben.");
      return;
    }
    const item = {
      id: $("materialId").value || uid(),
      name,
      area: $("materialArea").value,
      purchasePrice,
      purchaseQuantity,
      unit: $("materialUnit").value,
      note: $("materialNote").value.trim(),
      unitPrice: purchasePrice / purchaseQuantity
    };
    const idx = state.materials.findIndex(m => m.id === item.id);
    if (idx >= 0) state.materials[idx] = item; else state.materials.push(item);
    saveState();
    materialDialog.close();
    renderMaterials();
  });

  function renderMaterials() {
    const term = $("materialSearch").value.trim().toLowerCase();
    const area = $("materialFilter").value;
    const list = state.materials
      .filter(m => (!term || `${m.name} ${m.note}`.toLowerCase().includes(term)) && (!area || m.area === area))
      .sort((a,b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name));

    $("materialList").innerHTML = list.length ? list.map(m => `
      <article class="card material-item">
        <div class="item-top">
          <div><div class="item-title">${escapeHtml(m.name)}</div><div class="item-meta">${escapeHtml(m.area)} · ${escapeHtml(m.purchaseQuantity)} ${escapeHtml(m.unit)}${m.note ? " · " + escapeHtml(m.note) : ""}</div></div>
          <div class="item-price">${money(m.unitPrice)}<small> / ${escapeHtml(m.unit)}</small></div>
        </div>
        <div class="item-actions">
          <button data-edit-material="${m.id}">Bearbeiten</button>
          <button data-delete-material="${m.id}" class="danger">Löschen</button>
        </div>
      </article>`).join("") : $("emptyTemplate").innerHTML;

    document.querySelectorAll("[data-edit-material]").forEach(b => b.addEventListener("click", () => openMaterialDialog(state.materials.find(m => m.id === b.dataset.editMaterial))));
    document.querySelectorAll("[data-delete-material]").forEach(b => b.addEventListener("click", () => {
      if (confirm("Material wirklich löschen?")) {
        state.materials = state.materials.filter(m => m.id !== b.dataset.deleteMaterial);
        saveState(); renderMaterials();
      }
    }));
  }

  // CALCULATOR
  const calcNames = {
    calc3d: "3D-Druck",
    calcLaser: "Laser",
    calcVinyl: "Vinylfolie",
    calcTextil: "Textilfolie"
  };

  document.querySelectorAll("#calcTabs button").forEach(btn => btn.addEventListener("click", () => {
    state.activeCalc = btn.dataset.calc; saveState(); renderCalculator();
  }));
  $("resetCalcBtn").addEventListener("click", () => renderCalculator(true));

  function materialsFor(area) {
    return state.materials.filter(m => m.area === area);
  }

  function materialOptions(area) {
    const items = materialsFor(area);
    return `<option value="">Material auswählen</option>` + items.map(m => `<option value="${m.id}">${escapeHtml(m.name)} – ${money(m.unitPrice)}/${escapeHtml(m.unit)}</option>`).join("");
  }

  function renderCalculator(reset = false) {
    const type = state.activeCalc || "calc3d";
    $("calculatorTitle").textContent = calcNames[type];
    document.querySelectorAll("#calcTabs button").forEach(b => b.classList.toggle("active", b.dataset.calc === type));
    $("profitPercent").value = state.settings.defaultProfit;

    let html = "";
    if (type === "calc3d") html = `
      <label>Filament<select id="calcMaterial">${materialOptions("3D-Druck")}</select></label>
      <div class="form-grid">
        <label>Verbrauch (g)<input id="materialUsage" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 10}"></label>
        <label>Druckzeit (Stunden)<input id="machineHours" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 1}"></label>
        <label>Druckerleistung (Watt)<input id="machineWatts" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 120}"></label>
        <label>Verschleiß je Stunde (€)<input id="wearPerHour" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 0.30}"></label>
      </div>`;
    if (type === "calcLaser") html = `
      <label>Material<select id="calcMaterial">${materialOptions("Laser")}</select></label>
      <div class="form-grid">
        <label>Materialverbrauch (Einheiten)<input id="materialUsage" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 1}"></label>
        <label>Laserzeit (Minuten)<input id="machineMinutes" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 10}"></label>
        <label>Laserleistung (Watt)<input id="machineWatts" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 80}"></label>
        <label>Verschleiß je Stunde (€)<input id="wearPerHour" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 1.00}"></label>
      </div>`;
    if (type === "calcVinyl") html = `
      <label>Vinylfolie<select id="calcMaterial">${materialOptions("Vinylfolie")}</select></label>
      <div class="form-grid">
        <label>Folienverbrauch (Einheiten)<input id="materialUsage" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 1}"></label>
        <label>Entgittern (Minuten)<input id="weedingMinutes" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 10}"></label>
        <label>Montage (Minuten)<input id="mountingMinutes" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 0}"></label>
        <label>Transferfolie (€)<input id="transferCosts" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 0}"></label>
      </div>`;
    if (type === "calcTextil") html = `
      <label>Textilfolie<select id="calcMaterial">${materialOptions("Textilfolie")}</select></label>
      <div class="form-grid">
        <label>Folienverbrauch (Einheiten)<input id="materialUsage" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 1}"></label>
        <label>Textil-Rohling (€)<input id="blankCosts" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 5}"></label>
        <label>Entgittern (Minuten)<input id="weedingMinutes" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 10}"></label>
        <label>Pressen (Minuten)<input id="pressMinutes" type="number" min="0" step="any" inputmode="decimal" value="${reset ? "" : 3}"></label>
      </div>`;

    $("dynamicFields").innerHTML = html;
    $("workMinutes").value = reset ? "" : 10;
    $("extraCosts").value = reset ? "" : 0;
    $("discountPercent").value = reset ? "" : 0;
    document.querySelectorAll("#calcForm input,#calcForm select").forEach(el => el.addEventListener("input", calculate));
    calculate();
  }

  function getSelectedMaterial() {
    const id = $("calcMaterial")?.value;
    return state.materials.find(m => m.id === id) || null;
  }

  function roundPrice(value) {
    const step = number(state.settings.rounding) || 0.01;
    return Math.ceil(value / step) * step;
  }

  function calculate() {
    const type = state.activeCalc;
    const mat = getSelectedMaterial();
    const materialCost = (mat?.unitPrice || 0) * number($("materialUsage")?.value);
    let machineCost = 0;
    let specialCost = 0;
    let additionalWorkMinutes = 0;

    if (type === "calc3d") {
      const hours = number($("machineHours")?.value);
      machineCost = (number($("machineWatts")?.value) / 1000) * hours * state.settings.powerPrice + hours * number($("wearPerHour")?.value);
    } else if (type === "calcLaser") {
      const hours = number($("machineMinutes")?.value) / 60;
      machineCost = (number($("machineWatts")?.value) / 1000) * hours * state.settings.powerPrice + hours * number($("wearPerHour")?.value);
    } else if (type === "calcVinyl") {
      additionalWorkMinutes = number($("weedingMinutes")?.value) + number($("mountingMinutes")?.value);
      specialCost = number($("transferCosts")?.value);
    } else if (type === "calcTextil") {
      additionalWorkMinutes = number($("weedingMinutes")?.value) + number($("pressMinutes")?.value);
      specialCost = number($("blankCosts")?.value);
    }

    const workCost = ((number($("workMinutes").value) + additionalWorkMinutes) / 60) * state.settings.hourlyRate;
    const costs = materialCost + machineCost + specialCost + workCost + number($("extraCosts").value);
    const profit = costs * number($("profitPercent").value) / 100;
    const beforeDiscount = costs + profit;
    const discounted = beforeDiscount * (1 - number($("discountPercent").value) / 100);
    const sale = roundPrice(Math.max(0, discounted));

    $("costPrice").textContent = money(costs);
    $("profitAmount").textContent = money(Math.max(0, sale - costs));
    $("salePrice").textContent = money(sale);
    $("calcForm").dataset.costs = costs;
    $("calcForm").dataset.sale = sale;
  }

  $("calcForm").addEventListener("submit", (e) => {
    e.preventDefault();
    calculate();
    const title = prompt("Wie soll das Projekt heißen?", `${calcNames[state.activeCalc]} ${new Date().toLocaleDateString("de-DE")}`);
    if (!title) return;
    const project = {
      id: uid(), title: title.trim(), type: calcNames[state.activeCalc],
      material: getSelectedMaterial()?.name || "ohne Material",
      costs: number($("calcForm").dataset.costs),
      sale: number($("calcForm").dataset.sale),
      createdAt: new Date().toISOString()
    };
    state.projects.unshift(project);
    state.lastPrice = project.sale;
    saveState();
    alert("Projekt wurde gespeichert.");
  });

  // PROJECTS
  function renderProjects() {
    $("projectList").innerHTML = state.projects.length ? state.projects.map(p => `
      <article class="card project-item">
        <div class="item-top">
          <div><div class="item-title">${escapeHtml(p.title)}</div><div class="item-meta">${escapeHtml(p.type)} · ${escapeHtml(p.material)} · ${new Date(p.createdAt).toLocaleString("de-DE")}</div></div>
          <div class="item-price">${money(p.sale)}</div>
        </div>
        <div class="item-meta">Selbstkosten: ${money(p.costs)} · Gewinn: ${money(p.sale - p.costs)}</div>
        <div class="item-actions"><button data-delete-project="${p.id}" class="danger">Löschen</button></div>
      </article>`).join("") : $("emptyTemplate").innerHTML;
    document.querySelectorAll("[data-delete-project]").forEach(b => b.addEventListener("click", () => {
      if (confirm("Projekt löschen?")) { state.projects = state.projects.filter(p => p.id !== b.dataset.deleteProject); saveState(); renderProjects(); }
    }));
  }

  $("clearProjectsBtn").addEventListener("click", () => {
    if (state.projects.length && confirm("Wirklich alle Projekte löschen?")) { state.projects = []; saveState(); renderProjects(); }
  });

  // SETTINGS
  function fillSettings() {
    $("hourlyRate").value = state.settings.hourlyRate;
    $("powerPrice").value = state.settings.powerPrice;
    $("defaultProfit").value = state.settings.defaultProfit;
    $("rounding").value = String(state.settings.rounding);
  }

  $("settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.settings = {
      hourlyRate: number($("hourlyRate").value),
      powerPrice: number($("powerPrice").value),
      defaultProfit: number($("defaultProfit").value),
      rounding: number($("rounding").value)
    };
    saveState();
    alert("Einstellungen gespeichert.");
  });

  // BACKUP
  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DLA-Kalkulator-Backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $("importInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!imported || !Array.isArray(imported.materials) || !Array.isArray(imported.projects)) throw new Error();
      state = { ...defaultState, ...imported, settings: { ...defaultState.settings, ...(imported.settings || {}) } };
      saveState(); renderMaterials(); renderProjects(); fillSettings(); alert("Backup erfolgreich eingelesen.");
    } catch {
      alert("Die Datei ist kein gültiges Kalkulator-Backup.");
    }
    e.target.value = "";
  });

  // PWA
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferredPrompt = e; $("installBtn").classList.remove("hidden");
  });
  $("installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("installBtn").classList.add("hidden");
  });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

  updateStats();
  renderCalculator();
})();
