import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, remove, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDS50ENCdaGoMdCPweuRS7SD6MQaLHc3Bg",
  authDomain: "profcoder-68e74.firebaseapp.com",
  databaseURL: "https://profcoder-68e74-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "profcoder-68e74",
  storageBucket: "profcoder-68e74.firebasestorage.app",
  messagingSenderId: "990726415994",
  appId: "1:990726415994:web:1140b4b34296db7506bdc3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// State
let currentTab = 'code';
let currentEditingId = null;
let allCodes = [];
let allPrompts = [];

// Elements - Sidebar Panels
const sidebarCodePanel = document.getElementById('sidebar-code-panel');
const sidebarPromptPanel = document.getElementById('sidebar-prompt-panel');
const searchCodeInput = document.getElementById('search-code');
const searchPromptInput = document.getElementById('search-prompt');

// Elements - Content
const codeSec = document.getElementById('code-section');
const promptSec = document.getElementById('prompts-section');
const codeList = document.getElementById('code-list');
const promptList = document.getElementById('prompt-list');

// --- TABS & SIDEBAR LOGIC ---

window.switchTab = (tab) => {
    currentTab = tab;
    // Reset tlačítek
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    if (tab === 'code') {
        // Tlačítko
        document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
        
        // Sidebar: Zobrazit jen Code Panel (Search + List)
        sidebarCodePanel.classList.remove('hidden-panel');
        sidebarCodePanel.classList.add('active-panel');
        sidebarPromptPanel.classList.remove('active-panel');
        sidebarPromptPanel.classList.add('hidden-panel');

        // Main Content
        codeSec.className = 'content-section active-section';
        promptSec.className = 'content-section hidden-section';

        // Refresh list
        renderList(allCodes, codeList, 'code', searchCodeInput.value);

    } else {
        // Tlačítko
        document.querySelector('.nav-btn:nth-child(2)').classList.add('active');

        // Sidebar: Zobrazit jen Prompt Panel (Search + List)
        sidebarPromptPanel.classList.remove('hidden-panel');
        sidebarPromptPanel.classList.add('active-panel');
        sidebarCodePanel.classList.remove('active-panel');
        sidebarCodePanel.classList.add('hidden-panel');

        // Main Content
        promptSec.className = 'content-section active-section';
        codeSec.className = 'content-section hidden-section';

        // Refresh list
        renderList(allPrompts, promptList, 'prompt', searchPromptInput.value);
    }
};

// --- SEARCH LISTENERS (Separátní) ---

// Hledání v kódech
searchCodeInput.addEventListener('input', (e) => {
    renderList(allCodes, codeList, 'code', e.target.value);
});

// Hledání v promptech
searchPromptInput.addEventListener('input', (e) => {
    renderList(allPrompts, promptList, 'prompt', e.target.value);
});


// --- MODAL & BUTTONS LOGIC ---

const modal = document.getElementById('new-item-modal');
document.getElementById('global-new-btn').onclick = () => modal.classList.add('open');
document.getElementById('close-modal').onclick = () => modal.classList.remove('open');
modal.onclick = (e) => { if(e.target===modal) modal.classList.remove('open'); };

document.getElementById('create-code-choice').onclick = () => {
    modal.classList.remove('open');
    switchTab('code');
    resetForm();
};
document.getElementById('create-prompt-choice').onclick = () => {
    modal.classList.remove('open');
    switchTab('prompts');
    resetForm();
};

window.copyToClipboard = (elementId, btnElement) => {
    const text = document.getElementById(elementId).value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const original = btnElement.innerHTML;
        btnElement.innerHTML = "✅";
        setTimeout(() => btnElement.innerHTML = original, 1500);
    });
};

// --- PREVIEW ---
const htmlInput = document.getElementById('html-code');
const cssInput = document.getElementById('css-code');
const jsInput = document.getElementById('js-code');
const previewFrame = document.getElementById('preview-frame');

function updatePreview() {
    const html = htmlInput.value;
    const css = `<style>${cssInput.value}</style>`;
    const js = `<script>${jsInput.value}<\/script>`;
    const content = `<!DOCTYPE html><html><head><meta charset="utf-8">${css}</head><body>${html}${js}</body></html>`;
    const doc = previewFrame.contentWindow.document;
    doc.open(); doc.write(content); doc.close();
}
[htmlInput, cssInput, jsInput].forEach(el => el.addEventListener('input', updatePreview));

// --- CRUD ---
const resetForm = () => {
    currentEditingId = null;
    // Code
    document.getElementById('snippet-title').value = "";
    document.getElementById('code-tags').value = "";
    htmlInput.value = ""; cssInput.value = ""; jsInput.value = "";
    updatePreview();
    document.getElementById('save-snippet-btn').innerHTML = "💾 Uložit";
    document.getElementById('delete-snippet-btn').style.display = "none";
    // Prompt
    document.getElementById('prompt-title').value = "";
    document.getElementById('prompt-tags').value = "";
    document.getElementById('prompt-content').value = "";
    document.getElementById('save-prompt-btn').innerHTML = "💾 Uložit";
    document.getElementById('delete-prompt-btn').style.display = "none";
    
    document.querySelectorAll('.saved-item').forEach(el => el.classList.remove('selected'));
};

