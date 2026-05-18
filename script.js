/** @format */

// Simulated patient records pulled from an electronic health record system.
const ehrRecords = {
	p1: {
		name: "Ruth Garrett",
		age: 72,
		allergies: ["Penicillin"],
		medications: ["Lisinopril"],
		insurance: "Blue Cross",
		copay: 25,
	},
	p2: {
		name: "Dennis Okonkwo",
		age: 58,
		allergies: [],
		medications: ["Ibuprofen"],
		insurance: "Aetna",
		copay: 15,
	},
	p3: {
		name: "J. Miller",
		age: 44,
		allergies: [],
		medications: [],
		insurance: "Medicare",
		copay: 10,
	},
	p4: {
		name: "Eleanor Hughes",
		age: 68,
		allergies: ["Shellfish"],
		medications: ["Levothyroxine"],
		insurance: "Cigna",
		copay: 30,
	},
	p5: {
		name: "George Baxter",
		age: 62,
		allergies: ["NSAIDs"],
		medications: ["Metoprolol"],
		insurance: "United",
		copay: 20,
	},
	p6: {
		name: "Mildred Shaw",
		age: 74,
		allergies: ["Codeine"],
		medications: ["Albuterol"],
		insurance: "Blue Cross",
		copay: 15,
	},
};

// Patients who have an appointment today but have not yet arrived at the front desk.
let notCheckedIn = [
	{ id: "p4", name: "Eleanor Hughes", insurance: "Cigna", copay: 30, age: 68 },
	{ id: "p5", name: "George Baxter", insurance: "United", copay: 20, age: 62 },
	{
		id: "p6",
		name: "Mildred Shaw",
		insurance: "Blue Cross",
		copay: 15,
		age: 74,
	},
];

// Patients who checked in at the front desk and are waiting to be brought to a room.
let checkedInWaiting = [];

// All exam rooms in the clinic, each with their current occupant and status.
let rooms = [
	{
		id: 1,
		name: "Exam 1",
		status: "clean",
		patient: null,
		patientId: null,
		statusLabel: "Clean/Ready",
		shapeSym: "◆",
		readyTimerStart: null,
		readyAlert: false,
		vitals: { bp: "", temp: "", weight: "" },
	},
	{
		id: 2,
		name: "Exam 2",
		status: "in-progress",
		patient: {
			name: "Ruth Garrett",
			age: 72,
			complaint: "Shortness of breath",
			bp: "158/92",
			temp: "98.2",
			weight: "165",
		},
		patientId: "p1",
		statusLabel: "In Progress",
		shapeSym: "▲",
		readyTimerStart: null,
		readyAlert: false,
		vitals: { bp: "158/92", temp: "98.2", weight: "165" },
	},
	{
		id: 3,
		name: "Exam 3",
		status: "ready",
		patient: {
			name: "Dennis Okonkwo",
			age: 58,
			complaint: "Knee pain",
			bp: "132/85",
			temp: "98.6",
			weight: "210",
		},
		patientId: "p2",
		statusLabel: "Ready for MD",
		shapeSym: "■",
		// Set the timer back 400 seconds to show the "waiting too long" alert on load.
		readyTimerStart: Date.now() - 400000,
		readyAlert: true,
		vitals: { bp: "132/85", temp: "98.6", weight: "210" },
	},
	{
		id: 4,
		name: "Exam 4",
		status: "clean",
		patient: null,
		patientId: null,
		statusLabel: "Clean/Ready",
		shapeSym: "◆",
		readyTimerStart: null,
		readyAlert: false,
		vitals: {},
	},
	{
		id: 5,
		name: "Exam 5",
		status: "clean",
		patient: null,
		patientId: null,
		statusLabel: "Clean/Ready",
		shapeSym: "◆",
		readyTimerStart: null,
		readyAlert: false,
		vitals: {},
	},
	{
		id: 6,
		name: "Procedure",
		status: "procedure",
		patient: {
			name: "J. Miller",
			age: 44,
			complaint: "Biopsy",
			bp: "125/78",
			temp: "98.4",
			weight: "180",
		},
		patientId: "p3",
		statusLabel: "Procedure",
		shapeSym: "✦",
		readyTimerStart: null,
		readyAlert: false,
		vitals: { bp: "125/78", temp: "98.4", weight: "180" },
	},
];

