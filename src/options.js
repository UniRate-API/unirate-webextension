import { loadSettings, saveSettings, DEFAULTS } from "./storage.js";

const $ = (id) => document.getElementById(id);

async function main() {
  const settings = await loadSettings();
  $("apiKey").value = settings.apiKey || "";
  $("baseUrl").value = settings.baseUrl || DEFAULTS.baseUrl;

  $("settings").addEventListener("submit", async (event) => {
    event.preventDefault();
    const apiKey = $("apiKey").value.trim();
    const baseUrl = $("baseUrl").value.trim() || DEFAULTS.baseUrl;
    await saveSettings({ apiKey, baseUrl });

    const status = $("status");
    status.classList.remove("error");
    status.textContent = "Saved ✓";
    setTimeout(() => {
      status.textContent = "";
    }, 2000);
  });
}

main();