// Save logic (Code)
document.getElementById('save-snippet-btn').onclick = async () => {
    const title = document.getElementById('snippet-title').value;
    if(!title) return alert("Chybí název!");
    const btn = document.getElementById('save-snippet-btn');
    btn.innerHTML = "⏳...";
    const data = { title, tags: document.getElementById('code-tags').value, html: htmlInput.value, css: cssInput.value, js: jsInput.value };
    if(!currentEditingId) data.createdAt = Date.now();

    try {
        if(currentEditingId) await update(ref(db, 'codes/'+currentEditingId), data);
        else await set(push(ref(db, 'codes')), data);
        btn.innerHTML = "✅ OK"; setTimeout(() => btn.innerHTML = "💾 Uložit", 1500);
        resetForm();
    } catch(e) { console.error(e); }
};

// Save logic (Prompt)
document.getElementById('save-prompt-btn').onclick = async () => {
    const title = document.getElementById('prompt-title').value;
    const content = document.getElementById('prompt-content').value;
    if(!title || !content) return alert("Chybí údaje!");
    const btn = document.getElementById('save-prompt-btn');
    btn.innerHTML = "⏳...";
    const data = { title, tags: document.getElementById('prompt-tags').value, content };
    if(!currentEditingId) data.createdAt = Date.now();

    try {
        if(currentEditingId) await update(ref(db, 'prompts/'+currentEditingId), data);
        else await set(push(ref(db, 'prompts')), data);
        btn.innerHTML = "✅ OK"; setTimeout(() => btn.innerHTML = "💾 Uložit", 1500);
        resetForm();
    } catch(e) { console.error(e); }
};

// Delete
const deleteItem = async (type) => {
    if(!currentEditingId || !confirm("Smazat?")) return;
    await remove(ref(db, `${type}/${currentEditingId}`));
    resetForm();
};
document.getElementById('delete-snippet-btn').onclick = () => deleteItem('codes');
document.getElementById('delete-prompt-btn').onclick = () => deleteItem('prompts');

// Load Item
window.loadItem = (id, data, type) => {
    currentEditingId = id;
    document.querySelectorAll('.saved-item').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById(`item-${id}`);
    if(el) el.classList.add('selected');

    if (type === 'code') {
        document.getElementById('snippet-title').value = data.title;
        document.getElementById('code-tags').value = data.tags || "";
        htmlInput.value = data.html || ""; cssInput.value = data.css || ""; jsInput.value = data.js || "";
        updatePreview();
        document.getElementById('save-snippet-btn').innerHTML = "💾 Aktualizovat";
        document.getElementById('delete-snippet-btn').style.display = "block";
    } else {
        document.getElementById('prompt-title').value = data.title;
        document.getElementById('prompt-tags').value = data.tags || "";
        document.getElementById('prompt-content').value = data.content;
        document.getElementById('save-prompt-btn').innerHTML = "💾 Aktualizovat";
        document.getElementById('delete-prompt-btn').style.display = "block";
    }
};

// --- RENDER LIST (Univerzální, s param pro search) ---
function renderList(items, container, type, searchTerm = "") {
    container.innerHTML = "";
    const query = searchTerm.toLowerCase();
    
    const filtered = items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.tags && item.tags.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div style="padding:10px; opacity:0.5; font-size:0.8rem;">Žádné výsledky</div>`;
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'saved-item';
        div.id = `item-${item.id}`;
        if(currentEditingId === item.id) div.classList.add('selected');

        let tagsHtml = '';
        if(item.tags) item.tags.split(',').slice(0,3).forEach(t => {
            if(t.trim()) tagsHtml += `<span class="tag-badge">#${t.trim()}</span>`;
        });

        div.innerHTML = `<strong>${item.title}</strong><div style="margin-top:4px;">${tagsHtml}</div>`;
        div.onclick = () => loadItem(item.id, item, type);
        container.appendChild(div);
    });
}

// Data Listeners
onValue(ref(db, 'codes'), (snap) => {
    allCodes = snap.val() ? Object.entries(snap.val()).map(([k,v]) => ({id:k,...v})).sort((a,b)=>b.createdAt-a.createdAt) : [];
    if(currentTab==='code') renderList(allCodes, codeList, 'code', searchCodeInput.value);
});
onValue(ref(db, 'prompts'), (snap) => {
    allPrompts = snap.val() ? Object.entries(snap.val()).map(([k,v]) => ({id:k,...v})).sort((a,b)=>b.createdAt-a.createdAt) : [];
    if(currentTab==='prompts') renderList(allPrompts, promptList, 'prompt', searchPromptInput.value);
});
