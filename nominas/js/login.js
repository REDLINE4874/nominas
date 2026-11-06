const $ = (s) => document.querySelector(s);
document.documentElement.dataset.theme =
  localStorage.getItem("theme") ||
  (matchMedia("(prefers-color-scheme:light)").matches ? "light" : "dark");
const MSG = {
  cfg: "Falta configurar js/config.js (URL y clave anon de Supabase).",
};
$("#lerr").textContent =
  MSG[new URLSearchParams(location.search).get("e")] || "";
if (sb)
  sb.auth.getSession().then(({ data }) => {
    if (data.session) location.replace("index.html");
  });
$("#lform").onsubmit = async (e) => {
  e.preventDefault();
  $("#lerr").textContent = "";
  if (!sb) {
    $("#lerr").textContent = MSG.cfg;
    return;
  }
  const { error } = await sb.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#pass").value,
  });
  if (error)
    $("#lerr").textContent = error.message.includes("Invalid")
      ? "Correo o contraseña incorrectos."
      : error.message;
  else location.replace("index.html");
};
