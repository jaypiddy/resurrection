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
const showArchivedCheckbox = document.getElementById('show-archived-checkbox');
const resetAnalyticsBtn = document.getElementById('reset-analytics-btn');

// Analytics Elements
const analyticsSection = document.getElementById('analytics-section');
const statPageviews = document.getElementById('stat-pageviews');
const statTotaltime = document.getElementById('stat-totaltime');
const statAvgtime = document.getElementById('stat-avgtime');
const statClickPlay = document.getElementById('stat-click-play');
const statClickReel = document.getElementById('stat-click-reel');
const statClickSlop = document.getElementById('stat-click-slop');
const statClickAbout = document.getElementById('stat-click-about');
const statClickContact = document.getElementById('stat-click-contact');

// Tab Elements
const tabBtnAgencies = document.getElementById('tab-btn-agencies');
const tabBtnAnalytics = document.getElementById('tab-btn-analytics');
const tabAgencies = document.getElementById('tab-agencies');
const tabAnalytics = document.getElementById('tab-analytics');

// Global Analytics Elements
const globalPageviews = document.getElementById('global-pageviews');
const globalTotaltime = document.getElementById('global-totaltime');
const globalAvgtime = document.getElementById('global-avgtime');
const globalTopAgency = document.getElementById('global-top-agency');
const globalClickPlay = document.getElementById('global-click-play');
const globalClickReel = document.getElementById('global-click-reel');
const globalClickSlop = document.getElementById('global-click-slop');
const globalClickAbout = document.getElementById('global-click-about');
const globalClickContact = document.getElementById('global-click-contact');

let editingAgencyData = null;

function formatTime(seconds) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

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
  analyticsSection.classList.add('hidden');
  
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

  // Populate Analytics
  analyticsSection.classList.remove('hidden');
  const analyticsData = data.analytics || {};
  const pageViews = analyticsData.pageViews || 0;
  const totalTime = analyticsData.totalTimeSpent || 0;
  const avgTime = pageViews > 0 ? totalTime / pageViews : 0;
  
  statPageviews.textContent = pageViews;
  statTotaltime.textContent = formatTime(totalTime);
  statAvgtime.textContent = formatTime(avgTime);
  
  const clicks = analyticsData.clicks || {};
  statClickPlay.textContent = clicks.playVideoClicks || 0;
  statClickReel.textContent = clicks.showReelClicks || 0;
  statClickSlop.textContent = clicks.slopFreeClicks || 0;
  statClickAbout.textContent = clicks.aboutClicks || 0;
  statClickContact.textContent = clicks.contactClicks || 0;
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
  analyticsSection.classList.add('hidden');
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



// Tab Logic
tabBtnAgencies.addEventListener('click', () => {
  tabBtnAgencies.className = "bx--btn bx--btn--primary bx--btn--sm";
  tabBtnAnalytics.className = "bx--btn bx--btn--tertiary bx--btn--sm";
  tabAgencies.classList.remove('hidden');
  tabAnalytics.classList.add('hidden');
});

tabBtnAnalytics.addEventListener('click', () => {
  tabBtnAnalytics.className = "bx--btn bx--btn--primary bx--btn--sm";
  tabBtnAgencies.className = "bx--btn bx--btn--tertiary bx--btn--sm";
  tabAnalytics.classList.remove('hidden');
  tabAgencies.classList.add('hidden');
});

// Create Logic
showCreateBtn.addEventListener('click', showCreate);
cancelCreateBtn.addEventListener('click', showDashboard);

saveAgencyBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  try {
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
      } catch (err) {
        // Ignore invalid URL, save as is
      }
    }

    saveAgencyBtn.disabled = true;
    cancelCreateBtn.disabled = true;
    
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
    alert("SAVE ERROR: " + error.message);
    createError.textContent = error.message || "An unexpected error occurred.";
    createError.classList.remove('hidden');
    saveAgencyBtn.disabled = false;
    cancelCreateBtn.disabled = false;
  }
});

showArchivedCheckbox.addEventListener('change', loadAgencies);