// Remembers the most recent user action so it can be reversed with Undo.
let lastAction = null;

// The order that room status groups appear on screen from top to bottom.
const statusOrder = ["ready", "in-progress", "clean", "dirty", "procedure"];

// Human-readable labels that match each internal status code.
const statusDisplayNames = {
	clean: "Clean/Ready",
	"in-progress": "In Progress",
	ready: "Ready for MD",
	dirty: "Dirty",
	procedure: "Procedure",
};

// All valid room statuses, used to populate dropdown menus.
const statusList = ["clean", "dirty", "in-progress", "ready", "procedure"];

// Refreshes both the lobby patient lists and the room grid at the same time.
function renderAll() {
	renderLobbySections();
	renderGroupedRooms();
}

// Draws the two lobby lists: patients not yet arrived and patients waiting for a room.
function renderLobbySections() {
	// Grab the two list containers and wipe them so they can be redrawn fresh.
	const notDiv = document.getElementById("notCheckedInList");
	const checkedDiv = document.getElementById("checkedInWaitingList");
	notDiv.innerHTML = "";
	checkedDiv.innerHTML = "";

	// Add one row per patient who hasn't arrived yet, with a check-in button.
	notCheckedIn.forEach((p) => {
		const row = document.createElement("div");
		row.className = "patient-row";
		row.setAttribute("draggable", "false");
		row.innerHTML = `<div class="patient-info">${p.name}</div><button class="checkin-btn" data-id="${p.id}">Check In</button>`;
		notDiv.appendChild(row);
	});

	// Add one draggable row per patient who checked in and is waiting for a room.
	checkedInWaiting.forEach((p) => {
		const row = document.createElement("div");
		row.className = "patient-row";
		row.setAttribute("draggable", "true");
		row.setAttribute("data-patient-id", p.id);

		// Calculate how many full minutes have passed since this patient checked in.
		const waitTime = p.checkinTime
			? Math.floor((Date.now() - p.checkinTime) / 60000)
			: 0;
		row.innerHTML = `<div class="patient-info">${p.name} (waited ${waitTime} min) <span class="insurance-badge">${p.insurance} $${p.copay}</span></div>`;
		checkedDiv.appendChild(row);
	});

	// Wire up drag behavior so staff can drag a patient card onto a room.
	document
		.querySelectorAll("#checkedInWaitingList .patient-row")
		.forEach((el) => {
			el.setAttribute("draggable", "true");
			el.setAttribute("tabindex", "0");

			// Provide a visual clue while dragging and store the patient id.
			el.addEventListener("dragstart", (e) => {
				e.dataTransfer.setData(
					"text/plain",
					el.getAttribute("data-patient-id"),
				);
				e.dataTransfer.effectAllowed = "move";
				el.classList.add("dragging");
			});

			// Cleanup visual state when drag ends (success or cancel).
			el.addEventListener("dragend", () => el.classList.remove("dragging"));

			// Also support keyboard users to focus the item (Enter to show a quick hint).
			el.addEventListener("keydown", (ev) => {
				if (ev.key === "Enter") {
					showToast("Tip: drag this patient onto a clean room card to assign.");
				}
			});
		});

	// Wire up the check-in button for each patient in the not-yet-arrived list.
	document.querySelectorAll("#notCheckedInList .checkin-btn").forEach((btn) => {
		btn.onclick = () => {
			// Find which patient belongs to this button.
			const id = btn.getAttribute("data-id");
			const p = notCheckedIn.find((x) => x.id === id);
			if (p) {
				// Remove the patient from the not-arrived list.
				notCheckedIn = notCheckedIn.filter((x) => x.id !== id);

				// Move them to the waiting list and stamp the time they checked in.
				checkedInWaiting.push({
					id: p.id,
					name: p.name,
					insurance: p.insurance,
					copay: p.copay,
					age: p.age,
					checkinTime: Date.now(),
				});
				showToast(`Checked in ${p.name} (${p.insurance}, co-pay $${p.copay})`);

				// Save this action so it can be undone.
				lastAction = { type: "checkin", patient: p };
				renderAll();
			}
		};
	});
}

