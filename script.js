// MOCK EHR DATABASE (with new patient IDs for scheduled arrivals)
    const ehrRecords = {
        "p1": { name: "Ruth Garrett", allergies: ["Penicillin (rash)", "Sulfa drugs"], medications: ["Lisinopril 10mg daily", "Atorvastatin 20mg nightly"], recentVisits: ["2025-04-15: Hypertension follow-up, BP 148/90", "2025-03-20: Lipid panel, LDL 130"], labResults: ["04/15: LDL 115", "Creatinine 0.9"], careTeam: ["Dr. Aris", "Elena"] },
        "p2": { name: "Dennis Okonkwo", allergies: ["None"], medications: ["Ibuprofen 400mg PRN", "Metformin 500mg BID"], recentVisits: ["2025-04-10: Knee pain follow-up", "2025-03-01: Annual physical"], labResults: ["A1c 6.1", "Vitamin D 28"], careTeam: ["Dr. Aris", "Physical Therapy"] },
        "p3": { name: "J. Miller", allergies: ["None"], medications: [], recentVisits: ["2025-04-20: Skin biopsy scheduled"], labResults: ["Pathology pending"], careTeam: ["Dr. Aris"] },
        "p4": { name: "Eleanor Hughes", allergies: ["Shellfish (hives)"], medications: ["Levothyroxine 50mcg daily", "Losartan 25mg"], recentVisits: ["2025-04-12: Hypothyroidism follow-up", "2025-03-25: BP check"], labResults: ["TSH 2.1 (normal)", "BMP normal"], careTeam: ["Dr. Aris"] },
        "p5": { name: "George Baxter", allergies: ["NSAIDs (stomach upset)"], medications: ["Metoprolol 25mg", "Aspirin 81mg"], recentVisits: ["2025-04-18: Hypertension follow-up", "2025-04-01: Lipid panel"], labResults: ["LDL 95", "Triglycerides 150"], careTeam: ["Dr. Aris", "Cardiology"] },
        "p6": { name: "Mildred Shaw", allergies: ["Codeine (nausea)"], medications: ["Albuterol inhaler PRN", "Omeprazole 20mg"], recentVisits: ["2025-04-14: Asthma follow-up", "2025-03-10: GERD assessment"], labResults: ["Peak flow 85%", "Chest X-ray clear"], careTeam: ["Dr. Aris"] }
    };

    // Scheduled arrivals (NOT checked in) - distinct names
    let notCheckedIn = [
        { id: "p4", name: "Eleanor Hughes", waitStart: null, alert: false },
        { id: "p5", name: "George Baxter", waitStart: null, alert: false },
        { id: "p6", name: "Mildred Shaw", waitStart: null, alert: false }
    ];
    let checkedInWaiting = []; // will be populated after check-in

    // Existing rooms (with patients already assigned)
    let rooms = [
        { id: 1, name: "Exam 1", status: "clean", patient: null, patientId: null, statusLabel: "Clean/Ready", shapeSym: "◆", readyTimerStart: null, readyAlert: false },
        { id: 2, name: "Exam 2", status: "in-progress", patient: { name: "Ruth Garrett", age: 72, complaint: "Shortness of breath", bp: "158/92", temp: "98.2", weight: "165" }, patientId: "p1", statusLabel: "In Progress", shapeSym: "▲", readyTimerStart: null, readyAlert: false },
        { id: 3, name: "Exam 3", status: "ready", patient: { name: "Dennis Okonkwo", age: 58, complaint: "Knee pain follow-up", bp: "132/85", temp: "98.6", weight: "210" }, patientId: "p2", statusLabel: "Ready for MD", shapeSym: "■", readyTimerStart: Date.now() - 400000, readyAlert: true },
        { id: 4, name: "Exam 4", status: "clean", patient: null, patientId: null, statusLabel: "Clean/Ready", shapeSym: "◆", readyTimerStart: null, readyAlert: false },
        { id: 5, name: "Exam 5", status: "clean", patient: null, patientId: null, statusLabel: "Clean/Ready", shapeSym: "◆", readyTimerStart: null, readyAlert: false },
        { id: 6, name: "Procedure Room", status: "procedure", patient: { name: "J. Miller", age: 44, complaint: "Skin biopsy", bp: "125/78", temp: "98.4", weight: "180" }, patientId: "p3", statusLabel: "Procedure", shapeSym: "✦", readyTimerStart: null, readyAlert: false }
    ];

    let lastAction = null;
    const statusOrder = ["ready", "in-progress", "clean", "dirty", "procedure"];
    const statusDisplayNames = {
        clean: "Clean / Ready", "in-progress": "In Progress", ready: "Ready for MD", dirty: "Dirty", procedure: "Procedure"
    };
    const statusList = ["clean", "dirty", "in-progress", "ready", "procedure"];

    function updateTimers() {
        const CHECKIN_WAIT_THRESHOLD = 15 * 60 * 1000;
        const READY_WAIT_THRESHOLD = 5 * 60 * 1000;
        const now = Date.now();
        checkedInWaiting.forEach(p => {
            if (p.checkinTime && (now - p.checkinTime) > CHECKIN_WAIT_THRESHOLD) p.alert = true;
            else p.alert = false;
        });
        rooms.forEach(room => {
            if (room.status === 'ready') {
                if (!room.readyTimerStart) room.readyTimerStart = Date.now();
                room.readyAlert = (Date.now() - room.readyTimerStart) > READY_WAIT_THRESHOLD;
            } else {
                room.readyTimerStart = null;
                room.readyAlert = false;
            }
        });
        renderAll();
    }

    function renderAll() { renderLobbySections(); renderGroupedRooms(); }

    function renderLobbySections() {
        const notCheckedInDiv = document.getElementById('notCheckedInList');
        const checkedInDiv = document.getElementById('checkedInWaitingList');
        notCheckedInDiv.innerHTML = '';
        checkedInDiv.innerHTML = '';

        notCheckedIn.forEach(p => {
            const row = document.createElement('div'); row.className = 'patient-row';
            row.innerHTML = `<div class="patient-info">${p.name}</div>
                <button class="checkin-btn" data-id="${p.id}">Check In</button>`;
            notCheckedInDiv.appendChild(row);
        });
        checkedInWaiting.forEach(p => {
            const row = document.createElement('div'); row.className = 'patient-row';
            const alertIcon = p.alert ? '<span class="wait-alert-icon">⚠️</span>' : '';
            const waitTime = p.checkinTime ? Math.floor((Date.now() - p.checkinTime) / 60000) : 0;
            row.innerHTML = `<div class="patient-info">${alertIcon} ${p.name} <span style="font-size:0.7rem;">(waited ${waitTime} min)</span></div>
                <button class="room-btn" data-id="${p.id}">Assign to Room</button>`;
            checkedInDiv.appendChild(row);
        });
    }

    // Event delegation for check-in and assign buttons
    document.getElementById('notCheckedInList').addEventListener('click', (e) => {
        const btn = e.target.closest('.checkin-btn');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const patient = notCheckedIn.find(p => p.id === id);
        if (patient) {
            notCheckedIn = notCheckedIn.filter(p => p.id !== id);
            checkedInWaiting.push({ id: patient.id, name: patient.name, checkinTime: Date.now(), alert: false });
            showToast(`Checked in ${patient.name}`);
            lastAction = { type: 'checkin', patient: patient };
            renderAll();
        }
    });

    document.getElementById('checkedInWaitingList').addEventListener('click', (e) => {
        const btn = e.target.closest('.room-btn');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const patient = checkedInWaiting.find(p => p.id === id);
        if (patient) {
            const cleanRoom = rooms.find(r => r.status === 'clean');
            if (cleanRoom) {
                // Assign patient to clean room
                cleanRoom.status = 'in-progress';
                const ehr = ehrRecords[patient.id] || {};
                cleanRoom.patient = {
                    name: patient.name,
                    age: (patient.id === 'p4' ? 68 : (patient.id === 'p5' ? 62 : 74)),
                    complaint: "Check-in / roomed",
                    bp: "N/A", temp: "N/A", weight: "N/A"
                };
                cleanRoom.patientId = patient.id;
                cleanRoom.statusLabel = "In Progress";
                cleanRoom.shapeSym = "▲";
                cleanRoom.readyTimerStart = null;
                cleanRoom.readyAlert = false;
                checkedInWaiting = checkedInWaiting.filter(p => p.id !== id);
                showToast(`${patient.name} assigned to ${cleanRoom.name}`);
                lastAction = { type: 'roomAssign', patient: patient, roomId: cleanRoom.id };
                renderAll();
                showSnapshot(cleanRoom);
            } else {
                showToast("No clean room available – please mark a room clean first.");
            }
        }
    });

    function renderGroupedRooms() {
        const container = document.getElementById('roomsContainer');
        container.innerHTML = '';
        for (let status of statusOrder) {
            const groupRooms = rooms.filter(r => r.status === status);
            if (!groupRooms.length) continue;
            const groupDiv = document.createElement('div'); groupDiv.className = 'status-group';
            groupDiv.innerHTML = `<div class="group-title">${statusDisplayNames[status]}</div><div class="rooms-grid" id="grid-${status}"></div>`;
            container.appendChild(groupDiv);
            const grid = groupDiv.querySelector('.rooms-grid');
            groupRooms.forEach(room => {
                const card = document.createElement('div');
                let borderClass = '';
                if (room.status === 'clean') borderClass = 'status-clean';
                else if (room.status === 'in-progress') borderClass = 'status-progress';
                else if (room.status === 'ready') borderClass = 'status-ready';
                else if (room.status === 'dirty') borderClass = 'status-dirty';
                else if (room.status === 'procedure') borderClass = 'status-procedure';
                card.className = `room-card ${borderClass}`;
                card.addEventListener('click', () => showSnapshot(room));
                let alertHtml = '';
                if (room.status === 'ready' && room.readyAlert) {
                    alertHtml = `<div class="timer-alert">⚠️ Waiting for MD >5 min</div>`;
                }
                card.innerHTML = `<div class="room-header"><span class="room-name">${room.name}</span><span class="status-glyph">${room.shapeSym}</span></div>
                    <div class="room-status-text">${room.statusLabel}</div>
                    <div class="patient-name">${room.patient ? room.patient.name : (room.status === 'clean' ? 'Vacant' : '—')}</div>
                    ${alertHtml}`;
                grid.appendChild(card);
            });
        }
    }

    function getEhrSummary(patientId) {
        const rec = ehrRecords[patientId];
        if (!rec) return '<div class="ehr-section">No EHR data available for this patient.</div>';
        return `
            <div class="ehr-section">
                <div class="ehr-title">📋 EHR Summary (athenahealth integration)</div>
                <ul class="ehr-list">
                    <li><strong>Allergies:</strong> ${rec.allergies.join(', ') || 'None'}</li>
                    <li><strong>Current Medications:</strong> ${rec.medications.join(', ')}</li>
                    <li><strong>Recent Visits:</strong> ${rec.recentVisits.join('; ')}</li>
                    <li><strong>Recent Labs:</strong> ${rec.labResults.join('; ')}</li>
                    <li><strong>Care Team:</strong> ${rec.careTeam.join(', ')}</li>
                </ul>
            </div>
        `;
    }

    // Function to simulate opening patient chart
    function openPatientChart(patientId) {
        const patient = ehrRecords[patientId];
        if (patient) {
            // Simulate linking to EHR – in a real system this would be a URL like /ehr/patient/${patientId}
            showToast(`Opening chart for ${patient.name}... (demo: would redirect to EHR)`);
            // Uncomment for actual redirect: window.open(`https://clinic-ehr.example.com/patient/${patientId}`, '_blank');
            alert(`[Demo] Opening full EHR chart for ${patient.name}\nPatient ID: ${patientId}\nIn production, this would link to your EHR system.`);
        } else {
            showToast("No chart available for this patient.");
        }
    }

    function showSnapshot(room) {
        const snap = document.getElementById('snapshotContent');
        if ((!room.patient && room.status !== 'dirty') || room.status === 'clean') {
            snap.innerHTML = `<div class="snapshot-detail">🚪 Room ${room.name} is vacant.</div>
                <div class="action-buttons">
                    <select id="statusSelect" class="status-dropdown">
                        ${statusList.map(s => `<option value="${s}" ${room.status === s ? 'selected' : ''}>${statusDisplayNames[s]}</option>`).join('')}
                    </select>
                    <button class="btn-secondary" id="applyStatusBtn">Apply</button>
                </div>`;
            const applyBtn = document.getElementById('applyStatusBtn');
            if (applyBtn) applyBtn.onclick = () => {
                const newStatus = document.getElementById('statusSelect').value;
                changeRoomStatus(room, newStatus);
            };
            return;
        }
        if (room.status === 'dirty') {
            snap.innerHTML = `<div class="snapshot-detail">🧹 Room ${room.name} is dirty.</div>
                <div class="action-buttons">
                    <select id="statusSelect" class="status-dropdown">
                        ${statusList.map(s => `<option value="${s}" ${room.status === s ? 'selected' : ''}>${statusDisplayNames[s]}</option>`).join('')}
                    </select>
                    <button class="btn-secondary" id="applyStatusBtn">Apply</button>
                    <button class="btn-clean" id="markCleanBtn">✨ Mark Clean/Ready</button>
                </div>`;
            const applyBtn = document.getElementById('applyStatusBtn');
            if (applyBtn) applyBtn.onclick = () => {
                const newStatus = document.getElementById('statusSelect').value;
                changeRoomStatus(room, newStatus);
            };
            const cleanBtn = document.getElementById('markCleanBtn');
            if (cleanBtn) cleanBtn.onclick = () => changeRoomStatus(room, 'clean');
            return;
        }
        const p = room.patient;
        const highBp = (p.bp && parseInt(p.bp) > 140) ? 'high-bp' : '';
        let alertMsg = '';
        if (room.status === 'ready' && room.readyAlert) {
            alertMsg = '<div class="timer-alert" style="color:#FFB700;">⚠️ Provider delay alert – patient waiting >5 min</div>';
        }
        const ehrHtml = room.patientId ? getEhrSummary(room.patientId) : '<div class="ehr-section">No EHR record linked.</div>';
        // Add "View Full Chart" button
        snap.innerHTML = `${alertMsg}
            <div><strong>${p.name}</strong> · ${p.age} yrs</div>
            <div>📋 Chief Complaint: ${p.complaint}</div>
            <div><span class="vital-badge ${highBp}">❤️ BP: ${p.bp}</span><span class="vital-badge">🌡️ Temp: ${p.temp}°F</span></div>
            ${ehrHtml}
            <div class="action-buttons">
                <button class="btn-chart" id="viewChartBtn">📋 View Full Chart</button>
                <select id="statusSelect" class="status-dropdown">
                    ${statusList.map(s => `<option value="${s}" ${room.status === s ? 'selected' : ''}>${statusDisplayNames[s]}</option>`).join('')}
                </select>
                <button class="btn-secondary" id="applyStatusBtn">Apply</button>
                <button class="btn-primary" id="readyBtn" ${room.status === 'ready' ? 'disabled' : ''}>✅ Ready for Doctor</button>
                <button class="btn-secondary" id="dirtyBtn">🧹 Mark Dirty</button>
            </div>`;
        const chartBtn = document.getElementById('viewChartBtn');
        if (chartBtn && room.patientId) chartBtn.onclick = () => openPatientChart(room.patientId);
        const applyBtn = document.getElementById('applyStatusBtn');
        if (applyBtn) applyBtn.onclick = () => {
            const newStatus = document.getElementById('statusSelect').value;
            changeRoomStatus(room, newStatus);
        };
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn) readyBtn.onclick = () => changeRoomStatus(room, 'ready');
        const dirtyBtn = document.getElementById('dirtyBtn');
        if (dirtyBtn) dirtyBtn.onclick = () => changeRoomStatus(room, 'dirty');
    }

    function changeRoomStatus(room, newStatus) {
        if (room.status === newStatus) return;
        const oldStatus = room.status;
        const oldPatient = room.patient;
        const oldPatientId = room.patientId;
        lastAction = { type: 'statusChange', roomId: room.id, oldStatus: oldStatus, patientData: oldPatient, patientId: oldPatientId };
        room.status = newStatus;
        room.statusLabel = statusDisplayNames[newStatus];
        if (newStatus === 'clean' || newStatus === 'dirty') {
            room.patient = null;
            room.patientId = null;
            room.readyTimerStart = null;
            room.readyAlert = false;
        } else if (newStatus === 'procedure' && !room.patient) {
            room.patient = { name: "Procedure", age: 0, complaint: "Scheduled", bp: "N/A", temp: "N/A", weight: "N/A" };
            room.patientId = "proc";
        } else if ((newStatus === 'in-progress' || newStatus === 'ready') && !room.patient) {
            room.patient = { name: "Unknown", age: 0, complaint: "Not specified", bp: "N/A", temp: "N/A", weight: "N/A" };
            room.patientId = null;
        }
        const symMap = { clean:"◆", dirty:"●", "in-progress":"▲", ready:"■", procedure:"✦" };
        room.shapeSym = symMap[newStatus] || "◆";
        if (newStatus === 'ready') {
            room.readyTimerStart = Date.now();
            room.readyAlert = false;
        } else {
            room.readyTimerStart = null;
            room.readyAlert = false;
        }
        renderAll();
        showToast(`Room ${room.name} changed to ${statusDisplayNames[newStatus]}`);
        showSnapshot(room);
    }

    let toastTimeout;
    function showToast(msg) {
        const toast = document.getElementById('topToast');
        toast.querySelector('span').innerHTML = `✅ ${msg}`;
        toast.classList.remove('hidden');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.add('hidden'), 4000);
    }
    document.getElementById('undoBtnTop').onclick = () => {
        if (lastAction?.type === 'statusChange') {
            const room = rooms.find(r => r.id === lastAction.roomId);
            if (room) {
                room.status = lastAction.oldStatus;
                room.patient = lastAction.patientData;
                room.patientId = lastAction.patientId;
                room.statusLabel = statusDisplayNames[lastAction.oldStatus];
                const symMap = { clean:"◆", dirty:"●", "in-progress":"▲", ready:"■", procedure:"✦" };
                room.shapeSym = symMap[lastAction.oldStatus] || "◆";
                room.readyTimerStart = (lastAction.oldStatus === 'ready') ? Date.now() : null;
                room.readyAlert = false;
                renderAll();
                showToast(`Undo: restored ${room.name}`);
                showSnapshot(room);
            }
        } else if (lastAction?.type === 'checkin') {
            const p = lastAction.patient;
            notCheckedIn.push(p);
            checkedInWaiting = checkedInWaiting.filter(c => c.id !== p.id);
            renderAll();
            showToast("Undo check-in");
        } else if (lastAction?.type === 'roomAssign') {
            const patient = lastAction.patient;
            const room = rooms.find(r => r.id === lastAction.roomId);
            if (room && room.patientId === patient.id) {
                room.status = 'clean';
                room.patient = null;
                room.patientId = null;
                room.statusLabel = "Clean/Ready";
                room.shapeSym = "◆";
                room.readyTimerStart = null;
                room.readyAlert = false;
                checkedInWaiting.push(patient);
                renderAll();
                showToast("Undo room assignment");
            }
        } else {
            showToast("Nothing to undo");
        }
        lastAction = null;
    };

    setInterval(updateTimers, 1000);
    function updateClock() { document.getElementById('liveClock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
    setInterval(updateClock,1000);
    updateClock();
    renderAll();
    if(rooms.find(r=>r.status==='in-progress')) showSnapshot(rooms.find(r=>r.status==='in-progress'));

    // Reports modal
    const modal = document.getElementById('reportModal');
    document.getElementById('reportsBtn').onclick = () => { modal.style.display = 'flex'; generateReportData(); };
    document.getElementById('closeModalBtn').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };
    function generateReportData() {
        document.getElementById('statsGrid').innerHTML = `<div class="stat-card"><div class="stat-number">142</div><div class="stat-label">Patients Seen (7d)</div></div>
            <div class="stat-card"><div class="stat-number">12.4 min</div><div class="stat-label">Avg Wait Time</div></div>`;
        document.getElementById('exportDailyCSV').onclick = () => downloadCSV("Date,Patients\n2025-04-30,22","daily.csv");
    }
    function downloadCSV(content, filename) {
        const blob = new Blob([content], {type:"text/csv"});
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
    }
    document.getElementById('exportPngBtn').addEventListener('click', function() {
        const el = document.getElementById('hudToCapture'); const btn = this;
        btn.style.opacity = '0'; btn.style.pointerEvents = 'none';
        html2canvas(el, { scale:2, backgroundColor:'#0D1B2A' }).then(canvas => {
            btn.style.opacity = ''; btn.style.pointerEvents = '';
            const link = document.createElement('a'); link.download = 'clinic_hud.png'; link.href = canvas.toDataURL(); link.click();
        }).catch(()=>{ btn.style.opacity=''; btn.style.pointerEvents=''; alert('Export failed'); });
    });