resetAnalyticsBtn.addEventListener('click', async () => {
  if (!editingAgencyData) return;
  if (confirm("Are you sure you want to reset all analytics for this agency?")) {
    try {
      await updateDoc(doc(db, "agencies", editingAgencyData.slug), {
        analytics: {}
      });
      editingAgencyData.analytics = {};
      statPageviews.textContent = '0';
      statTotaltime.textContent = '0s';
      statAvgtime.textContent = '0s';
      statClickPlay.textContent = '0';
      statClickReel.textContent = '0';
      statClickSlop.textContent = '0';
      statClickAbout.textContent = '0';
      statClickContact.textContent = '0';
      alert("Analytics reset successfully.");
    } catch (err) {
      console.error("Error resetting analytics:", err);
      alert("Error resetting analytics: " + err.message);
    }
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
    
    let totalViews = 0;
    let totalSeconds = 0;
    let totalPlay = 0;
    let totalReel = 0;
    let totalSlop = 0;
    let totalAbout = 0;
    let totalContact = 0;
    
    let globalVideoMain = { start: 0, time: 0, 25: 0, 50: 0, 75: 0, 100: 0 };
    let globalVideoReel = { start: 0, time: 0, 25: 0, 50: 0, 75: 0, 100: 0 };
    
    let topAgencyName = "N/A";
    let highestViews = -1;
    let renderedCount = 0;
    
    const showArchived = showArchivedCheckbox.checked;
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Global Analytics Aggregation
      if (data.analytics) {
        const views = data.analytics.pageViews || 0;
        totalViews += views;
        totalSeconds += data.analytics.totalTimeSpent || 0;
        
        if (views > highestViews) {
          highestViews = views;
          topAgencyName = data.agencyName || "N/A";
        }
        
        if (data.analytics.clicks) {
          totalPlay += data.analytics.clicks.playVideoClicks || 0;
          totalReel += data.analytics.clicks.showReelClicks || 0;
          totalSlop += data.analytics.clicks.slopFreeClicks || 0;
          totalAbout += data.analytics.clicks.aboutClicks || 0;
          totalContact += data.analytics.clicks.contactClicks || 0;
        }
        
        if (data.analytics.video) {
          if (data.analytics.video.main) {
            globalVideoMain.start += data.analytics.video.main.start || 0;
            globalVideoMain.time += data.analytics.video.main.totalWatchTime || 0;
            globalVideoMain[25] += data.analytics.video.main['25'] || 0;
            globalVideoMain[50] += data.analytics.video.main['50'] || 0;
            globalVideoMain[75] += data.analytics.video.main['75'] || 0;
            globalVideoMain[100] += data.analytics.video.main['100'] || 0;
          }
          if (data.analytics.video.reel) {
            globalVideoReel.start += data.analytics.video.reel.start || 0;
            globalVideoReel.time += data.analytics.video.reel.totalWatchTime || 0;
            globalVideoReel[25] += data.analytics.video.reel['25'] || 0;
            globalVideoReel[50] += data.analytics.video.reel['50'] || 0;
            globalVideoReel[75] += data.analytics.video.reel['75'] || 0;
            globalVideoReel[100] += data.analytics.video.reel['100'] || 0;
          }
        }
      }
      
      const isArchived = data.archived === true;
      if (isArchived && !showArchived) {
        return; // skip rendering
      }
      
      const div = document.createElement('div');
      div.className = 'agency-card';
      
      const sanitizeHTML = (str) => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
      };
      
      const safeName = sanitizeHTML(data.agencyName);
      const safeSlug = sanitizeHTML(data.slug);
      
      div.innerHTML = `
        <div class="agency-card-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="flex: 1 1 auto; min-width: 0; padding-right: 1rem;">
            <h4 style="margin: 0; padding: 0; word-break: break-word; font-size: 1.25rem; font-weight: normal;">${safeName}</h4>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #525252; word-break: break-all;">/${safeSlug}</p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex: 0 0 auto; flex-wrap: wrap; align-items: center; justify-content: flex-end;">
            <a href="/${safeSlug}" target="_blank" style="color: #0f62fe; text-decoration: none; margin-right: 1rem; font-size: 0.875rem;">View Site</a>
            ${isArchived 
              ? `<button class="bx--btn bx--btn--sm bx--btn--primary unarchive-btn" data-slug="${safeSlug}">Unarchive</button>
                 <button class="bx--btn bx--btn--sm bx--btn--danger delete-btn" data-slug="${safeSlug}">Delete</button>`
              : `<button class="bx--btn bx--btn--sm bx--btn--secondary duplicate-btn" data-slug="${safeSlug}">Duplicate</button>
                 <button class="bx--btn bx--btn--sm bx--btn--tertiary edit-btn" data-slug="${safeSlug}">Edit</button>
                 <button class="bx--btn bx--btn--sm bx--btn--ghost archive-btn" data-slug="${safeSlug}">Archive</button>
                 <button class="bx--btn bx--btn--sm bx--btn--danger delete-btn" data-slug="${safeSlug}">Delete</button>`
            }
          </div>
        </div>
      `;
      agenciesList.appendChild(div);
      renderedCount++;
    });
    
    if (renderedCount === 0) {
      noAgencies.classList.remove('hidden');
    }
    
    // Populate Global Analytics UI
    globalPageviews.textContent = totalViews;
    globalTotaltime.textContent = formatTime(totalSeconds);
    globalAvgtime.textContent = formatTime(totalViews > 0 ? totalSeconds / totalViews : 0);
    globalTopAgency.textContent = highestViews > 0 ? topAgencyName : "N/A";
    
    globalClickPlay.textContent = totalPlay;
    globalClickReel.textContent = totalReel;
    globalClickSlop.textContent = totalSlop;
    globalClickAbout.textContent = totalAbout;
    globalClickContact.textContent = totalContact;
    
    const elGlobalMainStart = document.getElementById('global-video-main-start');
    if (elGlobalMainStart) {
      elGlobalMainStart.textContent = globalVideoMain.start;
      document.getElementById('global-video-main-time').textContent = formatTime(globalVideoMain.time);
      document.getElementById('global-video-main-25').textContent = globalVideoMain[25];
      document.getElementById('global-video-main-50').textContent = globalVideoMain[50];
      document.getElementById('global-video-main-75').textContent = globalVideoMain[75];
      document.getElementById('global-video-main-100').textContent = globalVideoMain[100];

      document.getElementById('global-video-reel-start').textContent = globalVideoReel.start;
      document.getElementById('global-video-reel-time').textContent = formatTime(globalVideoReel.time);
      document.getElementById('global-video-reel-25').textContent = globalVideoReel[25];
      document.getElementById('global-video-reel-50').textContent = globalVideoReel[50];
      document.getElementById('global-video-reel-75').textContent = globalVideoReel[75];
      document.getElementById('global-video-reel-100').textContent = globalVideoReel[100];
    }
    
    // Attach delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if(confirm("Are you sure you want to delete this agency?")) {
          const slug = e.currentTarget.dataset.slug;
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
        e.preventDefault();
        const slug = e.currentTarget.dataset.slug;
        const data = localAgenciesData[slug];
        if (data) showEdit(data);
      });
    });

    // Attach duplicate listeners
    document.querySelectorAll('.duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const slug = e.currentTarget.dataset.slug;
        const data = localAgenciesData[slug];
        if (data) showDuplicate(data);
      });
    });
    
    // Attach archive/unarchive listeners
    document.querySelectorAll('.archive-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const slug = e.currentTarget.dataset.slug;
        try {
          await updateDoc(doc(db, "agencies", slug), { archived: true });
          loadAgencies();
        } catch (error) {
          alert("Error archiving: " + error.message);
        }
      });
    });

    document.querySelectorAll('.unarchive-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const slug = e.currentTarget.dataset.slug;
        try {
          await updateDoc(doc(db, "agencies", slug), { archived: false });
          loadAgencies();
        } catch (error) {
          alert("Error unarchiving: " + error.message);
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
