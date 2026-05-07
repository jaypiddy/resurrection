import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

let app, db, storage, auth;

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const createContainer = document.getElementById('create-container');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const showCreateBtn = document.getElementById('show-create-btn');
const agenciesList = document.getElementById('agencies-list');
const noAgencies = document.getElementById('no-agencies');

const agencyNameInput = document.getElementById('agency-name');
const agencySlugInput = document.getElementById('agency-slug');
const cfStreamDomainInput = document.getElementById('cf-stream-domain');
const loaderVideoIdInput = document.getElementById('loader-video-id');
const mainVideoIdInput = document.getElementById('main-video-id');
const reelVideoIdInput = document.getElementById('reel-video-id');

const saveAgencyBtn = document.getElementById('save-agency-btn');
const cancelCreateBtn = document.getElementById('cancel-create-btn');
const createError = document.getElementById('create-error');

const formHeading = document.getElementById('form-heading');

let editingAgencyData = null;

// Initialize
async function init() {
  try {
    const response = await fetch('/__/firebase/init.json');
    if (!response.ok) throw new Error("Could not fetch init.json");
    const config = await response.json();
    app = initializeApp(config);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    
    // Auth Listener
    onAuthStateChanged(auth, (user) => {
      if (user) {
        showDashboard();
      } else {
        showLogin();
      }
    });
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
    loginError.textContent = "Error connecting to Firebase. Ensure you are running via Firebase Hosting.";
    loginError.classList.remove('hidden');
  }
}

// Navigation
function showLogin() {
  loginContainer.classList.remove('hidden');
  dashboardContainer.classList.add('hidden');
  createContainer.classList.add('hidden');
}

function showDashboard() {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');
  createContainer.classList.add('hidden');
  loadAgencies();
}

function showCreate() {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.add('hidden');
  createContainer.classList.remove('hidden');
  
  // Reset Form
  formHeading.textContent = "Create New Agency Instance";
  agencyNameInput.value = '';
  agencySlugInput.value = '';
  agencySlugInput.disabled = false;
  cfStreamDomainInput.value = '';
  loaderVideoIdInput.value = '';
  mainVideoIdInput.value = '';
  reelVideoIdInput.value = '';
  editingAgencyData = null;
  createError.classList.add('hidden');
  
  // Auto-slug generation
  agencyNameInput.addEventListener('input', autoSlugGenerator);
}

function autoSlugGenerator(e) {
  if (!editingAgencyData) {
    const slugified = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    agencySlugInput.value = slugified;
  }
}

function showEdit(data) {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.add('hidden');
  createContainer.classList.remove('hidden');
  
  formHeading.textContent = `Edit Agency: ${data.agencyName}`;
  agencyNameInput.value = data.agencyName;
  agencySlugInput.value = data.slug;
  agencySlugInput.disabled = true;
  agencyNameInput.removeEventListener('input', autoSlugGenerator);
  
  cfStreamDomainInput.value = data.cfStreamDomain || '';
  loaderVideoIdInput.value = data.loaderVideoId || '';
  mainVideoIdInput.value = data.mainVideoId || '';
  reelVideoIdInput.value = data.reelVideoId || '';

  editingAgencyData = data;
  createError.classList.add('hidden');
}

function showDuplicate(data) {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.add('hidden');
  createContainer.classList.remove('hidden');
  
  formHeading.textContent = `Duplicate Agency: ${data.agencyName}`;
  agencyNameInput.value = '';
  agencySlugInput.value = '';
  agencySlugInput.disabled = false;
  agencyNameInput.addEventListener('input', autoSlugGenerator);
  
  cfStreamDomainInput.value = data.cfStreamDomain || '';
  loaderVideoIdInput.value = data.loaderVideoId || '';
  mainVideoIdInput.value = data.mainVideoId || '';
  reelVideoIdInput.value = data.reelVideoId || '';

  editingAgencyData = null; // Important: Treat this as a new record
  createError.classList.add('hidden');
}

// Auth Logic
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  loginError.classList.add('hidden');
  loginBtn.textContent = "Logging in...";
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.textContent = "Log In";
  }
});

forgotPasswordBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  loginError.classList.add('hidden');
  
  if (!email) {
    loginError.textContent = "Please enter your email address above to reset your password.";
    loginError.style.color = "#da1e28";
    loginError.classList.remove('hidden');
    return;
  }
  
  forgotPasswordBtn.textContent = "Sending...";
  try {
    await sendPasswordResetEmail(auth, email);
    loginError.textContent = "Password reset email sent! Check your inbox.";
    loginError.style.color = "#24a148"; // Success color
    loginError.classList.remove('hidden');
  } catch (error) {
    loginError.textContent = error.message;
    loginError.style.color = "#da1e28";
    loginError.classList.remove('hidden');
  } finally {
    forgotPasswordBtn.textContent = "Forgot Password?";
  }
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});