// Draws all room cards on the board, grouped and sorted by their current status.
function renderGroupedRooms() {
	const container = document.getElementById("roomsContainer");

	// Clear the existing layout before rebuilding it.
	container.innerHTML = "";

	// Loop through statuses in display order and build a section for each.
	for (let status of statusOrder) {
		// Only show a group if at least one room has this status.
		const group = rooms.filter((r) => r.status === status);
		if (!group.length) continue;

		// Create the section wrapper with a heading and an inner grid.
		const groupDiv = document.createElement("div");
		groupDiv.className = "status-group";
		groupDiv.innerHTML = `<div class="group-title">${statusDisplayNames[status]}</div><div class="rooms-grid" id="grid-${status}"></div>`;
		container.appendChild(groupDiv);
		const grid = groupDiv.querySelector(".rooms-grid");

		// Build an individual card for each room in this status group.
		group.forEach((room) => {
			const card = document.createElement("div");

			// Pick the border color class that matches this room's status.
			let border = "";
			if (room.status === "clean") border = "status-clean";
			else if (room.status === "in-progress") border = "status-progress";
			else if (room.status === "ready") border = "status-ready";
			else if (room.status === "dirty") border = "status-dirty";
			else if (room.status === "procedure") border = "status-procedure";

			card.className = `room-card ${border}`;
			card.setAttribute("data-room-id", room.id);

			// Clicking a card opens the patient detail panel on the right.
			card.addEventListener("click", () => showSnapshot(room));

			// Allow patient cards to be dragged over this room and provide clearer
			// accept/reject feedback. We accept drops onto CLEAN rooms and also
			// onto READY rooms (with a warning) so staff can move patients when
			// needed.
			const acceptDrop = (patientId) => {
				// If no patient identified yet, fall back to status check only.
				if (!patientId) return room.status === "clean" || room.status === "ready";
				const patient = checkedInWaiting.find((p) => p.id === patientId);
				return !!patient && (room.status === "clean" || room.status === "ready");
			};

			card.addEventListener("dragenter", (e) => {
				e.preventDefault();
				const pid = e.dataTransfer.getData("text/plain");
				if (acceptDrop(pid)) {
					card.classList.add("drag-over-accept");
					card.classList.remove("drag-over-reject");
					e.dataTransfer.dropEffect = "move";
				} else {
					card.classList.add("drag-over-reject");
					card.classList.remove("drag-over-accept");
					e.dataTransfer.dropEffect = "none";
				}
			});

			card.addEventListener("dragover", (e) => {
				// Only allow the browser to drop if this room is a valid target.
				const pid = e.dataTransfer.getData("text/plain");
				if (acceptDrop(pid)) {
					e.preventDefault();
					e.dataTransfer.dropEffect = "move";
				} else {
					// Let it pass but do not preventDefault so the UI shows rejected.
				}
			});

			// Remove any drag classes when leaving.
			card.addEventListener("dragleave", () => {
				card.classList.remove("drag-over-accept", "drag-over-reject");
			});

			// Handle a patient being dropped onto this room.
			card.addEventListener("drop", (e) => {
				e.preventDefault();
				card.classList.remove("drag-over-accept", "drag-over-reject");

				// Find out which patient was dragged from the waiting list.
				const patientId = e.dataTransfer.getData("text/plain");
				const patient = checkedInWaiting.find((p) => p.id === patientId);

				if (!patient) {
					showToast("Invalid patient or drag source");
					return;
				}

				// Only allow the drop if the room is clean or ready.
				if (room.status === "clean" || room.status === "ready") {
					// If assigning to a READY room, warn the user but allow it.
					if (room.status === "ready")
						showToast(`Warning: assigning to ${room.name} which is Ready for MD`);

					// Mark the room as in-progress and assign the patient to it.
					room.status = "in-progress";
					room.patient = {
						name: patient.name,
						age: patient.age || 65,
						complaint: "New patient",
						bp: "",
						temp: "",
						weight: "",
					};
					room.patientId = patientId;
					room.statusLabel = "In Progress";
					room.shapeSym = "▲";
					room.vitals = { bp: "", temp: "", weight: "" };

					// Remove the patient from the waiting list now that they have a room.
					checkedInWaiting = checkedInWaiting.filter((p) => p.id !== patientId);
					showToast(`${patient.name} assigned to ${room.name}`);

					// Save this assignment so it can be undone.
					lastAction = {
						type: "roomAssign",
						patient: patient,
						roomId: room.id,
					};
					renderAll();
					showSnapshot(room);
				} else {
					showToast("Room not available for assignment");
				}
			});

			// Show an alert banner if the doctor has been kept waiting too long.
			let alertHtml =
				room.status === "ready" && room.readyAlert
					? '<div class="timer-alert">Waiting for MD over 5 min</div>'
					: "";

			// Fill the card with the room name, status symbol, patient name, and any alert.
			card.innerHTML = `<div class="room-header"><span class="room-name">${room.name}</span><span class="status-glyph">${room.shapeSym}</span></div>
                    <div class="room-status-text">${room.statusLabel}</div>
                    <div class="patient-name">${room.patient ? room.patient.name : room.status === "clean" ? "Vacant" : "—"}</div>${alertHtml}`;
			grid.appendChild(card);
		});
	}
}

