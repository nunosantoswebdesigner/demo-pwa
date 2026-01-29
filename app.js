const installBtn = document.getElementById("installBtn");
const installHelpBtn = document.getElementById("installHelpBtn");
const installHelp = document.getElementById("installHelp");
const installStatus = document.getElementById("installStatus");
const cacheTestBtn = document.getElementById("cacheTestBtn");
const cacheTestResult = document.getElementById("cacheTestResult");
const notifyBtn = document.getElementById("notifyBtn");
const notifyStatus = document.getElementById("notifyStatus");
const idbSaveBtn = document.getElementById("idbSaveBtn");
const idbValue = document.getElementById("idbValue");
const shareBtn = document.getElementById("shareBtn");
const shareStatus = document.getElementById("shareStatus");
const capabilitiesList = document.getElementById("capabilitiesList");

let deferredInstallPrompt;

const capabilities = [
  ["Service Worker", "serviceWorker" in navigator],
  ["Cache Storage", "caches" in window],
  ["Notificações", "Notification" in window],
  ["Instalação", "BeforeInstallPromptEvent" in window || "onbeforeinstallprompt" in window],
  ["IndexedDB", "indexedDB" in window],
  ["Web Share", "share" in navigator],
];

function renderCapabilities() {
  capabilitiesList.innerHTML = "";
  capabilities.forEach(([label, supported]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${label}</span><strong>${supported ? "OK" : "N/A"}</strong>`;
    capabilitiesList.appendChild(li);
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    installStatus.textContent = "Service Worker não suportado.";
    return;
  }

  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      if (registration.waiting) {
        installStatus.textContent = "Atualização pendente disponível.";
      }
    })
    .catch((error) => {
      installStatus.textContent = `Erro no SW: ${error.message}`;
    });
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      installStatus.textContent = "Instalação não disponível agora.";
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    installStatus.textContent = choice.outcome === "accepted" ? "Instalação iniciada." : "Instalação cancelada.";
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}

function setupInstallHelp() {
  installHelpBtn.addEventListener("click", () => {
    installHelp.hidden = !installHelp.hidden;
  });
}

async function testCache() {
  cacheTestResult.textContent = "A testar…";
  try {
    const response = await fetch("/data/sample.json", { cache: "no-store" });
    const data = await response.json();
    cacheTestResult.textContent = `OK: ${data.message}`;
  } catch (error) {
    cacheTestResult.textContent = "Offline ou recurso indisponível.";
  }
}

async function sendLocalNotification() {
  if (!("Notification" in window)) {
    notifyStatus.textContent = "Notificações não suportadas.";
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    notifyStatus.textContent = "Permissão negada.";
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    notifyStatus.textContent = "Service Worker não registado.";
    return;
  }

  registration.showNotification("PWA Lab", {
    body: "Notificação local entregue via Service Worker.",
    icon: "/assets/icons/icon-192.svg",
    badge: "/assets/icons/icon-192.svg",
    data: { url: "/" },
  });

  notifyStatus.textContent = "Notificação enviada.";
}

function openIdb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pwa-lab", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("kv");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveIdbValue() {
  if (!("indexedDB" in window)) {
    idbValue.textContent = "IndexedDB não suportado.";
    return;
  }

  const db = await openIdb();
  const tx = db.transaction("kv", "readwrite");
  const store = tx.objectStore("kv");
  const value = new Date().toISOString();
  store.put(value, "lastSaved");
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  idbValue.textContent = `Guardado: ${value}`;
}

async function loadIdbValue() {
  if (!("indexedDB" in window)) {
    return;
  }
  const db = await openIdb();
  const tx = db.transaction("kv", "readonly");
  const store = tx.objectStore("kv");
  const request = store.get("lastSaved");
  request.onsuccess = () => {
    if (request.result) {
      idbValue.textContent = `Último: ${request.result}`;
    }
  };
}

async function sharePage() {
  if (!navigator.share) {
    shareStatus.textContent = "Web Share não suportado.";
    return;
  }

  try {
    await navigator.share({
      title: "PWA Lab",
      text: "Demo local de PWA",
      url: window.location.href,
    });
    shareStatus.textContent = "Partilhado!";
  } catch {
    shareStatus.textContent = "Partilha cancelada.";
  }
}

function setupEvents() {
  cacheTestBtn.addEventListener("click", testCache);
  notifyBtn.addEventListener("click", sendLocalNotification);
  idbSaveBtn.addEventListener("click", saveIdbValue);
  shareBtn.addEventListener("click", sharePage);
}

renderCapabilities();
registerServiceWorker();
setupInstallPrompt();
setupInstallHelp();
setupEvents();
loadIdbValue();
