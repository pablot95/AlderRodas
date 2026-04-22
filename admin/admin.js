// admin.js  –  Lic. Alder Rodas  –  Panel de administración
// Firebase 10.11.0 ESM

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// ── Firebase init ─────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyCzj5gLvEhZdl3LNoHVqcDMzFKrW_2Dkno",
    authDomain: "alderrodas.firebaseapp.com",
    projectId: "alderrodas",
    storageBucket: "alderrodas.firebasestorage.app",
    messagingSenderId: "169054089082",
    appId: "1:169054089082:web:2838367f09cd7349fe70c3"
};
const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

// ── DOM references ────────────────────────────────────────
const viewLogin     = document.getElementById('view-login');
const viewAdmin     = document.getElementById('view-admin');
const panelList     = document.getElementById('panel-list');
const panelForm     = document.getElementById('panel-form');
const loginForm     = document.getElementById('login-form');
const loginError    = document.getElementById('login-error');
const loginBtn      = document.getElementById('login-btn');
const logoutBtn     = document.getElementById('logout-btn');
const btnList       = document.getElementById('btn-list');
const btnNew        = document.getElementById('btn-new');
const btnNewInline  = document.getElementById('btn-new-inline');
const btnBackList   = document.getElementById('btn-back-list');
const btnCancel     = document.getElementById('btn-cancel');
const btnDraft      = document.getElementById('btn-draft');
const articleForm   = document.getElementById('article-form');
const formTitleEl   = document.getElementById('form-title');
const artIdInput    = document.getElementById('art-id');
const tbody         = document.getElementById('articles-tbody');
const listSpinner   = document.getElementById('list-spinner');
const articlesTable = document.getElementById('articles-table');
const emptyList     = document.getElementById('empty-list');
const searchInput   = document.getElementById('search-input');
const filterStatus  = document.getElementById('filter-status');
const togglePassBtn = document.getElementById('toggle-pass');
const togglePreview = document.getElementById('toggle-preview');
const artTexto      = document.getElementById('art-texto');
const artPreview    = document.getElementById('art-preview');
const toast         = document.getElementById('toast');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmOk     = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
const uploadZone    = document.getElementById('upload-zone');
const imgUpload     = document.getElementById('img-upload');
const uploadProgress = document.getElementById('upload-progress');
const progressFill  = document.getElementById('progress-fill');
const progressText  = document.getElementById('progress-text');
const imgThumbWrap  = document.getElementById('img-thumb-wrap');
const imgThumb      = document.getElementById('img-thumb');
const artImagenUrl  = document.getElementById('art-imagen-url');

// Campos SEO / contador
const artTitulo     = document.getElementById('art-titulo');
const artSlug       = document.getElementById('art-slug');
const artTituloSeo  = document.getElementById('art-titulo-seo');
const artMetaDesc   = document.getElementById('art-meta-desc');
const artExtracto   = document.getElementById('art-extracto');
const extractoCount = document.getElementById('extracto-count');
const seoTitleCount = document.getElementById('seo-title-count');
const seoDescCount  = document.getElementById('seo-desc-count');
const seoTitleStatus = document.getElementById('seo-title-status');
const seoDescStatus  = document.getElementById('seo-desc-status');
const serpSlug       = document.getElementById('serp-slug');
const serpTitle      = document.getElementById('serp-title');
const serpDesc       = document.getElementById('serp-desc');
const adminEmailDisplay = document.getElementById('admin-email-display');

// ── Helpers ───────────────────────────────────────────────
function showToast(msg, type = 'ok') {
    toast.textContent = msg;
    toast.className = `toast toast-${type} show`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
}
function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });
}
function slugify(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
function setSeoStatus(el, count, min, max) {
    if (count === 0) { el.textContent = ''; el.className = 'seo-status'; return; }
    if (count < min) { el.textContent = 'Muy corto'; el.className = 'seo-status warn'; }
    else if (count <= max) { el.textContent = '✓ Ideal'; el.className = 'seo-status good'; }
    else { el.textContent = 'Muy largo'; el.className = 'seo-status bad'; }
}

// ── Auth guard ────────────────────────────────────────────
onAuthStateChanged(auth, user => {
    if (user) {
        viewLogin.style.display = 'none';
        viewAdmin.style.display = 'flex';
        if (adminEmailDisplay) adminEmailDisplay.textContent = user.email;
        loadArticleList();
    } else {
        viewLogin.style.display = 'flex';
        viewAdmin.style.display = 'none';
    }
});

// ── Login ─────────────────────────────────────────────────
loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando…';
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch(err) {
        let msg = 'Credenciales incorrectas. Verificá tu email y contraseña.';
        if (err.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Esperá unos minutos.';
        loginError.textContent = msg;
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
    }
});