// Tracks which room and which vital field the keypad is currently editing.
let activeRoomForVitals = null;
let currentVitalField = "bp";

// Opens a numeric keypad inside the snapshot panel so staff can type a vital sign.
function showKeypad(room, field) {
	// Remember what we're editing so the Save button knows where to write the value.
	currentVitalField = field;
	activeRoomForVitals = room;

	const snap = document.getElementById("snapshotContent");

	// Remove any keypad that is already showing before opening a new one.
	const existing = snap.querySelector(".keypad");
	if (existing) existing.remove();

	// Build the keypad layout with a text input and a grid of number buttons.
	const keypadDiv = document.createElement("div");
	keypadDiv.className = "keypad";
	keypadDiv.innerHTML = `<div class="keypad-title">Enter ${field.toUpperCase()} (use keypad)</div>
            <div class="vital-input-row"><label>Current value:</label><input type="text" id="vitalInput" placeholder="0" style="width:140px;"></div>
            <div class="keypad-grid" id="keypadGrid"></div>
            <div class="action-buttons" style="margin-top:12px;"><button class="btn-primary" id="saveVitalBtn">Save</button><button class="btn-secondary" id="cancelKeypad">Cancel</button></div>`;
	snap.appendChild(keypadDiv);

	const grid = document.getElementById("keypadGrid");

	// Include digits, a slash for blood pressure format, and a backspace key.
	const buttons = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "/", "⌫"];

	// Create one clickable tile for each button in the keypad.
	buttons.forEach((b) => {
		const btn = document.createElement("div");
		btn.className = "keypad-btn";
		btn.innerText = b;

		btn.onclick = () => {
			const input = document.getElementById("vitalInput");

			// Delete the last character if backspace was pressed, otherwise append the digit.
			if (b === "⌫") input.value = input.value.slice(0, -1);
			else input.value += b;
		};
		grid.appendChild(btn);
	});

	// Save the typed value into the correct vital field when the staff confirms.
	document.getElementById("saveVitalBtn").onclick = () => {
		const val = document.getElementById("vitalInput").value;

		// Write the value to whichever vital field was selected.
		if (field === "bp") room.vitals.bp = val;
		else if (field === "temp") room.vitals.temp = val;
		else if (field === "weight") room.vitals.weight = val;

		// Also copy the value onto the patient object so it shows in the snapshot.
		if (room.patient) {
			room.patient.bp = room.vitals.bp || room.patient.bp;
			room.patient.temp = room.vitals.temp || room.patient.temp;
			room.patient.weight = room.vitals.weight || room.patient.weight;
		}
		showToast(`${field} saved: ${val}`);
		showSnapshot(room);
	};

	// Cancel without saving and return to the normal room snapshot view.
	document.getElementById("cancelKeypad").onclick = () => showSnapshot(room);
}

