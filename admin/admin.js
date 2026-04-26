import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

let app, db, storage, auth;

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const createContainer = document.getElementById('create-container');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const showCreateBtn = document.getElementById('show-create-btn');
const agenciesList = document.getElementById('agencies-list');
const noAgencies = document.getElementById('no-agencies');

const agencyNameInput = document.getElementById('agency-name');
const agencySlugInput = document.getElementById('agency-slug');
const videoFileInput = document.getElementById('video-file');
const fileNameDisplay = document.getElementById('file-name-display');

const saveAgencyBtn = document.getElementById('save-agency-btn');
const cancelCreateBtn = document.getElementById('cancel-create-btn');
const createError = document.getElementById('create-error');

const progressContainer = document.getElementById('upload-progress-container');
const progressBar = document.getElementById('upload-progress');
const progressText = document.getElementById('progress-text');

let selectedFile = null;

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
  agencyNameInput.value = '';
  agencySlugInput.value = '';
  videoFileInput.value = '';
  selectedFile = null;
  fileNameDisplay.textContent = "No file selected";
  createError.classList.add('hidden');
  progressContainer.classList.add('hidden');
  
  // Auto-slug generation
  agencyNameInput.addEventListener('input', (e) => {
    // Only auto-fill if slug is empty or matches previous auto-fill
    const slugified = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    agencySlugInput.value = slugified;
  });
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

logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

// File Selection
videoFileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    selectedFile = e.target.files[0];
    fileNameDisplay.textContent = selectedFile.name;
  } else {
    selectedFile = null;
    fileNameDisplay.textContent = "No file selected";
  }
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
  
  if (!selectedFile) {
    createError.textContent = "Please select a video file.";
    createError.classList.remove('hidden');
    return;
  }
  
  saveAgencyBtn.disabled = true;
  cancelCreateBtn.disabled = true;
  progressContainer.classList.remove('hidden');
  
  try {
    // 1. Upload Video
    const storageRef = ref(storage, `agency-videos/${slug}_${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);
    
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressBar.value = progress;
        progressText.textContent = `Uploading Video... ${Math.round(progress)}%`;
      }, 
      (error) => {
        throw error;
      }, 
      async () => {
        // 2. Get URL and Save to Firestore
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        await setDoc(doc(db, "agencies", slug), {
          agencyName: name,
          slug: slug,
          videoUrl: downloadURL,
          videoPath: storageRef.fullPath, // Keep path so we can delete it later
          createdAt: new Date().toISOString()
        });
        
        saveAgencyBtn.disabled = false;
        cancelCreateBtn.disabled = false;
        showDashboard();
      }
    );
  } catch (error) {
    console.error("Save Error:", error);
    createError.textContent = error.message;
    createError.classList.remove('hidden');
    saveAgencyBtn.disabled = false;
    cancelCreateBtn.disabled = false;
    progressContainer.classList.add('hidden');
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
      
      div.innerHTML = `
        <div>
          <h4 style="margin: 0; padding: 0;">${data.agencyName}</h4>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #525252;">/${data.slug}</p>
        </div>
        <div style="display: flex; gap: 1rem;">
          <a href="/${data.slug}" target="_blank" class="bx--btn bx--btn--sm bx--btn--ghost">View Site</a>
          <button class="bx--btn bx--btn--sm bx--btn--danger delete-btn" data-slug="${data.slug}" data-path="${data.videoPath || ''}">Delete</button>
        </div>
      `;
      agenciesList.appendChild(div);
    });
    
    // Attach delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if(confirm("Are you sure you want to delete this agency?")) {
          const slug = e.target.dataset.slug;
          const videoPath = e.target.dataset.path;
          
          try {
            await deleteDoc(doc(db, "agencies", slug));
            if (videoPath) {
              await deleteObject(ref(storage, videoPath)).catch(err => console.warn("Could not delete video:", err));
            }
            loadAgencies();
          } catch (error) {
            alert("Error deleting: " + error.message);
          }
        }
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
