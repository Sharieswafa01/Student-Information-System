// script.js
let xmlDoc = null; // XMLDocument in memory
let filters = { search: '', course: 'all', honorOnly: false };
let showingAll = false; // toggle for showing all students

// Toggle this to true to enable automatic persistence to save.php
const ENABLE_PERSISTENCE = true;
const SAVE_URL = 'save.php';
const SAVE_TIMEOUT_MS = 10000; // 10 seconds

const tableBody = document.querySelector('#studentsTable tbody');
const searchInput = document.getElementById('searchInput');
const honorBtn = document.getElementById('honorBtn');
const courseSelect = document.getElementById('courseSelect');
const reloadBtn = document.getElementById('reloadBtn');
const addForm = document.getElementById('addForm');
const editForm = document.getElementById('editForm');
const editSelect = document.getElementById('editSelect');
const toggleBtn = document.getElementById('toggleBtn');

async function loadXML() {
  try {
    const res = await fetch('students.xml', { cache: "no-store" });
    const text = await res.text();
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(text, 'application/xml');
    if (xmlDoc.querySelector('parsererror')) throw new Error('XML parse error');
    refreshUI();
  } catch (err) {
    alert('Failed to load students.xml: ' + err.message);
    console.error(err);
  }
}

function getStudentNodes() {
  return Array.from(xmlDoc.getElementsByTagName('student'));
}

function studentToObject(node) {
  return {
    id: node.getAttribute('id'),
    name: (node.getElementsByTagName('name')[0]?.textContent || '').trim(),
    course: (node.getElementsByTagName('course')[0]?.textContent || '').trim(),
    grade: Number(node.getElementsByTagName('grade')[0]?.textContent || 0),
    node
  };
}