// Simulates closing the EHR chart, which signals the room needs to be cleaned.
function closeEhrChart(room) {
	// Only allow closing the chart if the patient has already been seen by the doctor.
	if (room.status === "ready") {
		changeRoomStatus(room, "dirty");
		showToast(`Chart closed for ${room.patient.name}. Room marked dirty.`);
	} else {
		showToast("Cannot close chart: patient not in Ready for MD status.");
	}
}

// Populates the right-hand detail panel with information about the selected room.
function showSnapshot(room) {
	const snap = document.getElementById("snapshotContent");

	// Show a simple vacant message with a status changer if the room has no patient.
	if (room.status === "clean" || (!room.patient && room.status !== "dirty")) {
		snap.innerHTML = `<div>Room ${room.name} vacant</div><div class="action-buttons"><select id="statusSelect" class="status-dropdown">${statusList.map((s) => `<option value="${s}" ${room.status === s ? "selected" : ""}>${statusDisplayNames[s]}</option>`).join("")}</select><button class="btn-secondary" id="applyStatusBtn">Apply</button></div>`;
		document.getElementById("applyStatusBtn").onclick = () =>
			changeRoomStatus(room, document.getElementById("statusSelect").value);
		return;
	}

	// Show a dirty-room message with a button to mark it clean.
	if (room.status === "dirty") {
		snap.innerHTML = `<div>Room ${room.name} dirty</div><div class="action-buttons"><select id="statusSelect" class="status-dropdown">${statusList.map((s) => `<option value="${s}" ${room.status === s ? "selected" : ""}>${statusDisplayNames[s]}</option>`).join("")}</select><button class="btn-secondary" id="applyStatusBtn">Apply</button><button class="btn-clean" id="markCleanBtn">Mark Clean</button></div>`;
		document.getElementById("applyStatusBtn").onclick = () =>
			changeRoomStatus(room, document.getElementById("statusSelect").value);
		document.getElementById("markCleanBtn").onclick = () =>
			changeRoomStatus(room, "clean");
		return;
	}

	// Gather all the data we need to build the full patient detail view.
	const p = room.patient;
	const vitals = room.vitals || {};
	const ehr = ehrRecords[room.patientId] || {};

	// Only show insurance details for scheduled patients, not walk-ins.
	const insuranceHtml =
		room.patientId && !room.patientId.startsWith("walk")
			? `<div class="insurance-badge" style="margin-bottom:8px;">Insurance: ${ehr.insurance} | Co-pay: $${ehr.copay}</div>`
			: "";

	// Show the "Close EHR Chart" link only when the doctor has finished with the patient.
	let closeChartLink =
		room.status === "ready"
			? `<div style="margin-top:12px;"><a href="#" id="closeChartLink" class="chart-link">Close EHR Chart (mark room dirty)</a></div>`
			: "";

	// Render the full snapshot with vitals, action buttons, and status controls.
	snap.innerHTML = `${insuranceHtml}<div><strong>${p.name}</strong> · ${p.age || ehr.age || "?"} yrs</div>
            <div>Chief complaint: ${p.complaint || "Check-in"}</div>
            <div><span class="vital-badge">BP: ${vitals.bp || p.bp || "—"}</span> <span class="vital-badge">Temp: ${vitals.temp || p.temp || "—"} F</span> <span class="vital-badge">Weight: ${vitals.weight || p.weight || "—"} lbs</span></div>
            <div class="action-buttons">
                <button class="btn-secondary" id="editBp">Edit BP</button>
                <button class="btn-secondary" id="editTemp">Edit Temp</button>
                <button class="btn-secondary" id="editWeight">Edit Weight</button>
                ${room.status === "in-progress" ? `<button class="btn-primary" id="readyBtn">Ready for Doctor</button>` : ""}
                ${room.status === "ready" ? `<button class="btn-chart" id="viewChartBtn">View Full Chart</button>` : ""}
                <button class="btn-secondary" id="dirtyBtn">Mark Dirty</button>
            </div>
            ${closeChartLink}
            <div class="action-buttons" style="margin-top:8px;">
                <select id="statusSelect" class="status-dropdown">${statusList.map((s) => `<option value="${s}" ${room.status === s ? "selected" : ""}>${statusDisplayNames[s]}</option>`).join("")}</select>
                <button class="btn-secondary" id="applyStatusBtn">Apply Status</button>
            </div>`;

	// Wire each vital edit button to open the keypad for that specific field.
	document
		.getElementById("editBp")
		?.addEventListener("click", () => showKeypad(room, "bp"));

	document
		.getElementById("editTemp")
		?.addEventListener("click", () => showKeypad(room, "temp"));

	document
		.getElementById("editWeight")
		?.addEventListener("click", () => showKeypad(room, "weight"));

	// Advance the room to "Ready for MD" when the nurse finishes rooming the patient.
	document
		.getElementById("readyBtn")
		?.addEventListener("click", () => changeRoomStatus(room, "ready"));

	// Placeholder for opening the real EHR system in a future integration.
	document
		.getElementById("viewChartBtn")
		?.addEventListener("click", () =>
			alert(`[Demo] Opening EHR chart for ${p.name} (ID ${room.patientId})`),
		);

	// Allow staff to manually flag the room as dirty from this panel.
	document
		.getElementById("dirtyBtn")
		?.addEventListener("click", () => changeRoomStatus(room, "dirty"));

	// Apply whatever status was chosen in the dropdown.
	document
		.getElementById("applyStatusBtn")
		?.addEventListener("click", () =>
			changeRoomStatus(room, document.getElementById("statusSelect").value),
		);

	const closeLink = document.getElementById("closeChartLink");

	// Prevent the link from navigating and run the chart-close logic instead.
	if (closeLink)
		closeLink.addEventListener("click", (e) => {
			e.preventDefault();
			closeEhrChart(room);
		});
}

