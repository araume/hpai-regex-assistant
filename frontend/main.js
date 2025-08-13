const instructionEl = document.getElementById('instruction');
const activeProfileSpan = document.getElementById('activeProfile');
const changeProfileBtn = document.getElementById('changeProfileBtn');
const exampleInputEl = document.getElementById('exampleInput');
const addExampleBtn = document.getElementById('addExample');
const examplesList = document.getElementById('examples');
const languageEl = document.getElementById('language');
const generateBtn = document.getElementById('generate');

const resultCard = document.getElementById('resultCard');
const logsCard = document.getElementById('logsCard');
const logsUl = document.getElementById('logs');
const patternPre = document.getElementById('pattern');
const flagsPre = document.getElementById('flags');
const explanationPre = document.getElementById('explanation');
const matchesUl = document.getElementById('matches');
const nonMatchesUl = document.getElementById('nonMatches');
const testTextEl = document.getElementById('testText');
const testBtn = document.getElementById('testBtn');
const copyBtn = document.getElementById('copyBtn');
const testResultPre = document.getElementById('testResult');

let examples = [];
let currentProfile = localStorage.getItem('regexAssistant.profile') || '';

function renderExamples(){
  examplesList.innerHTML = '';
  examples.forEach((ex, idx) => {
    const li = document.createElement('li');
    li.textContent = ex;
    const rm = document.createElement('button');
    rm.textContent = '×';
    rm.addEventListener('click', () => {
      examples = examples.filter((_, i) => i !== idx);
      renderExamples();
    });
    li.appendChild(rm);
    examplesList.appendChild(li);
  });
}

addExampleBtn.addEventListener('click', () => {
  const v = exampleInputEl.value.trim();
  if (v) {
    examples.push(v);
    exampleInputEl.value = '';
    renderExamples();
  }
});

function showProfile() {
  activeProfileSpan.textContent = currentProfile ? `Active profile: ${currentProfile}` : 'No profile selected';
}

async function refreshLogs() {
  logsUl.innerHTML = '';
  if (!currentProfile) { logsCard.hidden = true; return; }
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(currentProfile)}/logs`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load logs');
    (data.logs || []).slice(0, 20).forEach(l => {
      const li = document.createElement('li');
      li.textContent = `${new Date(l.createdAt).toLocaleString()} — ${l.instruction}`;
      logsUl.appendChild(li);
    });
    logsCard.hidden = false;
  } catch (e) {
    console.warn(e.message);
  }
}

changeProfileBtn.addEventListener('click', () => {
  window.location.href = '/profile.html';
});

// initial
showProfile();
refreshLogs();

generateBtn.addEventListener('click', async () => {
  const instruction = instructionEl.value.trim();
  if (!instruction) {
    alert('Please provide an instruction.');
    return;
  }
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  try {
    const res = await fetch('/api/generate-regex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction, examples, language: languageEl.value, profileName: currentProfile })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');

    const ex = data.extracted || {};
    patternPre.textContent = ex.regex || '(no pattern)';
    flagsPre.textContent = ex.flags || '';
    explanationPre.textContent = ex.explanation || '';

    matchesUl.innerHTML = '';
    (ex.sampleMatches || []).forEach((m) => {
      const li = document.createElement('li');
      li.textContent = m;
      matchesUl.appendChild(li);
    });
    nonMatchesUl.innerHTML = '';
    (ex.sampleNonMatches || []).forEach((m) => {
      const li = document.createElement('li');
      li.textContent = m;
      nonMatchesUl.appendChild(li);
    });
    resultCard.hidden = false;
    await refreshLogs();
  } catch (e) {
    alert(e.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Regex';
  }
});

testBtn.addEventListener('click', () => {
  const pattern = patternPre.textContent.trim();
  if (!pattern || pattern === '(no pattern)') {
    testResultPre.textContent = 'No pattern available.';
    return;
  }
  const flags = flagsPre.textContent.trim();
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    testResultPre.textContent = 'Invalid regex: ' + e.message;
    return;
  }
  const text = testTextEl.value;
  const matches = text.match(re);
  if (!matches) {
    testResultPre.textContent = 'No matches';
  } else {
    testResultPre.textContent = JSON.stringify(matches, null, 2);
  }
});

copyBtn.addEventListener('click', async () => {
  const pattern = patternPre.textContent;
  const flags = flagsPre.textContent;
  const combined = `/${pattern}/${flags}`;
  try {
    await navigator.clipboard.writeText(combined);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy Pattern'), 1000);
  } catch {
    alert('Copy failed');
  }
});


