const profileSelect = document.getElementById('profileSelect');
const continueBtn = document.getElementById('continueBtn');
const skipBtn = document.getElementById('skipBtn');
const newProfileNameEl = document.getElementById('newProfileName');
const masterInputEl = document.getElementById('masterInput');
const createProfileBtn = document.getElementById('createProfile');
const themeLightRadio = document.getElementById('themeLight');
const themeDarkRadio = document.getElementById('themeDark');

async function fetchProfiles() {
  try {
    const res = await fetch('/api/profiles');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load profiles');
    profileSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no profile)';
    profileSelect.appendChild(opt);
    (data.profiles || []).forEach(p => {
      const o = document.createElement('option');
      o.value = p.name;
      o.textContent = p.name;
      profileSelect.appendChild(o);
    });
  } catch (e) {
    console.warn(e.message);
  }
}

continueBtn.addEventListener('click', () => {
  const selected = profileSelect.value;
  if (selected) {
    localStorage.setItem('regexAssistant.profile', selected);
  } else {
    localStorage.removeItem('regexAssistant.profile');
  }
  window.location.href = '/index.html';
});

skipBtn.addEventListener('click', () => {
  localStorage.removeItem('regexAssistant.profile');
  window.location.href = '/index.html';
});

createProfileBtn.addEventListener('click', async () => {
  const name = newProfileNameEl.value.trim();
  const master = masterInputEl.value;
  if (!name || !master) { alert('Enter name and master password'); return; }
  try {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, master })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create profile');
    newProfileNameEl.value = '';
    masterInputEl.value = '';
    await fetchProfiles();
    profileSelect.value = data.profile.name;
  } catch (e) {
    alert(e.message);
  }
});

fetchProfiles();

// Theme
applySavedTheme();
applyThemeControls();
function applySavedTheme() {
  const theme = localStorage.getItem('regexAssistant.theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function applyThemeControls() {
  const current = localStorage.getItem('regexAssistant.theme') || 'light';
  if (themeLightRadio) themeLightRadio.checked = current === 'light';
  if (themeDarkRadio) themeDarkRadio.checked = current === 'dark';

  [themeLightRadio, themeDarkRadio].forEach(ctrl => {
    ctrl?.addEventListener('change', (e) => {
      const to = e.target.value;
      const rect = e.target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const overlay = document.createElement('div');
      overlay.className = `theme-overlay ${to}`;
      overlay.style.setProperty('--tx', `${cx}px`);
      overlay.style.setProperty('--ty', `${cy}px`);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('animate'));

      overlay.addEventListener('animationend', () => {
        document.documentElement.setAttribute('data-theme', to);
        localStorage.setItem('regexAssistant.theme', to);
        overlay.remove();
      }, { once: true });
    });
  });
}