// Updates a room's status and resets or preserves patient data accordingly.
function changeRoomStatus(room, newStatus) {
	// Do nothing if the room is already in the requested status.
	if (room.status === newStatus) return;

	const old = room.status;

	// Save a snapshot of the room's current state so the change can be undone.
	lastAction = {
		type: "statusChange",
		roomId: room.id,
		oldStatus: old,
		patientData: room.patient,
		patientId: room.patientId,
		vitals: room.vitals,
	};

	// Apply the new status and update its display label.
	room.status = newStatus;
	room.statusLabel = statusDisplayNames[newStatus];

	// Map each status to its corresponding symbol shown on the room card.
	const symMap = {
		clean: "◆",
		dirty: "●",
		"in-progress": "▲",
		ready: "■",
		procedure: "✦",
	};
	room.shapeSym = symMap[newStatus];

	// Clear patient data when the room is marked clean or dirty — no one is in it.
	if (newStatus === "clean" || newStatus === "dirty") {
		room.patient = null;
		room.patientId = null;
		room.vitals = {};
	}

	// Start the "waiting for MD" timer when a patient is marked ready.
	if (newStatus === "ready") room.readyTimerStart = Date.now();
	else {
		// Clear the timer for any other status since the wait is no longer relevant.
		room.readyTimerStart = null;
		room.readyAlert = false;
	}

	renderAll();
	showToast(`Room ${room.name} changed to ${statusDisplayNames[newStatus]}`);
	showSnapshot(room);
}

// Reference to the walk-in patient modal dialog.
const walkinModal = document.getElementById("walkinModal");

// Open the walk-in form when the button is clicked.
document.getElementById("walkinBtn").onclick = () =>
	(walkinModal.style.display = "flex");

// Close the walk-in form without adding anyone.
document.getElementById("closeWalkinModal").onclick = () =>
	(walkinModal.style.display = "none");

