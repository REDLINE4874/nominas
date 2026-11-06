const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const dropdownMarkup = (id, options, selected = "", disabled = false) => {
  const current = options.find(([value]) => value === selected) || options[0];
  return `<div class="custom-dropdown" data-dropdown><input type="hidden" id="${id}" value="${esc(current?.[0] ?? "")}"><button type="button" class="dropdown-trigger" aria-haspopup="listbox" aria-expanded="false" ${disabled ? "disabled" : ""}><span class="dropdown-label">${esc(current?.[1] ?? "")}</span><span class="dropdown-caret" aria-hidden="true"></span></button><div class="dropdown-menu" role="listbox" hidden>${options.map(([value, label]) => `<button type="button" class="dropdown-option${value === current?.[0] ? " selected" : ""}" role="option" aria-selected="${value === current?.[0]}" data-value="${esc(value)}">${esc(label)}</button>`).join("")}</div></div>`;
};
const initDropdowns = (root = document) => {
  root.querySelectorAll("[data-dropdown]").forEach((dropdown) => {
    const value = dropdown.querySelector('input[type="hidden"]'),
      trigger = dropdown.querySelector(".dropdown-trigger"),
      label = dropdown.querySelector(".dropdown-label"),
      menu = dropdown.querySelector(".dropdown-menu");
    if (!value || !trigger || !menu || dropdown.dataset.ready) return;
    dropdown.dataset.ready = "true";
    const close = () => { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); };
    trigger.onclick = () => {
      document.querySelectorAll(".dropdown-menu").forEach((other) => { if (other !== menu) other.hidden = true; });
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
    };
    menu.querySelectorAll("[data-value]").forEach((option) => {
      option.onclick = () => {
        value.value = option.dataset.value;
        label.textContent = option.textContent;
        menu.querySelectorAll("[data-value]").forEach((item) => {
          item.classList.toggle("selected", item === option);
          item.setAttribute("aria-selected", String(item === option));
        });
        close();
        value.dispatchEvent(new Event("change", { bubbles: true }));
      };
    });
    trigger.disabled = value.disabled;
    trigger.onkeydown = (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        menu.querySelector("[data-value]")?.focus();
      }
    };
    menu.onkeydown = (event) => {
      if (event.key === "Escape") {
        close();
        trigger.focus();
      }
    };
  });
};
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-dropdown]")) return;
  document.querySelectorAll("[data-dropdown]").forEach((dropdown) => {
    const menu = dropdown.querySelector(".dropdown-menu"), trigger = dropdown.querySelector(".dropdown-trigger");
    if (menu && trigger) { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  });
});
const mxn = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n || 0,
  );
const pad = (n) => String(n).padStart(2, "0"),
  fmt = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monday = (s) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fmt(d);
};
const lastClosedWeek = () => {
  const d = new Date(monday(fmt(new Date())) + "T00:00:00");
  d.setDate(d.getDate() - 7);
  return fmt(d);
};
const S = {
  week: lastClosedWeek(),
  pid: null,
  rol: null,
  authenticated: false,
  view: "nomina",
};
const toast = (m, err) => {
  const t = $("#toast");
  t.textContent = m;
  t.className = "show" + (err ? " err" : "");
  setTimeout(() => (t.className = ""), 3500);
};
const q = async (p) => {
  const { data, error } = await p;
  if (error) throw error;
  return data;
};
const run =
  (f) =>
  async (...a) => {
    try {
      await f(...a);
    } catch (e) {
      toast(e.message || "Error", true);
    }
  };
const isAdmin = () => S.authenticated;
const canManageStaff = () => S.authenticated;
const setTheme = (t) => {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("theme", t);
};
setTheme(
  localStorage.getItem("theme") ||
    (matchMedia("(prefers-color-scheme:light)").matches ? "light" : "dark"),
);
$("#themeBtn").onclick = () =>
  setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
const online = () => {
  $("#net").textContent = navigator.onLine ? "En línea" : "Sin conexión";
  $("#net").className = navigator.onLine ? "" : "off";
};
addEventListener("online", online);
addEventListener("offline", online);
online();
