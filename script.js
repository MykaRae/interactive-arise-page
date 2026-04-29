let rooms = [
        { id: 1, name: "Exam 1", status: "clean", patient: null, waitAlert: false, statusLabel: "Clean/Ready", shapeSym: "◆" },
        { id: 2, name: "Exam 2", status: "in-progress", patient: { name: "Ruth Garrett", age: 72, complaint: "Shortness of breath", bp: "158/92", temp: "98.2", weight: "165" }, waitAlert: false, statusLabel: "In Progress", shapeSym: "▲" },
        { id: 3, name: "Exam 3", status: "ready", patient: { name: "Dennis Okonkwo", age: 58, complaint: "Knee pain follow-up", bp: "132/85", temp: "98.6", weight: "210" }, waitAlert: false, statusLabel: "Ready for MD", shapeSym: "■" },
        { id: 4, name: "Exam 4", status: "clean", patient: null, waitAlert: false, statusLabel: "Clean/Ready", shapeSym: "◆" },
        { id: 5, name: "Exam 5", status: "wait-alert", patient: { name: "Carol Jennings", age: 67, complaint: "Dizziness", bp: "144/88", temp: "97.9", weight: "155" }, waitAlert: true, statusLabel: "Wait Alert", shapeSym: "⚠" },
        { id: 6, name: "Procedure Room", status: "procedure", patient: { name: "J. Miller", age: 44, complaint: "Skin biopsy", bp: "125/78", temp: "98.4", weight: "180" }, waitAlert: false, statusLabel: "Procedure Active", shapeSym: "✦" }
    ];

    let lobbyPatients = [
        { id: "p1", name: "Ruth Garrett", checkInStatus: false, insurance: "Verified", copay: "$25" },
        { id: "p2", name: "Dennis Okonkwo", checkInStatus: false, insurance: "Verified", copay: "$15" },
        { id: "p3", name: "Carol Jennings", checkInStatus: false, insurance: "Pending", copay: "$40" }
    ];

    let lastAction = null;

    const statusOrder = ["clean", "in-progress", "ready", "wait-alert", "dirty", "procedure"];
    const statusDisplayNames = {
        clean: "Clean / Ready",
        "in-progress": "In Progress (Vitals)",
        ready: "Ready for MD",
        "wait-alert": "Wait Alert",
        dirty: "Dirty",
        procedure: "Procedure"
    };

    function renderAll() {
        renderGroupedRooms();
        renderPatientList();
    }

    function renderGroupedRooms() {
        const container = document.getElementById('roomsContainer');
        container.innerHTML = '';
        for (let status of statusOrder) {
            const groupRooms = rooms.filter(r => r.status === status);
            if (groupRooms.length === 0) continue;
            const groupDiv = document.createElement('div');
            groupDiv.className = 'status-group';
            groupDiv.innerHTML = `<div class="group-title">${statusDisplayNames[status]}</div><div class="rooms-grid" id="grid-${status}"></div>`;
            container.appendChild(groupDiv);
            const grid = groupDiv.querySelector('.rooms-grid');
            groupRooms.forEach(room => {
                const card = document.createElement('div');
                let borderClass = '';
                if (room.status === 'clean') borderClass = 'status-clean';
                else if (room.status === 'in-progress') borderClass = 'status-progress';
                else if (room.status === 'ready') borderClass = 'status-ready';
                else if (room.status === 'wait-alert') borderClass = 'status-wait';
                else if (room.status === 'dirty') borderClass = 'status-dirty';
                else if (room.status === 'procedure') borderClass = 'status-procedure';
                card.className = `room-card ${borderClass}`;
                card.setAttribute('data-room-id', room.id);
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showSnapshot(room);
                });
                card.innerHTML = `
                    <div class="room-header">
                        <span class="room-name">${room.name}</span>
                        <span class="status-glyph">${room.shapeSym}</span>
                    </div>
                    <div class="room-status-text">${room.statusLabel}</div>
                    <div class="patient-name">${room.patient ? room.patient.name : (room.status === 'clean' ? 'Vacant · Ready' : '—')}</div>
                `;
                grid.appendChild(card);
            });
        }
    }

    function renderPatientList() {
        const listContainer = document.getElementById('patientList');
        listContainer.innerHTML = '';
        lobbyPatients.forEach(patient => {
            const row = document.createElement('div');
            row.className = 'patient-row';
            row.innerHTML = `
                <div class="patient-info">${patient.name}</div>
                <button class="checkin-btn" data-patient-id="${patient.id}">Check in</button>
            `;
            listContainer.appendChild(row);
        });
        document.querySelectorAll('.checkin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientId = btn.getAttribute('data-patient-id');
                const patient = lobbyPatients.find(p => p.id === patientId);
                if (patient && !patient.checkInStatus) {
                    patient.checkInStatus = true;
                    const cleanRoom = rooms.find(r => r.status === 'clean' && r.id !== 6);
                    if (cleanRoom) {
                        cleanRoom.status = 'in-progress';
                        cleanRoom.patient = { name: patient.name, age: 70, complaint: "Check-in", bp: "N/A", temp: "N/A", weight: "N/A" };
                        cleanRoom.statusLabel = "In Progress (Vitals)";
                        cleanRoom.shapeSym = "▲";
                    }
                    lastAction = { type: 'checkin', patientId: patient.id, roomId: cleanRoom?.id };
                    showToast(`Checked in ${patient.name}`);
                    const idx = lobbyPatients.findIndex(p => p.id === patientId);
                    if (idx !== -1) lobbyPatients.splice(idx, 1);
                    renderAll();
                }
            });
        });
    }

    function showSnapshot(room) {
        const snapshotDiv = document.getElementById('snapshotContent');
        if (!room.patient && room.status !== 'dirty' && room.status !== 'clean') {
            snapshotDiv.innerHTML = `<div class="snapshot-detail">🚪 Room ${room.name} is vacant. Assign a patient to see details.</div>`;
            return;
        }
        
        // Handle dirty room (no patient, but needs cleaning)
        if (room.status === 'dirty') {
            snapshotDiv.innerHTML = `
                <div class="snapshot-detail">🧹 Room ${room.name} is dirty.</div>
                <div class="snapshot-detail">Requires cleaning before next patient.</div>
                <div class="action-buttons">
                    <button class="btn-clean" data-room="${room.id}" data-action="makeClean">✨ Mark Clean/Ready</button>
                </div>
            `;
            document.querySelectorAll('[data-action="makeClean"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rid = parseInt(btn.getAttribute('data-room'));
                    const targetRoom = rooms.find(r => r.id === rid);
                    if (targetRoom && targetRoom.status === 'dirty') {
                        lastAction = { type: 'statusChange', roomId: rid, oldStatus: targetRoom.status, newStatus: 'clean', patientData: targetRoom.patient };
                        targetRoom.status = 'clean';
                        targetRoom.statusLabel = "Clean/Ready";
                        targetRoom.patient = null;
                        targetRoom.shapeSym = "◆";
                        showToast(`Room ${targetRoom.name} marked clean and ready.`);
                        renderAll();
                        // Refresh snapshot to show clean state
                        showSnapshot(targetRoom);
                    }
                });
            });
            return;
        }
        
        // For rooms with patient
        const p = room.patient;
        const highBpClass = (p.bp && parseInt(p.bp) > 140) ? 'high-bp' : '';
        let actionButtons = '';
        if (room.status === 'in-progress') {
            actionButtons = `<button class="btn-primary" data-room="${room.id}" data-action="ready">✅ Ready for Doctor</button>`;
        } else if (room.status === 'ready') {
            actionButtons = `<button class="btn-secondary" data-room="${room.id}" data-action="lab">🔬 Order Lab/Referral</button>`;
            actionButtons += `<button class="btn-secondary" data-room="${room.id}" data-action="dirty">🧹 Mark Dirty</button>`;
        } else if (room.status === 'wait-alert') {
            actionButtons = `<button class="btn-urgent" data-room="${room.id}" data-action="eta">⏱️ Send ETA to Lobby</button>`;
            actionButtons += `<button class="btn-secondary" data-room="${room.id}" data-action="dirty">🧹 Mark Dirty</button>`;
        } else if (room.status === 'clean') {
            // Clean room with no patient — could assign via check-in, but no action needed here
            actionButtons = `<button class="btn-secondary" data-room="${room.id}" data-action="dirty">🧹 Mark Dirty</button>`;
        } else {
            actionButtons = `<button class="btn-secondary" data-room="${room.id}" data-action="dirty">🧹 Mark Dirty</button>`;
        }
        
        snapshotDiv.innerHTML = `
            <div class="snapshot-detail"><strong>${p.name}</strong> · ${p.age} yrs</div>
            <div class="snapshot-detail">📋 Chief Complaint: ${p.complaint}</div>
            <div><span class="vital-badge ${highBpClass}">❤️ BP: ${p.bp || '—'}</span>
            <span class="vital-badge">🌡️ Temp: ${p.temp || '—'}°F</span>
            <span class="vital-badge">⚖️ Weight: ${p.weight || '—'} lbs</span></div>
            <div class="action-buttons">
                ${actionButtons}
            </div>
        `;
        attachActionButtons(room);
    }

    function attachActionButtons(currentRoom) {
        document.querySelectorAll('[data-action="ready"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const rid = parseInt(btn.getAttribute('data-room'));
                const targetRoom = rooms.find(r => r.id === rid);
                if (targetRoom && targetRoom.status === 'in-progress') {
                    lastAction = { type: 'statusChange', roomId: rid, oldStatus: targetRoom.status, newStatus: 'ready', patientData: targetRoom.patient };
                    targetRoom.status = 'ready';
                    targetRoom.statusLabel = "Ready for MD";
                    targetRoom.shapeSym = "■";
                    showToast(`${targetRoom.patient?.name} marked ready for doctor.`);
                    renderAll();
                    showSnapshot(targetRoom);
                }
            });
        });
        document.querySelectorAll('[data-action="lab"]').forEach(btn => {
            btn.addEventListener('click', () => {
                showToast("Lab order sent to Elena.");
                lastAction = { type: 'lab', msg: "Lab order" };
            });
        });
        document.querySelectorAll('[data-action="eta"]').forEach(btn => {
            btn.addEventListener('click', () => {
                showToast("ETA notification sent to lobby.");
            });
        });
        document.querySelectorAll('[data-action="dirty"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const rid = parseInt(btn.getAttribute('data-room'));
                const targetRoom = rooms.find(r => r.id === rid);
                if (targetRoom) {
                    lastAction = { type: 'statusChange', roomId: rid, oldStatus: targetRoom.status, newStatus: 'dirty', patientData: targetRoom.patient };
                    targetRoom.status = 'dirty';
                    targetRoom.statusLabel = "Dirty";
                    targetRoom.patient = null;
                    targetRoom.shapeSym = "●";
                    showToast(`Room ${targetRoom.name} marked dirty.`);
                    renderAll();
                    showSnapshot(targetRoom);
                }
            });
        });
    }

    let toastTimeout;
    function showToast(message) {
        const toast = document.getElementById('undoToast');
        const span = toast.querySelector('span');
        span.innerHTML = `✅ ${message}`;
        toast.classList.remove('hidden');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    document.getElementById('undoBtn').addEventListener('click', () => {
        if (lastAction) {
            if (lastAction.type === 'statusChange') {
                const room = rooms.find(r => r.id === lastAction.roomId);
                if (room) {
                    room.status = lastAction.oldStatus;
                    room.patient = lastAction.patientData;
                    if (lastAction.oldStatus === 'in-progress') {
                        room.statusLabel = "In Progress (Vitals)";
                        room.shapeSym = "▲";
                    } else if (lastAction.oldStatus === 'ready') {
                        room.statusLabel = "Ready for MD";
                        room.shapeSym = "■";
                    } else if (lastAction.oldStatus === 'dirty') {
                        room.statusLabel = "Dirty";
                        room.shapeSym = "●";
                    } else if (lastAction.oldStatus === 'clean') {
                        room.statusLabel = "Clean/Ready";
                        room.shapeSym = "◆";
                    } else {
                        room.statusLabel = "Unknown";
                    }
                    renderAll();
                    showToast(`Undo: restored ${room.name} to previous status.`);
                    if (room.patient) showSnapshot(room);
                    else showSnapshot(room);
                }
            } else if (lastAction.type === 'checkin') {
                const room = rooms.find(r => r.id === lastAction.roomId);
                if (room) {
                    room.status = 'clean';
                    room.patient = null;
                    room.statusLabel = "Clean/Ready";
                    room.shapeSym = "◆";
                }
                lobbyPatients.push({ id: lastAction.patientId, name: "Restored Patient", checkInStatus: false, insurance: "Verified", copay: "$0" });
                renderAll();
                showToast("Undo check-in (patient returned to lobby)");
            } else {
                showToast("Undo not available for last action");
            }
            lastAction = null;
        } else {
            showToast("Nothing to undo");
        }
        document.getElementById('undoToast').classList.add('hidden');
    });

    function updateClock() {
        const now = new Date();
        document.getElementById('liveClock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    renderAll();
    const defaultRoom = rooms.find(r => r.status === 'in-progress');
    if (defaultRoom) showSnapshot(defaultRoom);

    // ----- Reports Modal Logic -----
    const modal = document.getElementById('reportModal');
    document.getElementById('reportsBtn').onclick = () => { modal.style.display = 'flex'; generateReportData(); };
    document.getElementById('closeModalBtn').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };

    function generateReportData() {
        // Sample aggregated stats
        const stats = { patientsSeen: 142, avgWait: 12.4, clinicHealth: 68, avgTurnover: 4.2 };
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="stat-number">${stats.patientsSeen}</div><div class="stat-label">Patients Seen (7d)</div></div>
            <div class="stat-card"><div class="stat-number">${stats.avgWait} min</div><div class="stat-label">Avg Wait Time</div></div>
            <div class="stat-card"><div class="stat-number">${stats.clinicHealth}%</div><div class="stat-label">Avg Clinic Health</div></div>
            <div class="stat-card"><div class="stat-number">${stats.avgTurnover} min</div><div class="stat-label">Room Turnover</div></div>`;
        // Per-room latency
        const roomLatency = [{room:"Exam 1", wait:8.2, clean:3.5},{room:"Exam 2", wait:15.7, clean:5.2},{room:"Exam 3", wait:10.1, clean:4.0},{room:"Exam 4", wait:9.3, clean:3.8},{room:"Exam 5", wait:22.4, clean:6.1},{room:"Procedure", wait:18.5, clean:12.0}];
        let tbody = ''; roomLatency.forEach(r => { tbody += `<tr><td>${r.room}</td><td>${r.wait} min</td><td>${r.clean} min</td></tr>`; });
        document.querySelector('#roomLatencyTable tbody').innerHTML = tbody;
        // attach export handlers
        document.getElementById('exportDailyCSV').onclick = () => exportDailyCSV();
        document.getElementById('exportWeeklyCSV').onclick = () => exportWeeklyCSV();
    }
    function exportDailyCSV() {
        let csvRows = [["Date","Total Patients","Avg Wait (min)","Avg Clinic Health"]];
        // fake daily data
        const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
        for(let i=0;i<7;i++) csvRows.push([`2025-04-${14+i}`, Math.floor(18+Math.random()*10), (10+Math.random()*8).toFixed(1), Math.floor(60+Math.random()*25)]);
        const csv = csvRows.map(row => row.join(",")).join("\n");
        downloadCSV(csv, "daily_flow_report.csv");
    }
    function exportWeeklyCSV() {
        let csv = [["Metric","Value"],["Patients Seen (7d)","142"],["Avg Wait Time (min)","12.4"],["Avg Clinic Health (%)","68"],["Avg Room Turnover (min)","4.2"]];
        const csvStr = csv.map(row => row.join(",")).join("\n");
        downloadCSV(csvStr, "weekly_summary.csv");
    }
    function downloadCSV(content, filename) {
        const blob = new Blob([content], {type: "text/csv"});
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
    }

    //PNG Export Logic----

    document.getElementById('exportPngBtn').addEventListener('click', function() {
        const element = document.getElementById('hudToCapture');
        const exportBtn = this;
        exportBtn.style.opacity = '0';
        exportBtn.style.pointerEvents = 'none';
        html2canvas(element, {
            scale: 2,
            backgroundColor: '#0D1B2A',
            logging: false,
            useCORS: false
        }).then(canvas => {
            exportBtn.style.opacity = '';
            exportBtn.style.pointerEvents = '';
            const link = document.createElement('a');
            link.download = 'clinic_hud.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(error => {
            console.error('Export failed:', error);
            exportBtn.style.opacity = '';
            exportBtn.style.pointerEvents = '';
            alert('Could not export image. Please try again or use a different browser.');
        });
    });