// Calculates a person's age in years from their date of birth.
function calculateAge(dob) {
	// Convert the DOB string into a Date and measure the gap from today.
	const birth = new Date(dob);
	const diff = Date.now() - birth.getTime();
	const ageDate = new Date(diff);

	// Subtract the Unix epoch year (1970) to get the actual age in years.
	return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// Validates and submits the walk-in patient form.
document.getElementById("confirmWalkin").onclick = () => {
	// Read and clean up the values from each form field.
	const name = document.getElementById("walkinName").value.trim();
	const dob = document.getElementById("walkinDOB").value;
	const reason = document.getElementById("walkinReason").value.trim();

	// Stop and warn if the required fields are empty.
	if (!name || !dob) {
		alert("Please enter name and date of birth");
		return;
	}

	// Derive the patient's age from their birth date rather than asking staff to type it.
	const age = calculateAge(dob);

	// Give the walk-in a unique ID based on the current timestamp.
	const newId = "walk_" + Date.now();

	// Add the walk-in to the not-yet-arrived list as a self-pay patient.
	notCheckedIn.push({
		id: newId,
		name: name,
		age: age,
		insurance: "Self-pay",
		copay: 50,
	});

	showToast(`Walk-in ${name} added to scheduled arrivals (age ${age})`);

	// Close and reset the form so it is ready for the next walk-in.
	walkinModal.style.display = "none";
	document.getElementById("walkinName").value = "";
	document.getElementById("walkinDOB").value = "";
	document.getElementById("walkinReason").value = "";
	renderAll();
};

// Holds the timer ID for the current toast so a new message can cancel the old one.
let toastTimeout;

// Briefly shows a message bar at the top of the screen, then hides it automatically.
function showToast(msg) {
	const t = document.getElementById("topToast");

	// Write the message and make the toast visible.
	t.querySelector("span").innerHTML = msg;
	t.classList.remove("hidden");

	// Cancel any previous hide timer so overlapping messages don't disappear too early.
	clearTimeout(toastTimeout);

	// Automatically hide the toast after 3 seconds.
	toastTimeout = setTimeout(() => t.classList.add("hidden"), 3000);
}

// Reverses the most recent action when the Undo button is clicked.
document.getElementById("undoBtnTop").onclick = () => {
	if (lastAction?.type === "statusChange") {
		// Find the room that was changed and restore all its previous values.
		const r = rooms.find((x) => x.id === lastAction.roomId);
		if (r) {
			r.status = lastAction.oldStatus;
			r.patient = lastAction.patientData;
			r.patientId = lastAction.patientId;
			r.vitals = lastAction.vitals || {};
			r.statusLabel = statusDisplayNames[lastAction.oldStatus];

			// Restore the correct symbol for the previous status.
			const sm = {
				clean: "◆",
				dirty: "●",
				"in-progress": "▲",
				ready: "■",
				procedure: "✦",
			};
			r.shapeSym = sm[lastAction.oldStatus];
			renderAll();
			showToast("Undo status change");
			showSnapshot(r);
		}
	} else if (lastAction?.type === "checkin") {
		// Move the patient back to the not-arrived list and remove them from waiting.
		notCheckedIn.push(lastAction.patient);
		checkedInWaiting = checkedInWaiting.filter(
			(c) => c.id !== lastAction.patient.id,
		);
		renderAll();
		showToast("Undo check-in");
	} else if (lastAction?.type === "roomAssign") {
		// Find the room the patient was assigned to and release them back to the waiting list.
		const r = rooms.find((x) => x.id === lastAction.roomId);
		if (r && r.patientId === lastAction.patient.id) {
			r.status = "clean";
			r.patient = null;
			r.patientId = null;
			r.vitals = {};
			r.statusLabel = "Clean/Ready";
			r.shapeSym = "◆";
			checkedInWaiting.push(lastAction.patient);
			renderAll();
			showToast("Undo room assignment");
		}
	} else showToast("Nothing to undo");

	// Clear the saved action so Undo cannot be applied twice.
	lastAction = null;
};

// Checks wait times every second and flags anyone who has been waiting too long.
function updateTimers() {
	const now = Date.now();

	// Flag any lobby patient who has been waiting more than 15 minutes.
	checkedInWaiting.forEach((p) => {
		if (p.checkinTime && now - p.checkinTime > 15 * 60000) p.alert = true;
	});

	// Check each room to see if the doctor has been kept waiting over 5 minutes.
	rooms.forEach((r) => {
		if (r.status === "ready") {
			// Start the timer the first time we see this room in the ready state.
			if (!r.readyTimerStart) r.readyTimerStart = now;
			r.readyAlert = now - r.readyTimerStart > 5 * 60000;
		} else {
			// Clear the alert for any room that is no longer waiting for the doctor.
			r.readyTimerStart = null;
			r.readyAlert = false;
		}
	});
	renderAll();
}

// Run the timer check once per second.
setInterval(updateTimers, 1000);

// Updates the live clock display in the top bar every second.
function updateClock() {
	document.getElementById("liveClock").innerText =
		new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Start the clock immediately, then keep it updated every second.
setInterval(updateClock, 1000);
updateClock();

// Draw the full dashboard on initial page load.
renderAll();

// Open the snapshot for the first in-progress room so something useful is shown on load.
if (rooms.find((r) => r.status === "in-progress"))
	showSnapshot(rooms.find((r) => r.status === "in-progress"));

// ----- REPORTS MODAL AND CSV EXPORT (FIXED) -----
const modal = document.getElementById('reportModal');
const reportsBtn = document.getElementById('reportsBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Open modal and generate sample data
if (reportsBtn) {
    reportsBtn.onclick = () => {
        if (modal) {
            modal.style.display = 'flex';
            generateReportData();  // fills the modal with sample stats
        } else {
            console.error("Modal element not found");
        }
    };
}

// Close modal when clicking X
if (closeModalBtn) {
    closeModalBtn.onclick = () => {
        if (modal) modal.style.display = 'none';
    };
}

// Close modal when clicking outside the modal content
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};

// Function to populate modal with sample data
function generateReportData() {
    // Update stats grid
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card"><div class="stat-number">142</div><div class="stat-label">Patients Seen (7d)</div></div>
            <div class="stat-card"><div class="stat-number">12.4</div><div class="stat-label">Avg Wait Time (min)</div></div>
            <div class="stat-card"><div class="stat-number">68%</div><div class="stat-label">Clinic Health</div></div>
        `;
    }

    // Update room latency table (optional)
    const latencyTable = document.querySelector('#roomLatencyTable tbody');
    if (latencyTable) {
        latencyTable.innerHTML = `
            <tr><td>Exam 1</td><td>8.2 min</td><td>3.5 min</td></tr>
            <tr><td>Exam 2</td><td>15.7 min</td><td>5.2 min</td></tr>
            <tr><td>Exam 3</td><td>10.1 min</td><td>4.0 min</td></tr>
        `;
    }

    // Re-attach CSV export button events (they might have been overwritten)
    const dailyBtn = document.getElementById('exportDailyCSV');
    const weeklyBtn = document.getElementById('exportWeeklyCSV');
    if (dailyBtn) {
        dailyBtn.onclick = () => exportDailyCSV();
    }
    if (weeklyBtn) {
        weeklyBtn.onclick = () => exportWeeklyCSV();
    }
}

// CSV export functions
function exportDailyCSV() {
    const csvRows = [
        ["Date", "Total Patients", "Avg Wait (min)"],
        ["2025-05-01", "22", "12.3"],
        ["2025-05-02", "18", "11.8"],
        ["2025-05-03", "25", "13.2"]
    ];
    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    downloadCSV(csvContent, "daily_flow_report.csv");
}

function exportWeeklyCSV() {
    const csvContent = "Metric,Value\nPatients Seen (7d),142\nAvg Wait Time (min),12.4\nClinic Health (%),68";
    downloadCSV(csvContent, "weekly_summary.csv");
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Captures the entire HUD as a PNG image and triggers a download.
document.getElementById("exportPngBtn").addEventListener("click", function () {
	const el = document.getElementById("hudToCapture");
	const btn = this;

	// Hide the export button itself so it doesn't appear in the screenshot.
	btn.style.opacity = "0";
	btn.style.pointerEvents = "none";

	// Render the HUD element to a canvas at double resolution for sharpness.
	html2canvas(el, { scale: 2, backgroundColor: "#0D1B2A" })
		.then((canvas) => {
			// Restore the button now that the screenshot is taken.
			btn.style.opacity = "";
			btn.style.pointerEvents = "";

			// Create a temporary download link and click it to save the file.
			const link = document.createElement("a");
			link.download = "clinic_hud.png";
			link.href = canvas.toDataURL();
			link.click();
		})
		.catch(() => {
			// Restore the button even if something went wrong.
			btn.style.opacity = "";
			btn.style.pointerEvents = "";
			alert("Export failed");
		});
});