function applyFilters(student) {
  if (filters.search && !student.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
  if (filters.course !== 'all' && student.course !== filters.course) return false;
  if (filters.honorOnly && student.grade < 85) return false;
  return true;
}

function renderTable() {
  tableBody.innerHTML = '';
  const students = getStudentNodes().map(studentToObject);

  students.forEach((s, i) => {
    if (!applyFilters(s)) return;
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.course)}</td>
      <td>${s.grade}</td>
      <td class="actions">
        <button data-id="${s.id}" class="edit-row">Edit</button>
        <button data-id="${s.id}" class="delete-row">Delete</button>
      </td>
    `;

    // Hide rows beyond 6 if toggle is off
    if (i >= 6 && !showingAll) tr.style.display = 'none';

    tableBody.appendChild(tr);
  });

  // attach event listeners for edit/delete buttons
  document.querySelectorAll('.edit-row').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const student = students.find(x => x.id === id);
      if (!student) return alert('Student not found');
      const newGrade = prompt(`Update grade for ${student.name} (${student.id})`, student.grade);
      if (newGrade === null) return;
      const gradeNum = Number(newGrade);
      if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) return alert('Invalid grade');
      updateStudentGrade(id, gradeNum);
    };
  });

  document.querySelectorAll('.delete-row').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (!confirm('Delete student ' + id + '?')) return;
      deleteStudentById(id);
    };
  });
}

// Toggle extra rows
toggleBtn.addEventListener('click', () => {
  showingAll = !showingAll;
  renderTable();
  toggleBtn.textContent = showingAll ? '▲ Hide Extra' : '▼ Show All';
});

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function refreshUI() {
  populateCourseDropdown();
  populateEditSelect();
  renderTable();
}

function populateCourseDropdown() {
  const courses = new Set();
  getStudentNodes().forEach(n => {
    const c = n.getElementsByTagName('course')[0]?.textContent?.trim();
    if (c) courses.add(c);
  });
  const cur = courseSelect.value || 'all';
  courseSelect.innerHTML = '<option value="all">All Courses</option>';
  Array.from(courses).sort().forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c; courseSelect.appendChild(o);
  });
  if ([...courseSelect.options].some(o => o.value === cur)) courseSelect.value = cur;
}

function populateEditSelect() {
  editSelect.innerHTML = '';
  getStudentNodes().forEach(n => {
    const id = n.getAttribute('id');
    const name = n.getElementsByTagName('name')[0]?.textContent || '';
    const o = document.createElement('option'); o.value = id; o.textContent = `${id} — ${name}`;
    editSelect.appendChild(o);
  });
}

function updateStudentGrade(id, newGrade) {
  const node = Array.from(xmlDoc.getElementsByTagName('student')).find(x => x.getAttribute('id') === id);
  if (!node) return;
  const gradeNode = node.getElementsByTagName('grade')[0];
  if (gradeNode) gradeNode.textContent = String(newGrade);
  else {
    const g = xmlDoc.createElement('grade'); g.textContent = String(newGrade); node.appendChild(g);
  }
  refreshUI();
  saveToServerIfWanted().then(success => {
    if (!success) console.warn('Saving to server failed (update).');
  });
}

function deleteStudentById(id) {
  const root = xmlDoc.documentElement;
  const node = Array.from(root.getElementsByTagName('student')).find(x => x.getAttribute('id') === id);
  if (node) {
    root.removeChild(node);
    refreshUI();
    saveToServerIfWanted().then(success => {
      if (!success) console.warn('Saving to server failed (delete).');
    });
  }
}

function generateNewId() {
  const nodes = getStudentNodes();
  let max = 0;
  nodes.forEach(n => {
    const id = n.getAttribute('id') || '';
    const m = id.match(/\d+$/);
    if (m) max = Math.max(max, Number(m[0]));
  });
  return 'S' + String(max + 1).padStart(3, '0');
}

// Add student
addForm.onsubmit = (e) => {
  e.preventDefault();
  const name = document.getElementById('addName').value.trim();
  const course = document.getElementById('addCourse').value.trim();
  const grade = Number(document.getElementById('addGrade').value);
  if (!name || !course || isNaN(grade)) return alert('Please fill inputs correctly');

  const student = xmlDoc.createElement('student');
  const id = generateNewId();
  student.setAttribute('id', id);
  const n = xmlDoc.createElement('name'); n.textContent = name; student.appendChild(n);
  const c = xmlDoc.createElement('course'); c.textContent = course; student.appendChild(c);
  const g = xmlDoc.createElement('grade'); g.textContent = String(grade); student.appendChild(g);

  xmlDoc.documentElement.appendChild(student);
  addForm.reset();
  refreshUI();
  saveToServerIfWanted().then(success => {
    if (!success) console.warn('Saving to server failed (add).');
  });
};

// Edit student
editForm.onsubmit = (e) => {
  e.preventDefault();
  const id = editSelect.value;
  const grade = Number(document.getElementById('editGrade').value);
  if (!id || isNaN(grade)) return alert('Select student and valid grade');
  updateStudentGrade(id, grade);
  editForm.reset();
};

// Search
searchInput.addEventListener('input', () => {
  filters.search = searchInput.value.trim();
  renderTable();
});

// Honor toggle
honorBtn.addEventListener('click', () => {
  filters.honorOnly = !filters.honorOnly;
  honorBtn.textContent = filters.honorOnly ? 'Show All Students' : 'Show Honor Students (≥85)';
  renderTable();
});

// Course filter
courseSelect.addEventListener('change', () => {
  filters.course = courseSelect.value;
  renderTable();
});

// Reload XML
reloadBtn.addEventListener('click', () => loadXML());

// Save to server
async function saveToServerIfWanted(force = false, showError = true) {
  if (!ENABLE_PERSISTENCE && !force) return false;
  if (!xmlDoc) {
    if (showError) alert('No XML loaded to save.');
    return false;
  }

  const xmlString = new XMLSerializer().serializeToString(xmlDoc);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);

    const res = await fetch(SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      body: xmlString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const serverText = await res.text().catch(() => res.statusText || 'No response text');
      if (showError) alert('Failed to save to server: ' + (res.statusText || res.status));
      return false;
    }

    console.log('Saved XML to server successfully.');
    return true;
  } catch (err) {
    if (err.name === 'AbortError') {
      if (showError) alert('Save to server timed out.');
      return false;
    } else {
      if (showError) alert('Save to server error: ' + (err.message || err));
      return false;
    }
  }
}

// Initial load
loadXML();

