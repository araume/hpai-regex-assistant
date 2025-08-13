const profileSelect = document.getElementById('profileSelect');
const continueBtn = document.getElementById('continueBtn');
const skipBtn = document.getElementById('skipBtn');
const newProfileNameEl = document.getElementById('newProfileName');
const masterInputEl = document.getElementById('masterInput');
const createProfileBtn = document.getElementById('createProfile');

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