// ── Show/hide password ────────────────────────────────────
togglePassBtn.addEventListener('click', () => {
    const input = document.getElementById('login-pass');
    const icon  = togglePassBtn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
});

// ── Logout ────────────────────────────────────────────────
logoutBtn.addEventListener('click', () => signOut(auth));

// ── Nav sidebar ───────────────────────────────────────────
function showPanel(name) {
    panelList.style.display = name === 'list' ? 'block' : 'none';
    panelForm.style.display = name === 'form' ? 'block' : 'none';
    btnList.classList.toggle('active', name === 'list');
    btnNew.classList.toggle('active', name === 'form');
}
btnList.addEventListener('click', () => showPanel('list'));
btnNew.addEventListener('click', () => { resetForm(); showPanel('form'); });
btnNewInline.addEventListener('click', () => { resetForm(); showPanel('form'); });
btnBackList.addEventListener('click', () => showPanel('list'));
btnCancel.addEventListener('click', () => showPanel('list'));

// ── Article list ──────────────────────────────────────────
let allArticles = [];
async function loadArticleList() {
    listSpinner.style.display = 'block';
    articlesTable.style.display = 'none';
    emptyList.style.display = 'none';
    try {
        const q = query(collection(db, 'articulos'), orderBy('creadoEn', 'desc'));
        const snap = await getDocs(q);
        allArticles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTable(allArticles);
    } catch(e) {
        console.error('Error cargando artículos:', e);
        showToast('Error al cargar artículos', 'err');
    } finally {
        listSpinner.style.display = 'none';
    }
}
function renderTable(articles) {
    tbody.innerHTML = '';
    if (articles.length === 0) {
        emptyList.style.display = 'block';
        articlesTable.style.display = 'none';
        return;
    }
    emptyList.style.display = 'none';
    articlesTable.style.display = 'table';
    articles.forEach(a => {
        const tr = document.createElement('tr');
        const pubBadge = a.publicado
            ? '<span class="badge badge-pub">Publicado</span>'
            : '<span class="badge badge-draft">Borrador</span>';
        const featBadge = a.destacado ? '<span class="badge badge-featured">Destacado</span>' : '';
        tr.innerHTML = `
            <td class="td-title">${a.titulo || '(sin título)'}${featBadge}</td>
            <td class="td-slug">/blog/${a.slug || ''}</td>
            <td>${a.categoria || '—'}</td>
            <td>${pubBadge}</td>
            <td class="td-date">${formatDate(a.fechaPublicacion)}</td>
            <td class="td-actions">
                <button class="btn-icon" data-action="edit" data-id="${a.id}"><i class="fas fa-pen"></i></button>
                <button class="btn-icon del" data-action="del" data-id="${a.id}" data-title="${(a.titulo || '').replace(/"/g, '&quot;')}"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });
}
// Delegación de eventos en tabla
tbody.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, title } = btn.dataset;
    if (action === 'edit') openEditForm(id);
    if (action === 'del') confirmDelete(id, title);
});

// Buscar / filtrar
function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const status = filterStatus.value;
    let filtered = allArticles;
    if (search)  filtered = filtered.filter(a => (a.titulo || '').toLowerCase().includes(search));
    if (status === 'publicado') filtered = filtered.filter(a => a.publicado);
    if (status === 'borrador')  filtered = filtered.filter(a => !a.publicado);
    renderTable(filtered);
}
searchInput.addEventListener('input', applyFilters);
filterStatus.addEventListener('change', applyFilters);

// ── Form: reset y populate ────────────────────────────────
function resetForm() {
    articleForm.reset();
    artIdInput.value = '';
    formTitleEl.innerHTML = '<i class="fas fa-pen"></i> Nuevo artículo';
    imgThumbWrap.style.display = 'none';
    uploadProgress.style.display = 'none';
    artPreview.style.display = 'none';
    artTexto.style.display = 'block';
    togglePreview.classList.remove('active');
    updateCounters();
    updateSerpPreview();
    document.getElementById('save-status').textContent = '';
    // Fecha por defecto: ahora
    const now = new Date();
    now.setSeconds(0, 0);
    document.getElementById('art-fecha').value = now.toISOString().slice(0,16);
}
function populateForm(a) {
    artIdInput.value   = a.id;
    artTitulo.value    = a.titulo    || '';
    artSlug.value      = a.slug      || '';
    artTituloSeo.value = a.tituloSEO || '';
    artMetaDesc.value  = a.metaDescripcion || '';
    artExtracto.value  = a.extracto  || '';
    artTexto.value     = a.texto     || '';
    artImagenUrl.value = a.imagenURL || '';
    document.getElementById('art-imagen-alt').value = a.imagenAlt || '';
    document.getElementById('art-categoria').value  = a.categoria || '';
    document.getElementById('art-publicado').checked = !!a.publicado;
    document.getElementById('art-destacado').checked = !!a.destacado;
    if (a.fechaPublicacion) {
        const d = a.fechaPublicacion.toDate ? a.fechaPublicacion.toDate() : new Date(a.fechaPublicacion);
        d.setSeconds(0, 0);
        document.getElementById('art-fecha').value = d.toISOString().slice(0,16);
    }
    if (a.imagenURL) {
        imgThumb.src = a.imagenURL;
        imgThumbWrap.style.display = 'block';
    }
    updateCounters();
    updateSerpPreview();
}
async function openEditForm(id) {
    const a = allArticles.find(x => x.id === id);
    if (!a) return;
    resetForm();
    populateForm(a);
    formTitleEl.innerHTML = '<i class="fas fa-pen"></i> Editar artículo';
    showPanel('form');
    panelForm.scrollIntoView({ behavior: 'smooth' });
}

// ── Auto-slug desde título ────────────────────────────────
let slugManuallyEdited = false;
artSlug.addEventListener('input', () => { slugManuallyEdited = true; updateSerpPreview(); });
artTitulo.addEventListener('input', () => {
    if (!slugManuallyEdited || !artSlug.value) {
        artSlug.value = slugify(artTitulo.value);
    }
    updateSerpPreview();
});

// ── Contadores SEO ────────────────────────────────────────
function updateCounters() {
    const et = artExtracto.value.length;
    extractoCount.textContent = et;

    const st = artTituloSeo.value.length;
    seoTitleCount.textContent = st;
    setSeoStatus(seoTitleStatus, st, 40, 60);

    const sd = artMetaDesc.value.length;
    seoDescCount.textContent = sd;
    setSeoStatus(seoDescStatus, sd, 80, 160);
}
function updateSerpPreview() {
    serpSlug.textContent  = artSlug.value || 'slug-del-articulo';
    serpTitle.textContent = artTituloSeo.value || artTitulo.value || 'Título del artículo';
    serpDesc.textContent  = artMetaDesc.value  || 'Meta descripción del artículo.';
}
artTituloSeo.addEventListener('input', () => { updateCounters(); updateSerpPreview(); });
artMetaDesc.addEventListener('input',  () => { updateCounters(); updateSerpPreview(); });
artExtracto.addEventListener('input',  updateCounters);
artSlug.addEventListener('input',      updateSerpPreview);

// ── Editor toolbar ────────────────────────────────────────
document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        const ta  = artTexto;
        const start = ta.selectionStart;
        const end   = ta.selectionEnd;
        const sel   = ta.value.slice(start, end);
        let insert  = '';
        switch(cmd) {
            case 'bold':       insert = `<strong>${sel || 'texto'}</strong>`; break;
            case 'italic':     insert = `<em>${sel || 'texto'}</em>`; break;
            case 'h2':         insert = `\n<h2>${sel || 'Subtítulo'}</h2>\n`; break;
            case 'h3':         insert = `\n<h3>${sel || 'Subtítulo'}</h3>\n`; break;
            case 'ul':         insert = `\n<ul>\n  <li>${sel || 'Elemento'}</li>\n</ul>\n`; break;
            case 'blockquote': insert = `\n<blockquote>${sel || 'Cita'}</blockquote>\n`; break;
            case 'link': {
                const url = prompt('URL del enlace:', 'https://');
                if (!url) return;
                insert = `<a href="${url}" target="_blank" rel="noopener">${sel || url}</a>`;
                break;
            }
        }
        ta.setRangeText(insert, start, end, 'end');
        ta.focus();
    });
});

// ── Preview toggle ────────────────────────────────────────
togglePreview.addEventListener('click', () => {
    const showing = artPreview.style.display !== 'none';
    if (showing) {
        artPreview.style.display = 'none';
        artTexto.style.display   = 'block';
        togglePreview.classList.remove('active');
    } else {
        artPreview.innerHTML      = artTexto.value;
        artPreview.style.display  = 'block';
        artTexto.style.display    = 'none';
        togglePreview.classList.add('active');
    }
});

// ── Image URL preview ─────────────────────────────────────
artImagenUrl.addEventListener('change', () => {
    const url = artImagenUrl.value.trim();
    if (url) {
        imgThumb.src = url;
        imgThumbWrap.style.display = 'block';
    } else {
        imgThumbWrap.style.display = 'none';
    }
});

// ── Upload image to Firebase Storage ─────────────────────
function handleFileUpload(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
        showToast('La imagen supera el límite de 4 MB', 'err');
        return;
    }
    const ext      = file.name.split('.').pop();
    const filename = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
    const storageRef = ref(storage, `blog/${filename}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadProgress.style.display = 'block';
    uploadTask.on('state_changed',
        snap => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            progressFill.style.width = pct + '%';
            progressText.textContent = `Subiendo… ${pct}%`;
        },
        err => {
            showToast('Error al subir imagen: ' + err.message, 'err');
            uploadProgress.style.display = 'none';
        },
        async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            artImagenUrl.value     = url;
            imgThumb.src           = url;
            imgThumbWrap.style.display = 'block';
            uploadProgress.style.display = 'none';
            progressFill.style.width = '0';
            showToast('Imagen subida correctamente ✓');
        }
    );
}
uploadZone.addEventListener('click', () => imgUpload.click());
imgUpload.addEventListener('change', e => handleFileUpload(e.target.files[0]));
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFileUpload(e.dataTransfer.files[0]);
});

