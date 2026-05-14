// Mock EHR with insurance data and ages from DOB
    const ehrRecords = {
        "p1": { name:"Ruth Garrett", age:72, allergies:["Penicillin"], medications:["Lisinopril"], insurance:"Blue Cross", copay:25 },
        "p2": { name:"Dennis Okonkwo", age:58, allergies:[], medications:["Ibuprofen"], insurance:"Aetna", copay:15 },
        "p3": { name:"J. Miller", age:44, allergies:[], medications:[], insurance:"Medicare", copay:10 },
        "p4": { name:"Eleanor Hughes", age:68, allergies:["Shellfish"], medications:["Levothyroxine"], insurance:"Cigna", copay:30 },
        "p5": { name:"George Baxter", age:62, allergies:["NSAIDs"], medications:["Metoprolol"], insurance:"United", copay:20 },
        "p6": { name:"Mildred Shaw", age:74, allergies:["Codeine"], medications:["Albuterol"], insurance:"Blue Cross", copay:15 }
    };
    let notCheckedIn = [
        { id:"p4", name:"Eleanor Hughes", insurance:"Cigna", copay:30, age:68 },
        { id:"p5", name:"George Baxter", insurance:"United", copay:20, age:62 },
        { id:"p6", name:"Mildred Shaw", insurance:"Blue Cross", copay:15, age:74 }
    ];
    let checkedInWaiting = [];
    let rooms = [
        { id:1, name:"Exam 1", status:"clean", patient:null, patientId:null, statusLabel:"Clean/Ready", shapeSym:"◆", readyTimerStart:null, readyAlert:false, vitals:{bp:"", temp:"", weight:""} },
        { id:2, name:"Exam 2", status:"in-progress", patient:{ name:"Ruth Garrett", age:72, complaint:"Shortness of breath", bp:"158/92", temp:"98.2", weight:"165" }, patientId:"p1", statusLabel:"In Progress", shapeSym:"▲", readyTimerStart:null, readyAlert:false, vitals:{bp:"158/92", temp:"98.2", weight:"165"} },
        { id:3, name:"Exam 3", status:"ready", patient:{ name:"Dennis Okonkwo", age:58, complaint:"Knee pain", bp:"132/85", temp:"98.6", weight:"210" }, patientId:"p2", statusLabel:"Ready for MD", shapeSym:"■", readyTimerStart:Date.now()-400000, readyAlert:true, vitals:{bp:"132/85", temp:"98.6", weight:"210"} },
        { id:4, name:"Exam 4", status:"clean", patient:null, patientId:null, statusLabel:"Clean/Ready", shapeSym:"◆", readyTimerStart:null, readyAlert:false, vitals:{} },
        { id:5, name:"Exam 5", status:"clean", patient:null, patientId:null, statusLabel:"Clean/Ready", shapeSym:"◆", readyTimerStart:null, readyAlert:false, vitals:{} },
        { id:6, name:"Procedure", status:"procedure", patient:{ name:"J. Miller", age:44, complaint:"Biopsy", bp:"125/78", temp:"98.4", weight:"180" }, patientId:"p3", statusLabel:"Procedure", shapeSym:"✦", readyTimerStart:null, readyAlert:false, vitals:{bp:"125/78", temp:"98.4", weight:"180"} }
    ];
    let lastAction = null;
    const statusOrder = ["ready","in-progress","clean","dirty","procedure"];
    const statusDisplayNames = { clean:"Clean/Ready","in-progress":"In Progress", ready:"Ready for MD", dirty:"Dirty", procedure:"Procedure" };
    const statusList = ["clean","dirty","in-progress","ready","procedure"];

    function renderAll() { renderLobbySections(); renderGroupedRooms(); }
    function renderLobbySections() {
        const notDiv = document.getElementById('notCheckedInList');
        const checkedDiv = document.getElementById('checkedInWaitingList');
        notDiv.innerHTML = ''; checkedDiv.innerHTML = '';
        notCheckedIn.forEach(p => {
            const row = document.createElement('div'); row.className = 'patient-row'; row.setAttribute('draggable','false');
            row.innerHTML = `<div class="patient-info">${p.name}</div><button class="checkin-btn" data-id="${p.id}">Check In</button>`;
            notDiv.appendChild(row);
        });
        checkedInWaiting.forEach(p => {
            const row = document.createElement('div'); row.className = 'patient-row'; row.setAttribute('draggable','true'); row.setAttribute('data-patient-id', p.id);
            const waitTime = p.checkinTime ? Math.floor((Date.now() - p.checkinTime)/60000) : 0;
            row.innerHTML = `<div class="patient-info">${p.name} (waited ${waitTime} min) <span class="insurance-badge">${p.insurance} $${p.copay}</span></div>`;
            checkedDiv.appendChild(row);
        });
        // Drag and drop
        document.querySelectorAll('#checkedInWaitingList .patient-row').forEach(el => {
            el.setAttribute('draggable', 'true');
            el.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', el.getAttribute('data-patient-id'));
                e.dataTransfer.effectAllowed = 'move';
            });
        });
        // Check-in buttons
        document.querySelectorAll('#notCheckedInList .checkin-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const p = notCheckedIn.find(x => x.id === id);
                if(p){
                    notCheckedIn = notCheckedIn.filter(x => x.id !== id);
                    checkedInWaiting.push({ id:p.id, name:p.name, insurance:p.insurance, copay:p.copay, age:p.age, checkinTime:Date.now() });
                    showToast(`Checked in ${p.name} (${p.insurance}, co-pay $${p.copay})`);
                    lastAction = { type:'checkin', patient:p };
                    renderAll();
                }
            };
        });
    }
    function renderGroupedRooms() {
        const container = document.getElementById('roomsContainer');
        container.innerHTML = '';
        for(let status of statusOrder){
            const group = rooms.filter(r => r.status === status);
            if(!group.length) continue;
            const groupDiv = document.createElement('div'); groupDiv.className = 'status-group';
            groupDiv.innerHTML = `<div class="group-title">${statusDisplayNames[status]}</div><div class="rooms-grid" id="grid-${status}"></div>`;
            container.appendChild(groupDiv);
            const grid = groupDiv.querySelector('.rooms-grid');
            group.forEach(room => {
                const card = document.createElement('div');
                let border = '';
                if(room.status === 'clean') border = 'status-clean';
                else if(room.status === 'in-progress') border = 'status-progress';
                else if(room.status === 'ready') border = 'status-ready';
                else if(room.status === 'dirty') border = 'status-dirty';
                else if(room.status === 'procedure') border = 'status-procedure';
                card.className = `room-card ${border}`;
                card.setAttribute('data-room-id', room.id);
                card.addEventListener('click', () => showSnapshot(room));
                card.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; card.classList.add('drag-over'); });
                card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
                card.addEventListener('drop', e => {
                    e.preventDefault();
                    card.classList.remove('drag-over');
                    const patientId = e.dataTransfer.getData('text/plain');
                    const patient = checkedInWaiting.find(p => p.id === patientId);
                    if(patient && room.status === 'clean'){
                        room.status = 'in-progress';
                        room.patient = { name:patient.name, age:patient.age || 65, complaint:"New patient", bp:"", temp:"", weight:"" };
                        room.patientId = patientId;
                        room.statusLabel = "In Progress";
                        room.shapeSym = "▲";
                        room.vitals = { bp:"", temp:"", weight:"" };
                        checkedInWaiting = checkedInWaiting.filter(p => p.id !== patientId);
                        showToast(`${patient.name} assigned to ${room.name}`);
                        lastAction = { type:'roomAssign', patient:patient, roomId:room.id };
                        renderAll();
                        showSnapshot(room);
                    } else showToast("Room not clean or patient invalid");
                });
                let alertHtml = (room.status === 'ready' && room.readyAlert) ? '<div class="timer-alert">Waiting for MD over 5 min</div>' : '';
                card.innerHTML = `<div class="room-header"><span class="room-name">${room.name}</span><span class="status-glyph">${room.shapeSym}</span></div>
                    <div class="room-status-text">${room.statusLabel}</div>
                    <div class="patient-name">${room.patient ? room.patient.name : (room.status === 'clean' ? 'Vacant' : '—')}</div>${alertHtml}`;
                grid.appendChild(card);
            });
        }
    }
    // Numeric keypad with '/' button
    let activeRoomForVitals = null;
    let currentVitalField = 'bp';
    function showKeypad(room, field) {
        currentVitalField = field;
        activeRoomForVitals = room;
        const snap = document.getElementById('snapshotContent');
        const existing = snap.querySelector('.keypad');
        if(existing) existing.remove();
        const keypadDiv = document.createElement('div'); keypadDiv.className = 'keypad';
        keypadDiv.innerHTML = `<div class="keypad-title">Enter ${field.toUpperCase()} (use keypad)</div>
            <div class="vital-input-row"><label>Current value:</label><input type="text" id="vitalInput" placeholder="0" style="width:140px;"></div>
            <div class="keypad-grid" id="keypadGrid"></div>
            <div class="action-buttons" style="margin-top:12px;"><button class="btn-primary" id="saveVitalBtn">Save</button><button class="btn-secondary" id="cancelKeypad">Cancel</button></div>`;
        snap.appendChild(keypadDiv);
        const grid = document.getElementById('keypadGrid');
        const buttons = ['7','8','9','4','5','6','1','2','3','0','/','⌫'];
        buttons.forEach(b => {
            const btn = document.createElement('div'); btn.className = 'keypad-btn'; btn.innerText = b;
            btn.onclick = () => {
                const input = document.getElementById('vitalInput');
                if(b === '⌫') input.value = input.value.slice(0,-1);
                else input.value += b;
            };
            grid.appendChild(btn);
        });
        document.getElementById('saveVitalBtn').onclick = () => {
            const val = document.getElementById('vitalInput').value;
            if(field === 'bp') room.vitals.bp = val;
            else if(field === 'temp') room.vitals.temp = val;
            else if(field === 'weight') room.vitals.weight = val;
            if(room.patient) {
                room.patient.bp = room.vitals.bp || room.patient.bp;
                room.patient.temp = room.vitals.temp || room.patient.temp;
                room.patient.weight = room.vitals.weight || room.patient.weight;
            }
            showToast(`${field} saved: ${val}`);
            showSnapshot(room);
        };
        document.getElementById('cancelKeypad').onclick = () => showSnapshot(room);
    }
    // Simulate closing the EHR chart: triggers room to become dirty (needs cleaning)
    function closeEhrChart(room) {
        if(room.status === 'ready') {
            changeRoomStatus(room, 'dirty');
            showToast(`Chart closed for ${room.patient.name}. Room marked dirty.`);
        } else {
            showToast("Cannot close chart: patient not in Ready for MD status.");
        }
    }
    function showSnapshot(room) {
        const snap = document.getElementById('snapshotContent');
        if(room.status === 'clean' || (!room.patient && room.status !== 'dirty')){
            snap.innerHTML = `<div>Room ${room.name} vacant</div><div class="action-buttons"><select id="statusSelect" class="status-dropdown">${statusList.map(s=>`<option value="${s}" ${room.status===s?'selected':''}>${statusDisplayNames[s]}</option>`).join('')}</select><button class="btn-secondary" id="applyStatusBtn">Apply</button></div>`;
            document.getElementById('applyStatusBtn').onclick = () => changeRoomStatus(room, document.getElementById('statusSelect').value);
            return;
        }
        if(room.status === 'dirty'){
            snap.innerHTML = `<div>Room ${room.name} dirty</div><div class="action-buttons"><select id="statusSelect" class="status-dropdown">${statusList.map(s=>`<option value="${s}" ${room.status===s?'selected':''}>${statusDisplayNames[s]}</option>`).join('')}</select><button class="btn-secondary" id="applyStatusBtn">Apply</button><button class="btn-clean" id="markCleanBtn">Mark Clean</button></div>`;
            document.getElementById('applyStatusBtn').onclick = () => changeRoomStatus(room, document.getElementById('statusSelect').value);
            document.getElementById('markCleanBtn').onclick = () => changeRoomStatus(room, 'clean');
            return;
        }
        const p = room.patient;
        const vitals = room.vitals || {};
        const ehr = ehrRecords[room.patientId] || {};
        const insuranceHtml = (room.patientId && !room.patientId.startsWith('walk')) ? `<div class="insurance-badge" style="margin-bottom:8px;">Insurance: ${ehr.insurance} | Co-pay: $${ehr.copay}</div>` : '';
        // For ready rooms, add a "Close Chart" link (not a button) that simulates closing EHR chart
        let closeChartLink = (room.status === 'ready') ? `<div style="margin-top:12px;"><a href="#" id="closeChartLink" class="chart-link">Close EHR Chart (mark room dirty)</a></div>` : '';
        snap.innerHTML = `${insuranceHtml}<div><strong>${p.name}</strong> · ${p.age || ehr.age || '?'} yrs</div>
            <div>Chief complaint: ${p.complaint || "Check-in"}</div>
            <div><span class="vital-badge">BP: ${vitals.bp || p.bp || '—'}</span> <span class="vital-badge">Temp: ${vitals.temp || p.temp || '—'} F</span> <span class="vital-badge">Weight: ${vitals.weight || p.weight || '—'} lbs</span></div>
            <div class="action-buttons">
                <button class="btn-secondary" id="editBp">Edit BP</button>
                <button class="btn-secondary" id="editTemp">Edit Temp</button>
                <button class="btn-secondary" id="editWeight">Edit Weight</button>
                ${(room.status === 'in-progress') ? `<button class="btn-primary" id="readyBtn">Ready for Doctor</button>` : ''}
                ${(room.status === 'ready') ? `<button class="btn-chart" id="viewChartBtn">View Full Chart</button>` : ''}
                <button class="btn-secondary" id="dirtyBtn">Mark Dirty</button>
            </div>
            ${closeChartLink}
            <div class="action-buttons" style="margin-top:8px;">
                <select id="statusSelect" class="status-dropdown">${statusList.map(s=>`<option value="${s}" ${room.status===s?'selected':''}>${statusDisplayNames[s]}</option>`).join('')}</select>
                <button class="btn-secondary" id="applyStatusBtn">Apply Status</button>
            </div>`;
        document.getElementById('editBp')?.addEventListener('click', () => showKeypad(room, 'bp'));
        document.getElementById('editTemp')?.addEventListener('click', () => showKeypad(room, 'temp'));
        document.getElementById('editWeight')?.addEventListener('click', () => showKeypad(room, 'weight'));
        document.getElementById('readyBtn')?.addEventListener('click', () => changeRoomStatus(room, 'ready'));
        document.getElementById('viewChartBtn')?.addEventListener('click', () => alert(`[Demo] Opening EHR chart for ${p.name} (ID ${room.patientId})`));
        document.getElementById('dirtyBtn')?.addEventListener('click', () => changeRoomStatus(room, 'dirty'));
        document.getElementById('applyStatusBtn')?.addEventListener('click', () => changeRoomStatus(room, document.getElementById('statusSelect').value));
        const closeLink = document.getElementById('closeChartLink');
        if(closeLink) closeLink.addEventListener('click', (e) => { e.preventDefault(); closeEhrChart(room); });
    }
    function changeRoomStatus(room, newStatus){
        if(room.status === newStatus) return;
        const old = room.status;
        lastAction = { type:'statusChange', roomId:room.id, oldStatus:old, patientData:room.patient, patientId:room.patientId, vitals:room.vitals };
        room.status = newStatus;
        room.statusLabel = statusDisplayNames[newStatus];
        const symMap = { clean:"◆", dirty:"●", "in-progress":"▲", ready:"■", procedure:"✦" };
        room.shapeSym = symMap[newStatus];
        if(newStatus === 'clean' || newStatus === 'dirty'){
            room.patient = null; room.patientId = null; room.vitals = {};
        }
        if(newStatus === 'ready') room.readyTimerStart = Date.now();
        else { room.readyTimerStart = null; room.readyAlert = false; }
        renderAll();
        showToast(`Room ${room.name} changed to ${statusDisplayNames[newStatus]}`);
        showSnapshot(room);
    }
    // Walk-in with DOB
    const walkinModal = document.getElementById('walkinModal');
    document.getElementById('walkinBtn').onclick = () => walkinModal.style.display = 'flex';
    document.getElementById('closeWalkinModal').onclick = () => walkinModal.style.display = 'none';
    function calculateAge(dob) {
        const birth = new Date(dob);
        const diff = Date.now() - birth.getTime();
        const ageDate = new Date(diff);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    document.getElementById('confirmWalkin').onclick = () => {
        const name = document.getElementById('walkinName').value.trim();
        const dob = document.getElementById('walkinDOB').value;
        const reason = document.getElementById('walkinReason').value.trim();
        if(!name || !dob) { alert("Please enter name and date of birth"); return; }
        const age = calculateAge(dob);
        const newId = 'walk_' + Date.now();
        notCheckedIn.push({ id:newId, name:name, age:age, insurance:"Self-pay", copay:50 });
        showToast(`Walk-in ${name} added to scheduled arrivals (age ${age})`);
        walkinModal.style.display = 'none';
        document.getElementById('walkinName').value = '';
        document.getElementById('walkinDOB').value = '';
        document.getElementById('walkinReason').value = '';
        renderAll();
    };
    let toastTimeout;
    function showToast(msg){ const t=document.getElementById('topToast'); t.querySelector('span').innerHTML=msg; t.classList.remove('hidden'); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>t.classList.add('hidden'),3000); }
    document.getElementById('undoBtnTop').onclick = () => {
        if(lastAction?.type === 'statusChange'){
            const r=rooms.find(x=>x.id===lastAction.roomId);
            if(r){ r.status=lastAction.oldStatus; r.patient=lastAction.patientData; r.patientId=lastAction.patientId; r.vitals=lastAction.vitals||{}; r.statusLabel=statusDisplayNames[lastAction.oldStatus]; const sm={clean:"◆",dirty:"●","in-progress":"▲",ready:"■",procedure:"✦"}; r.shapeSym=sm[lastAction.oldStatus]; renderAll(); showToast("Undo status change"); showSnapshot(r); }
        } else if(lastAction?.type==='checkin'){
            notCheckedIn.push(lastAction.patient); checkedInWaiting=checkedInWaiting.filter(c=>c.id!==lastAction.patient.id); renderAll(); showToast("Undo check-in");
        } else if(lastAction?.type==='roomAssign'){
            const r=rooms.find(x=>x.id===lastAction.roomId);
            if(r && r.patientId===lastAction.patient.id){ r.status='clean'; r.patient=null; r.patientId=null; r.vitals={}; r.statusLabel="Clean/Ready"; r.shapeSym="◆"; checkedInWaiting.push(lastAction.patient); renderAll(); showToast("Undo room assignment"); }
        } else showToast("Nothing to undo");
        lastAction=null;
    };
    function updateTimers(){
        const now=Date.now();
        checkedInWaiting.forEach(p=>{ if(p.checkinTime && now-p.checkinTime>15*60000) p.alert=true; });
        rooms.forEach(r=>{ if(r.status==='ready'){ if(!r.readyTimerStart) r.readyTimerStart=now; r.readyAlert=(now-r.readyTimerStart)>5*60000; } else { r.readyTimerStart=null; r.readyAlert=false; } });
        renderAll();
    }
    setInterval(updateTimers,1000);
    function updateClock(){ document.getElementById('liveClock').innerText=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
    setInterval(updateClock,1000); updateClock();
    renderAll(); if(rooms.find(r=>r.status==='in-progress')) showSnapshot(rooms.find(r=>r.status==='in-progress'));
    document.getElementById('reportsBtn').onclick = () => alert("Reports: Daily CSV export would be available here.");
    document.getElementById('exportPngBtn').addEventListener('click', function(){
        const el=document.getElementById('hudToCapture'); const btn=this;
        btn.style.opacity='0'; btn.style.pointerEvents='none';
        html2canvas(el,{scale:2,backgroundColor:'#0D1B2A'}).then(canvas=>{
            btn.style.opacity=''; btn.style.pointerEvents='';
            const link=document.createElement('a'); link.download='clinic_hud.png'; link.href=canvas.toDataURL(); link.click();
        }).catch(()=>{ btn.style.opacity=''; btn.style.pointerEvents=''; alert('Export failed'); });
    });