logoutBtn.addEventListener('click', () => {
  signOut(auth);
});



// Create Logic
showCreateBtn.addEventListener('click', showCreate);
cancelCreateBtn.addEventListener('click', showDashboard);

saveAgencyBtn.addEventListener('click', async () => {
  const name = agencyNameInput.value.trim();
  const slug = agencySlugInput.value.trim();
  
  createError.classList.add('hidden');
  
  if (!name || !slug) {
    createError.textContent = "Name and Slug are required.";
    createError.classList.remove('hidden');
    return;
  }
  
  const cfStreamDomainRaw = cfStreamDomainInput.value.trim();
  const loaderVideoId = loaderVideoIdInput.value.trim();
  let mainVideoId = mainVideoIdInput.value.trim();
  const reelVideoId = reelVideoIdInput.value.trim();
  
  let cfStreamDomain = cfStreamDomainRaw;
  if (cfStreamDomain.startsWith('http')) {
    try {
      const url = new URL(cfStreamDomain);
      cfStreamDomain = url.hostname;
      
      // Attempt to extract video ID from the path e.g., /<video_id>/manifest/video.m3u8
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && !mainVideoId) {
        mainVideoId = pathParts[0]; // First part of path is the video ID
      }
    } catch (e) {
      // Ignore invalid URL, save as is
    }
  }

  saveAgencyBtn.disabled = true;
  cancelCreateBtn.disabled = true;
  
  try {
    const payload = {
      agencyName: name,
      cfStreamDomain: cfStreamDomain || null,
      loaderVideoId: loaderVideoId || null,
      mainVideoId: mainVideoId || null,
      reelVideoId: reelVideoId || null,
    };

    if (editingAgencyData) {
      await updateDoc(doc(db, "agencies", slug), payload);
    } else {
      payload.slug = slug;
      payload.createdAt = new Date().toISOString();
      await setDoc(doc(db, "agencies", slug), payload);
    }
    
    saveAgencyBtn.disabled = false;
    cancelCreateBtn.disabled = false;
    showDashboard();
  } catch (error) {
    console.error("Save Error:", error);
    createError.textContent = error.message;
    createError.classList.remove('hidden');
    saveAgencyBtn.disabled = false;
    cancelCreateBtn.disabled = false;
  }
});

// Load Dashboard Data
async function loadAgencies() {
  agenciesList.innerHTML = '';
  noAgencies.classList.add('hidden');
  
  try {
    const querySnapshot = await getDocs(collection(db, "agencies"));
    if (querySnapshot.empty) {
      noAgencies.classList.remove('hidden');
      return;
    }
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = 'agency-card';
      
      const sanitizeHTML = (str) => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
      };
      
      const safeName = sanitizeHTML(data.agencyName);
      const safeSlug = sanitizeHTML(data.slug);
      const safePath = sanitizeHTML(data.videoPath || '');
      
      div.innerHTML = `
        <div>
          <h4 style="margin: 0; padding: 0;">${safeName}</h4>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #525252;">/${safeSlug}</p>
        </div>
        <div style="display: flex; gap: 1rem;">
          <a href="/${safeSlug}" target="_blank" class="bx--btn bx--btn--sm bx--btn--ghost">View Site</a>
          <button class="bx--btn bx--btn--sm bx--btn--secondary duplicate-btn" data-slug="${safeSlug}">Duplicate</button>
          <button class="bx--btn bx--btn--sm bx--btn--tertiary edit-btn" data-slug="${safeSlug}">Edit</button>
          <button class="bx--btn bx--btn--sm bx--btn--danger delete-btn" data-slug="${safeSlug}">Delete</button>
        </div>
      `;
      agenciesList.appendChild(div);
    });
    
    // Attach delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if(confirm("Are you sure you want to delete this agency?")) {
          const slug = e.target.dataset.slug;
          try {
            await deleteDoc(doc(db, "agencies", slug));
            loadAgencies();
          } catch (error) {
            alert("Error deleting: " + error.message);
          }
        }
      });
    });
    
    // Attach edit listeners
    const localAgenciesData = {};
    querySnapshot.forEach(docSnap => localAgenciesData[docSnap.data().slug] = docSnap.data());
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slug = e.target.dataset.slug;
        const data = localAgenciesData[slug];
        if (data) showEdit(data);
      });
    });

    // Attach duplicate listeners
    document.querySelectorAll('.duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slug = e.target.dataset.slug;
        const data = localAgenciesData[slug];
        if (data) showDuplicate(data);
      });
    });
    
  } catch (error) {
    console.error("Error loading agencies:", error);
    const p = document.createElement('p');
    p.textContent = "Error loading agencies. Check your Firestore rules.";
    p.style.color = "red";
    agenciesList.appendChild(p);
  }
}

init();