// ── Build article data from form ──────────────────────────
function buildArticleData(publicar) {
    const fechaVal = document.getElementById('art-fecha').value;
    let fechaTs = Timestamp.now();
    if (fechaVal) {
        fechaTs = Timestamp.fromDate(new Date(fechaVal));
    }
    return {
        titulo:          artTitulo.value.trim(),
        tituloSEO:       artTituloSeo.value.trim(),
        slug:            artSlug.value.trim(),
        metaDescripcion: artMetaDesc.value.trim(),
        extracto:        artExtracto.value.trim(),
        texto:           artTexto.value.trim(),
        imagenURL:       artImagenUrl.value.trim(),
        imagenAlt:       document.getElementById('art-imagen-alt').value.trim(),
        categoria:       document.getElementById('art-categoria').value.trim(),
        publicado:       publicar,
        destacado:       document.getElementById('art-destacado').checked,
        fechaPublicacion: fechaTs
    };
}

// Validar antes de guardar
function validateForm() {
    if (!artTitulo.value.trim()) { showToast('El título es obligatorio', 'err'); artTitulo.focus(); return false; }
    if (!artSlug.value.trim())   { showToast('El slug es obligatorio', 'err');   artSlug.focus();   return false; }
    if (!artTexto.value.trim())  { showToast('El contenido es obligatorio', 'err'); artTexto.focus(); return false; }
    // Validar formato del slug
    if (!/^[a-z0-9-]+$/.test(artSlug.value.trim())) {
        showToast('El slug solo puede contener letras minúsculas, números y guiones', 'err');
        artSlug.focus();
        return false;
    }
    return true;
}

// ── Save article ──────────────────────────────────────────
async function saveArticle(publicar) {
    if (!validateForm()) return;
    const id = artIdInput.value;
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = '⏳ Guardando…';
    const data = buildArticleData(publicar);

    try {
        if (id) {
            // Editar existente
            await updateDoc(doc(db, 'articulos', id), {
                ...data,
                actualizadoEn: Timestamp.now()
            });
            showToast(publicar ? 'Artículo actualizado y publicado ✓' : 'Borrador guardado ✓');
            // Actualizar cache local
            const idx = allArticles.findIndex(a => a.id === id);
            if (idx >= 0) allArticles[idx] = { id, ...data };
        } else {
            // Nuevo artículo
            const newRef = await addDoc(collection(db, 'articulos'), {
                ...data,
                creadoEn:     Timestamp.now(),
                actualizadoEn: Timestamp.now()
            });
            showToast(publicar ? 'Artículo publicado ✓' : 'Borrador creado ✓');
            allArticles.unshift({ id: newRef.id, ...data });
            artIdInput.value = newRef.id;
        }
        statusEl.textContent = `✓ Guardado a las ${new Date().toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' })}`;
        slugManuallyEdited = false;
    } catch(e) {
        console.error('Error guardando artículo:', e);
        showToast('Error al guardar: ' + e.message, 'err');
        statusEl.textContent = '';
    }
}

// Publicar
articleForm.addEventListener('submit', e => {
    e.preventDefault();
    saveArticle(true);
});
// Borrador
btnDraft.addEventListener('click', () => saveArticle(false));

// ── Delete ────────────────────────────────────────────────
let pendingDeleteId = null;
function confirmDelete(id, title) {
    pendingDeleteId = id;
    document.getElementById('confirm-msg').textContent = `Se eliminará "${title || 'este artículo'}". Esta acción no se puede deshacer.`;
    confirmOverlay.style.display = 'flex';
}
confirmCancel.addEventListener('click', () => {
    confirmOverlay.style.display = 'none';
    pendingDeleteId = null;
});
confirmOk.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    confirmOk.disabled = true;
    try {
        await deleteDoc(doc(db, 'articulos', pendingDeleteId));
        allArticles = allArticles.filter(a => a.id !== pendingDeleteId);
        applyFilters();
        showToast('Artículo eliminado');
    } catch(e) {
        showToast('Error al eliminar: ' + e.message, 'err');
    } finally {
        confirmOverlay.style.display = 'none';
        pendingDeleteId = null;
        confirmOk.disabled = false;
    }
});

// ── Init ──────────────────────────────────────────────────
updateCounters();
updateSerpPreview();
