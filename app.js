const state = {
  activeTab: "onboarding",
  city: "Kyiv",
  address: "",
  date: "Mon, 16 Nov",
  group: "Group 3.1",
  nowMinutes: 11 * 60 + 20, // 11:20
  segments: [
    { start: 0, end: 360, hasPower: false },     // 00:00 - 06:00
    { start: 360, end: 540, hasPower: true },   // 06:00 - 09:00
    { start: 540, end: 780, hasPower: false },  // 09:00 - 13:00
    { start: 780, end: 1020, hasPower: true },  // 13:00 - 17:00
    { start: 1020, end: 1200, hasPower: false },// 17:00 - 20:00
    { start: 1200, end: 1440, hasPower: true }  // 20:00 - 24:00
  ],
  tasks: [
    {
      id: 1,
      title: "Read a chapter for class",
      priority: "Medium",
      duration: 60,
      requiresPower: false,
      completed: true,
      hasDeadline: false,
      deadlineTime: null
    },
    {
      id: 2,
      title: "Plan tomorrow on paper",
      priority: "Low",
      duration: 20,
      requiresPower: false,
      completed: false,
      hasDeadline: false,
      deadlineTime: null
    },
    {
      id: 3,
      title: "Online lecture: Databases",
      priority: "High",
      duration: 90,
      requiresPower: true,
      completed: false,
      hasDeadline: false,
      deadlineTime: null
    },
    {
      id: 4,
      title: "Finish English presentation",
      priority: "High",
      duration: 60,
      requiresPower: true,
      completed: false,
      hasDeadline: false,
      deadlineTime: null
    },
    {
      id: 5,
      title: "Charge laptop & power bank",
      priority: "Medium",
      duration: 30,
      requiresPower: true,
      completed: false,
      hasDeadline: false,
      deadlineTime: null
    },
    {
      id: 6,
      title: "Laundry",
      priority: "Medium",
      duration: 60,
      requiresPower: true,
      completed: false,
      hasDeadline: false,
      deadlineTime: null
    }
  ],
  draft: {
    title: "",
    mode: "auto", // "auto" | "manual"
    requiresPower: true,
    priority: "High",
    durationMode: "60",
    customMinutes: 90,
    manualStart: "13:30",
    manualEnd: "14:50",
    hasDeadline: true,
    deadlineTime: "18:00"
  },
  map: {
    activeFilter: "Generator",
    selectedPlaceId: null,
    places: [
      {
        id: 1,
        num: 1,
        name: "Lumen Café",
        subtitle: "Café · open till 22:00",
        tags: ["Generator", "Wi-Fi", "Sockets"],
        distance: "0.4 km",
        xPct: 34,
        yPct: 26
      },
      {
        id: 2,
        num: 2,
        name: "Invincibility Point",
        subtitle: "Heating & charging point · 24/7",
        tags: ["Generator", "Sockets", "Wi-Fi"],
        distance: "0.7 km",
        xPct: 74,
        yPct: 44
      },
      {
        id: 3,
        num: 3,
        name: "Hub 24",
        subtitle: "Co-working space · open 24/7",
        tags: ["Generator", "Wi-Fi", "Sockets", "Quiet"],
        distance: "0.9 km",
        xPct: 58,
        yPct: 77
      }
    ]
  },
  mood: {
    selected: "good", // "great" | "good" | "okay" | "low" | "stressed"
    outageNotes: "",
    weekLog: [
      { day: "Tue", num: 10, mood: "good" },
      { day: "Wed", num: 11, mood: "okay" },
      { day: "Thu", num: 12, mood: "low" },
      { day: "Fri", num: 13, mood: "okay" },
      { day: "Sat", num: 14, mood: "great" },
      { day: "Sun", num: 15, mood: "good" },
      { day: "Mon", num: 16, mood: "good" }
    ]
  }
};

const boltSvg = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>
  </svg>
`;

const checkSvg = `
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
`;

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDurationShort(mins) {
  if (mins % 60 === 0) return `${mins / 60} h`;
  if (mins > 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} h ${m} min`;
  }
  return `${mins} min`;
}

function formatDurationLabel(mins) {
  if (mins % 60 === 0) return `${mins / 60} h`;
  return `${mins} min`;
}

function getDraftDurationMinutes() {
  if (state.draft.durationMode === "custom") {
    const parsed = parseInt(state.draft.customMinutes, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }
  return Number(state.draft.durationMode);
}

function getPriorityRank(priority) {
  if (priority === "Immediate") return 0;
  if (priority === "High") return 1;
  if (priority === "Medium") return 2;
  return 3;
}

function getCurrentPowerSegment() {
  return (
    state.segments.find((s) => state.nowMinutes >= s.start && state.nowMinutes < s.end) ||
    state.segments[0]
  );
}

function isPowerOnNow() {
  const seg = getCurrentPowerSegment();
  return Boolean(seg && seg.hasPower);
}

// Calculates free power-on minutes available before a deadline (or end of day if no deadline)
function getAvailablePowerMinutesBeforeDeadline(task, manualTasks) {
  const deadlineMins =
    task.hasDeadline && task.deadlineTime ? timeStrToMinutes(task.deadlineTime) : 1440;
  const effectiveDeadline = deadlineMins !== null ? deadlineMins : 1440;

  let totalAvailable = 0;

  for (const seg of state.segments) {
    if (!seg.hasPower || seg.end <= state.nowMinutes || seg.start >= effectiveDeadline) {
      continue;
    }

    const winStart = Math.max(seg.start, state.nowMinutes);
    const winEnd = Math.min(seg.end, effectiveDeadline);
    if (winEnd <= winStart) continue;

    const freeWindows = getFreeWindowsInRange(winStart, winEnd, manualTasks);
    for (const w of freeWindows) {
      totalAvailable += Math.max(0, w.end - w.start);
    }
  }

  return totalAvailable;
}

// Classifies an Immediate task:
// - fitsInPowerWindow: true if requiresPower and enough power-on time exists before deadline
// - overflowMinutes: remaining minutes needed outside power-on windows
function evaluateImmediateTask(task, manualTasks) {
  if (task.priority !== "Immediate" || task.isManual) {
    return {
      isTopPinned: false,
      fitsInPowerWindow: false,
      availablePowerMinutes: 0,
      overflowMinutes: 0
    };
  }

  if (!task.requiresPower) {
    return {
      isTopPinned: true,
      fitsInPowerWindow: false,
      availablePowerMinutes: 0,
      overflowMinutes: 0
    };
  }

  const availablePower = getAvailablePowerMinutesBeforeDeadline(task, manualTasks);
  const fitsInPowerWindow = availablePower >= task.duration;
  const overflowMinutes = Math.max(0, task.duration - availablePower);

  return {
    isTopPinned: !fitsInPowerWindow,
    fitsInPowerWindow,
    availablePowerMinutes: availablePower,
    overflowMinutes
  };
}

function buildIntervalBlocks(taskList = state.tasks) {
  const manualTasks = taskList.filter((t) => t.isManual);

  const activeAutoTasks = taskList
    .filter((t) => !t.isManual && !t.completed)
    .map((t) => ({
      ...t,
      immediateInfo: evaluateImmediateTask(t, manualTasks)
    }))
    .sort((a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority));

  const topPinnedTasks = activeAutoTasks.filter((t) => t.immediateInfo.isTopPinned);
  const schedulableAutoTasks = activeAutoTasks.filter((t) => !t.immediateInfo.isTopPinned);

  const blocks = state.segments.map((seg) => {
    const isPast = seg.end <= state.nowMinutes;
    const isCurrent = seg.start < state.nowMinutes && seg.end > state.nowMinutes;
    const activeStart = isPast
      ? seg.end
      : isCurrent
        ? Math.max(seg.start, state.nowMinutes)
        : seg.start;

    const fixedInBlock = manualTasks
      .filter((t) => !t.completed && t.fixedStart >= seg.start && t.fixedStart < seg.end)
      .map((t) => ({
        ...t,
        startTime: t.fixedStart,
        endTime: t.fixedEnd,
        duration: t.fixedEnd - t.fixedStart,
        powerMismatch: t.requiresPower && !seg.hasPower
      }));

    const freeWindows = isPast
      ? []
      : getFreeWindowsInRange(activeStart, seg.end, manualTasks.filter((t) => !t.completed));

    return {
      start: seg.start,
      end: seg.end,
      hasPower: seg.hasPower,
      isPast,
      isCurrent,
      activeStart,
      freeWindows,
      assigned: [...fixedInBlock],
      freeMinutes: 0
    };
  });

  const overflowTasks = [];

  for (const task of schedulableAutoTasks) {
    let placed = false;

    for (const block of blocks) {
      if (block.isPast || block.hasPower !== task.requiresPower) continue;

      const win = block.freeWindows.find(
        (w) => w.cursor + task.duration <= w.end
      );

      if (win) {
        const startTime = win.cursor;
        const endTime = win.cursor + task.duration;

        const originalTask = state.tasks.find((t) => t.id === task.id);
        if (originalTask) {
          originalTask.lastStartTime = startTime;
          originalTask.lastEndTime = endTime;
          originalTask.lastBlockHasPower = block.hasPower;
        }

        block.assigned.push({
          ...task,
          startTime,
          endTime
        });
        win.cursor = endTime;
        placed = true;
        break;
      }
    }

    if (!placed) {
      overflowTasks.push(task);
    }
  }

  for (const task of topPinnedTasks) {
    if (!task.requiresPower || task.immediateInfo.availablePowerMinutes <= 0) continue;

    let remainingToReserve = task.immediateInfo.availablePowerMinutes;
    for (const block of blocks) {
      if (block.isPast || !block.hasPower || remainingToReserve <= 0) continue;

      for (const win of block.freeWindows) {
        if (remainingToReserve <= 0) break;
        const winFree = win.end - win.cursor;
        if (winFree <= 0) continue;

        const chunk = Math.min(winFree, remainingToReserve);
        block.assigned.push({
          ...task,
          id: `${task.id}__part__${win.cursor}`,
          title: `${task.title} (power portion)`,
          duration: chunk,
          startTime: win.cursor,
          endTime: win.cursor + chunk,
          isPartialChunk: true
        });
        win.cursor += chunk;
        remainingToReserve -= chunk;
      }
    }
  }

  for (const block of blocks) {
    block.assigned.sort((a, b) => a.startTime - b.startTime);
    block.freeMinutes = block.freeWindows.reduce(
      (sum, w) => sum + Math.max(0, w.end - w.cursor),
      0
    );
  }
  const completedTasks = taskList.filter((t) => t.completed);

  state.overflowTasks = overflowTasks;
  return { blocks, topPinnedTasks, completedTasks };
}

function renderStatusCard() {
  const card = document.getElementById("statusCard");
  const currentSeg = getCurrentPowerSegment();

  const remaining = Math.max(0, currentSeg.end - state.nowMinutes);
  const title = currentSeg.hasPower ? "Power on now" : "No power now";
  const subtitle = currentSeg.hasPower
    ? `Off at ${formatTime(currentSeg.end)} · in ${formatDurationShort(remaining)}`
    : `Back on at ${formatTime(currentSeg.end)} · in ${formatDurationShort(remaining)}`;

  const barStart = 0;
  const barEnd = 1440;
  const totalSpan = barEnd - barStart;
  const nowPct = Math.min(100, Math.max(0, ((state.nowMinutes - barStart) / totalSpan) * 100));

  const segmentsHtml = state.segments
    .map((seg) => {
      const widthPct = ((seg.end - seg.start) / totalSpan) * 100;
      const cls = seg.hasPower ? "on" : "off";
      return `<div class="timeline-segment ${cls}" style="width: ${widthPct}%"></div>`;
    })
    .join("");

  card.innerHTML = `
    <div class="status-top">
      <div class="status-icon-box ${currentSeg.hasPower ? "power-on" : "no-power"}">
        ${boltSvg}
      </div>
      <div>
        <div class="status-title">${title}</div>
        <div class="status-subtitle">${subtitle}</div>
      </div>
    </div>

    <div class="timeline-wrapper">
      <div class="timeline-track">${segmentsHtml}</div>
      <div class="now-marker" style="left: ${nowPct}%"></div>
      <div class="timeline-ticks">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>

    <div class="legend">
      <span class="legend-item"><span class="swatch-on"></span>Power on</span>
      <span class="legend-item"><span class="swatch-off"></span>No power</span>
      <span class="legend-item"><span class="swatch-now"></span>Now ${formatTime(state.nowMinutes)}</span>
    </div>
  `;
}

function renderPlan() {
  const container = document.getElementById("planContainer");
  const { blocks, topPinnedTasks, completedTasks } = buildIntervalBlocks();
  const powerNow = isPowerOnNow();

  const immediateSectionHtml =
    topPinnedTasks.length > 0
      ? `
        <section class="immediate-section">
          <div class="immediate-header">
            <span class="immediate-badge">Immediate</span>
            <span class="immediate-sub">Pinned on top</span>
          </div>
          ${topPinnedTasks
            .map((task) => {
              const parts = [`Immediate`, formatDurationLabel(task.duration)];
              if (task.hasDeadline && task.deadlineTime) {
                parts.push(`due ${task.deadlineTime}`);
              }
              if (task.requiresPower && task.immediateInfo.overflowMinutes > 0) {
                parts.push(
                  `catch up ${formatDurationShort(task.immediateInfo.overflowMinutes)} without power`
                );
              }

              const showMapBtn = !powerNow && task.requiresPower;
              const mapBtnHtml = showMapBtn
                ? `<button type="button" class="map-link-btn" data-open-map="Wi-Fi">Wi-Fi / Generator</button>`
                : "";

              return `
                <div class="task-row" data-task-id="${task.id}">
                  <div class="task-left">
                    <div class="checkbox ${task.completed ? "checked" : ""}">
                      ${task.completed ? checkSvg : ""}
                    </div>
                    <div>
                      <div class="task-title-row">
                        <span class="task-title ${task.completed ? "completed" : ""}">${task.title}</span>
                      </div>
                      <div class="task-sub">${parts.join(" · ")}</div>
                    </div>
                  </div>
                  <div class="task-actions-right">
                    ${mapBtnHtml}
                    <div class="task-time">${task.hasDeadline && task.deadlineTime ? task.deadlineTime : "Now"}</div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </section>
      `
      : "";
  const renderBlockCard = (block) => {
    const modeCls = block.hasPower ? "on" : "off";
    const stateCls = block.isPast
      ? "is-past"
      : block.isCurrent
        ? "is-current"
        : "";
    const title = block.hasPower ? "Power on" : "No power";
    const desc = block.hasPower
      ? "Laptop, calls, charging, chores"
      : "Offline tasks and rest";
    const rangeText = `${formatTime(block.start)}–${formatTime(block.end)}`;

    const tasksHtml = block.assigned
      .map((task) => {
        const badges = [
          task.isManual ? `<span class="fixed-badge">Fixed</span>` : "",
          task.powerMismatch
            ? `<span class="power-warn-badge">No power scheduled</span>`
            : ""
        ].join("");

        const deadlinePart =
          task.hasDeadline && task.deadlineTime ? ` · due ${task.deadlineTime}` : "";

        const subText = task.isManual
          ? `${formatTime(task.startTime)}–${formatTime(task.endTime)} · ${formatDurationLabel(task.duration)}`
          : `${task.priority} priority · ${formatDurationLabel(task.duration)}${deadlinePart}`;

        const rightTime = task.isManual
          ? `${formatTime(task.startTime)}–${formatTime(task.endTime)}`
          : formatTime(task.startTime);

        return `
          <div class="task-row" data-task-id="${task.id}">
            <div class="task-left">
              <div class="checkbox ${task.completed ? "checked" : ""}">
                ${task.completed ? checkSvg : ""}
              </div>
              <div>
                <div class="task-title-row">
                  <span class="task-title ${task.completed ? "completed" : ""}">${task.title}</span>
                  ${badges}
                </div>
                <div class="task-sub">${subText}</div>
              </div>
            </div>
            <div class="task-time">${rightTime}</div>
          </div>
        `;
      })
      .join("");

    const freeHtml =
      !block.isPast && block.freeMinutes > 0
        ? `<div class="free-row">Free: ${formatDurationShort(block.freeMinutes)}</div>`
        : "";

    return `
      <article class="interval-card ${stateCls}">
        <div class="interval-header">
          <div class="interval-left">
            <div class="interval-badge ${modeCls}">${boltSvg}</div>
            <div>
              <div class="interval-title">${title}</div>
              <div class="interval-desc">${desc}</div>
            </div>
          </div>
          <div class="interval-range ${modeCls}">${rangeText}</div>
        </div>
        ${tasksHtml}
        ${freeHtml}
      </article>
    `;
  };

  const pastBlocksHtml = blocks.filter((b) => b.isPast).map(renderBlockCard).join("");
  const activeAndFutureBlocksHtml = blocks.filter((b) => !b.isPast).map(renderBlockCard).join("");
  const completedSectionHtml =
    completedTasks.length > 0
      ? `
        <article class="interval-card completed-section">
          <div class="interval-header">
            <div class="interval-left">
              <div class="interval-badge done">${checkSvg}</div>
              <div>
                <div class="interval-title">Completed tasks</div>
                <div class="interval-desc">Done for today</div>
              </div>
            </div>
            <div class="interval-range done">${completedTasks.length}</div>
          </div>
          ${completedTasks
            .map((task) => {
              const deadlinePart =
                task.hasDeadline && task.deadlineTime ? ` · due ${task.deadlineTime}` : "";
              const subText = task.isManual
                ? `${formatTime(task.fixedStart)}–${formatTime(task.fixedEnd)} · ${formatDurationLabel(task.duration)}`
                : `${task.priority} priority · ${formatDurationLabel(task.duration)}${deadlinePart}`;

              return `
                <div class="task-row" data-task-id="${task.id}">
                  <div class="task-left">
                    <div class="checkbox checked">${checkSvg}</div>
                    <div>
                      <div class="task-title-row">
                        <span class="task-title completed">${task.title}</span>
                      </div>
                      <div class="task-sub">${subText}</div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </article>
      `
      : "";

  container.innerHTML =
    pastBlocksHtml + immediateSectionHtml + activeAndFutureBlocksHtml + completedSectionHtml;
  container.querySelectorAll(".map-link-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.map.activeFilter = btn.dataset.openMap || "Wi-Fi";
      state.map.selectedPlaceId = null;
      switchTab("map");
    });
  });

  container.querySelectorAll(".task-row").forEach((row) => {
    row.addEventListener("click", () => {
      const rawId = row.dataset.taskId;
      const numericId = Number(rawId);
      const target = state.tasks.find((t) => t.id === numericId || String(t.id) === rawId);
      if (target) {
        target.completed = !target.completed;
        renderPlan();
        renderPlanPreview();
      }
    });
  });
}

function renderPlanPreview() {
  const labelEl = document.getElementById("planPreviewLabel");
  const previewEl = document.getElementById("planPreviewValue");
  const durationHint = document.getElementById("manualDurationHint");
  if (!previewEl || !labelEl) return;

  previewEl.classList.remove("is-warning", "is-caution");

  if (state.draft.mode === "manual") {
    labelEl.textContent = "Fixed time slot";
    const start = timeStrToMinutes(state.draft.manualStart);
    const end = timeStrToMinutes(state.draft.manualEnd);

    if (start === null || end === null || end <= start) {
      if (durationHint) durationHint.textContent = "End time must be after start time";
      previewEl.textContent = "Invalid time range";
      previewEl.classList.add("is-warning");
      return;
    }

    const dur = end - start;
    if (durationHint) {
      durationHint.textContent = `Duration: ${formatDurationShort(dur)} · Highest priority`;
    }

    if (hasManualOverlap(start, end)) {
      previewEl.textContent = `${formatTime(start)}–${formatTime(end)} · overlaps another fixed task`;
      previewEl.classList.add("is-warning");
      return;
    }

    const startSeg = state.segments.find((s) => start >= s.start && start < s.end);
    const hasPowerAtStart = startSeg ? startSeg.hasPower : false;
    const powerLabel = hasPowerAtStart ? "power on" : "no power";

    if (state.draft.requiresPower && !hasPowerAtStart) {
      previewEl.textContent = `${formatTime(start)}–${formatTime(end)} · ${powerLabel} (warning)`;
      previewEl.classList.add("is-caution");
    } else {
      previewEl.textContent = `${formatTime(start)}–${formatTime(end)} · ${powerLabel}`;
    }
    return;
  }

  labelEl.textContent = "The app will plan it for";
  const duration = getDraftDurationMinutes();
  const draftId = "__draft__";
  const draftTask = {
    id: draftId,
    title: state.draft.title.trim() || "New task",
    duration,
    requiresPower: state.draft.requiresPower,
    priority: state.draft.priority,
    isManual: false,
    completed: false,
    hasDeadline: state.draft.priority === "Immediate" && state.draft.hasDeadline,
    deadlineTime:
      state.draft.priority === "Immediate" && state.draft.hasDeadline
        ? state.draft.deadlineTime
        : null
  };

  const manualTasks = state.tasks.filter((t) => t.isManual);
  const evalInfo = evaluateImmediateTask(draftTask, manualTasks);

  if (evalInfo.isTopPinned) {
    if (draftTask.requiresPower && evalInfo.overflowMinutes > 0) {
      previewEl.textContent = `Pinned on top · ${formatDurationShort(evalInfo.overflowMinutes)} catch-up without power`;
      previewEl.classList.add("is-caution");
    } else {
      previewEl.textContent = `Pinned on top · offline / immediate`;
      previewEl.classList.add("is-caution");
    }
    return;
  }

  const simulatedTasks = [...state.tasks, draftTask];
  const { blocks } = buildIntervalBlocks(simulatedTasks);
  let foundSlot = null;

  for (const block of blocks) {
    const match = block.assigned.find((t) => t.id === draftId);
    if (match) {
      foundSlot = {
        start: match.startTime,
        end: match.endTime,
        hasPower: block.hasPower
      };
      break;
    }
  }

  if (!foundSlot) {
    previewEl.textContent = "No matching slot today";
    previewEl.classList.add("is-warning");
    return;
  }

  const powerLabel = foundSlot.hasPower ? "power on" : "no power";
  previewEl.textContent = `${formatTime(foundSlot.start)}–${formatTime(foundSlot.end)} · ${powerLabel}`;
}

function switchTab(tabName) {
  state.activeTab = tabName;
  const frame = document.querySelector(".phone-frame");
  if (frame) {
    frame.classList.toggle("is-onboarding", tabName === "onboarding");
  }

  document.querySelectorAll(".tab-view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${tabName}`);
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  if (tabName === "onboarding") renderOnboarding();
  if (tabName === "today") {
    renderStatusCard();
    renderPlan();
    requestAnimationFrame(() => scrollToCurrentBlock("auto"));
  }
  if (tabName === "add") renderPlanPreview();
  if (tabName === "map") renderMap();
  if (tabName === "mood") renderMood();
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("taskTitleInput").addEventListener("input", (e) => {
    state.draft.title = e.target.value;
  });

  document.querySelectorAll("#powerOptions .choice-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#powerOptions .choice-pill")
        .forEach((b) => b.classList.remove("active-filled"));
      btn.classList.add("active-filled");
      state.draft.requiresPower = btn.dataset.power === "true";
      renderPlanPreview();
    });
  });

  document.querySelectorAll("#priorityOptions .choice-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#priorityOptions .choice-pill")
        .forEach((b) => b.classList.remove("active-outline"));
      btn.classList.add("active-outline");
      state.draft.priority = btn.dataset.priority;

      const deadlineSection = document.getElementById("deadlineSection");
      if (deadlineSection) {
        deadlineSection.classList.toggle("hidden", state.draft.priority !== "Immediate");
      }

      renderPlanPreview();
    });
  });

  const deadlineInputBox = document.getElementById("deadlineInputBox");
  const deadlineTimeInput = document.getElementById("deadlineTimeInput");

  document.querySelectorAll("#deadlineToggleOptions .choice-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#deadlineToggleOptions .choice-pill")
        .forEach((b) => b.classList.remove("active-filled"));
      btn.classList.add("active-filled");
      state.draft.hasDeadline = btn.dataset.hasDeadline === "true";
      if (deadlineInputBox) {
        deadlineInputBox.classList.toggle("hidden", !state.draft.hasDeadline);
      }
      renderPlanPreview();
    });
  });

  if (deadlineTimeInput) {
    deadlineTimeInput.addEventListener("input", (e) => {
      state.draft.deadlineTime = e.target.value;
      renderPlanPreview();
    });
  }

  const customBox = document.getElementById("customDurationBox");
  const customInput = document.getElementById("customDurationInput");

  document.querySelectorAll("#durationOptions .choice-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#durationOptions .choice-pill")
        .forEach((b) => b.classList.remove("active-filled"));
      btn.classList.add("active-filled");

      const mode = btn.dataset.duration;
      state.draft.durationMode = mode;
      customBox.classList.toggle("hidden", mode !== "custom");

      if (mode === "custom") {
        customInput.focus();
      }
      renderPlanPreview();
    });
  });

  customInput.addEventListener("input", (e) => {
    state.draft.customMinutes = e.target.value;
    renderPlanPreview();
  });

  document.getElementById("addTaskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const titleInput = document.getElementById("taskTitleInput");
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }

    if (state.draft.mode === "manual") {
      const start = timeStrToMinutes(state.draft.manualStart);
      const end = timeStrToMinutes(state.draft.manualEnd);
      if (start === null || end === null || end <= start || hasManualOverlap(start, end)) {
        renderPlanPreview();
        return;
      }

      state.tasks.push({
        id: Date.now(),
        title,
        isManual: true,
        fixedStart: start,
        fixedEnd: end,
        duration: end - start,
        requiresPower: state.draft.requiresPower,
        completed: false,
        hasDeadline: false,
        deadlineTime: null
      });
    } else {
      state.tasks.push({
        id: Date.now(),
        title,
        isManual: false,
        priority: state.draft.priority,
        duration: getDraftDurationMinutes(),
        requiresPower: state.draft.requiresPower,
        completed: false,
        hasDeadline: state.draft.priority === "Immediate" && state.draft.hasDeadline,
        deadlineTime:
          state.draft.priority === "Immediate" && state.draft.hasDeadline
            ? state.draft.deadlineTime
            : null
      });
    }

    titleInput.value = "";
    state.draft.title = "";

    renderPlan();
    renderPlanPreview();
    switchTab("today");
  });

  document.querySelectorAll("#mapFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll("#mapFilters .filter-chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.map.activeFilter = chip.dataset.filter;
      state.map.selectedPlaceId = null;
      renderMap();
    });
  });

  const notesInput = document.getElementById("outageNotesInput");
  if (notesInput) {
    notesInput.addEventListener("input", (e) => {
      state.mood.outageNotes = e.target.value;
    });
  }

  const breathingBtn = document.getElementById("breathingBtn");
  if (breathingBtn) {
    breathingBtn.addEventListener("click", startBreathingBreak);
  }

  const addressInput = document.getElementById("addressInput");
  if (addressInput) {
    addressInput.addEventListener("input", (e) => {
      state.address = e.target.value;
      const normalized = state.address.trim().toLowerCase();
      if (normalized.includes("obolon") || normalized.includes("оболон")) {
        state.group = "Group 2.1";
      } else if (normalized.includes("pechersk") || normalized.includes("печерс")) {
        state.group = "Group 4.2";
      } else {
        state.group = "Group 3.1";
      }
      renderOnboarding();
    });
  }

  const planMyDayBtn = document.getElementById("planMyDayBtn");
  if (planMyDayBtn) {
    planMyDayBtn.addEventListener("click", () => {
      switchTab("today");
    });
  }

  document.querySelectorAll(".group-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      switchTab("onboarding");
    });
  });

  const priorityGroup = document.getElementById("priorityFieldGroup");
  const autoDurationGroup = document.getElementById("autoDurationGroup");
  const manualRangeGroup = document.getElementById("manualRangeGroup");
  const submitBtn = document.getElementById("submitTaskBtn");

  document.querySelectorAll("#modeOptions .choice-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#modeOptions .choice-pill")
        .forEach((b) => b.classList.remove("active-filled"));
      btn.classList.add("active-filled");

      const mode = btn.dataset.mode;
      state.draft.mode = mode;
      const isManual = mode === "manual";

      priorityGroup.classList.toggle("hidden", isManual);
      autoDurationGroup.classList.toggle("hidden", isManual);
      manualRangeGroup.classList.toggle("hidden", !isManual);
      if (isManual) {
        const deadlineSection = document.getElementById("deadlineSection");
        if (deadlineSection) deadlineSection.classList.add("hidden");
      } else {
        const deadlineSection = document.getElementById("deadlineSection");
        if (deadlineSection) {
          deadlineSection.classList.toggle("hidden", state.draft.priority !== "Immediate");
        }
      }
      submitBtn.textContent = isManual ? "Add fixed task" : "Add and auto-plan";

      renderPlanPreview();
    });
  });

  document.getElementById("manualStartInput").addEventListener("input", (e) => {
    state.draft.manualStart = e.target.value;
    renderPlanPreview();
  });

  document.getElementById("manualEndInput").addEventListener("input", (e) => {
    state.draft.manualEnd = e.target.value;
    renderPlanPreview();
  });
}

function getFilteredPlaces() {
  return state.map.places.filter((place) =>
    place.tags.includes(state.map.activeFilter)
  );
}

function renderMap() {
  const canvas = document.getElementById("mapCanvas");
  const list = document.getElementById("placesList");
  if (!canvas || !list) return;

  const filtered = getFilteredPlaces();

  const pinsHtml = filtered
    .map((place) => {
      const selCls = state.map.selectedPlaceId === place.id ? "selected" : "";
      return `
        <button
          type="button"
          class="map-pin ${selCls}"
          data-place-id="${place.id}"
          style="left: ${place.xPct}%; top: ${place.yPct}%;"
          aria-label="Location ${place.num}: ${place.name}"
        >${place.num}</button>
      `;
    })
    .join("");

  canvas.innerHTML = `
    <div class="map-road-h"></div>
    <div class="map-road-v"></div>
    <div class="user-dot-outer" title="Your location">
      <div class="user-dot-inner"></div>
    </div>
    ${pinsHtml}
  `;

  list.innerHTML = filtered
    .map((place) => {
      const selCls = state.map.selectedPlaceId === place.id ? "selected" : "";
      return `
        <article class="place-card ${selCls}" data-place-id="${place.id}">
          <div class="place-left">
            <div class="place-num">${place.num}</div>
            <div>
              <div class="place-title">${place.name}</div>
              <div class="place-meta">${place.subtitle}</div>
              <div class="place-tags">${place.tags.join(" · ")}</div>
            </div>
          </div>
          <div class="place-distance">${place.distance}</div>
        </article>
      `;
    })
    .join("");

  const selectPlace = (id) => {
    state.map.selectedPlaceId = state.map.selectedPlaceId === id ? null : id;
    renderMap();
  };

  canvas.querySelectorAll(".map-pin").forEach((pin) => {
    pin.addEventListener("click", () => selectPlace(Number(pin.dataset.placeId)));
  });

  list.querySelectorAll(".place-card").forEach((card) => {
    card.addEventListener("click", () => selectPlace(Number(card.dataset.placeId)));
  });
}

const MOOD_OPTIONS = [
  { id: "great", label: "Great" },
  { id: "good", label: "Good" },
  { id: "okay", label: "Okay" },
  { id: "low", label: "Low" },
  { id: "stressed", label: "Stressed" }
];

let breathingTimerId = null;

function renderMood() {
  const scaleEl = document.getElementById("moodScale");
  const weekEl = document.getElementById("weekLogGrid");
  const notesEl = document.getElementById("outageNotesInput");
  if (!scaleEl || !weekEl || !notesEl) return;

  scaleEl.innerHTML = MOOD_OPTIONS.map((opt) => {
    const isSel = state.mood.selected === opt.id;
    return `
      <button
        type="button"
        class="mood-option ${isSel ? "selected" : ""}"
        data-mood="${opt.id}"
      >
        <span class="mood-dot mood-dot--${opt.id}" aria-hidden="true"></span>
        <span>${opt.label}</span>
      </button>
    `;
  }).join("");

  const todayItem = state.mood.weekLog[state.mood.weekLog.length - 1];
  if (todayItem) {
    todayItem.mood = state.mood.selected;
  }

  weekEl.innerHTML = state.mood.weekLog
    .map(
      (entry) => `
      <div class="day-log-item">
        <span class="day-log-name">${entry.day}</span>
        <span class="day-log-dot mood-dot--${entry.mood}" aria-hidden="true"></span>
        <span class="day-log-num">${entry.num}</span>
      </div>
    `
    )
    .join("");

  if (document.activeElement !== notesEl) {
    notesEl.value = state.mood.outageNotes;
  }

  scaleEl.querySelectorAll(".mood-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mood.selected = btn.dataset.mood;
      renderMood();
    });
  });
}

function startBreathingBreak() {
  const btn = document.getElementById("breathingBtn");
  const statusEl = document.getElementById("breathingStatus");
  if (!btn || !statusEl) return;

  if (breathingTimerId !== null) {
    clearInterval(breathingTimerId);
    breathingTimerId = null;
    btn.textContent = "Take a 1-minute breathing break";
    statusEl.classList.add("hidden");
    statusEl.textContent = "";
    return;
  }

  let remaining = 60;
  statusEl.classList.remove("hidden");

  const updatePhase = () => {
    const phase = remaining % 10 >= 5 ? "Inhale slowly..." : "Exhale gently...";
    statusEl.textContent = `${phase} (${remaining}s left — tap to stop)`;
  };

  btn.textContent = "Stop breathing break";
  updatePhase();

  breathingTimerId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(breathingTimerId);
      breathingTimerId = null;
      btn.textContent = "Take a 1-minute breathing break";
      statusEl.textContent = "Break complete — ready for the next step.";
      return;
    }
    updatePhase();
  }, 1000);
}

function syncGroupLabels() {
  document.querySelectorAll(".group-pill").forEach((btn) => {
    btn.textContent = state.group;
  });
  const onboardGroup = document.getElementById("onboardGroupValue");
  const onboardCity = document.getElementById("onboardCityBadge");
  if (onboardGroup) onboardGroup.textContent = state.group;
  if (onboardCity) onboardCity.textContent = state.city;
}

function renderOnboarding() {
  const bar = document.getElementById("miniScheduleBar");
  const summary = document.getElementById("outageSummaryText");
  const addrInput = document.getElementById("addressInput");
  if (!bar || !summary) return;

  const totalSpan = 1440; // 00:00 .. 24:00
  let totalOffMinutes = 0;

  bar.innerHTML = state.segments
    .map((seg) => {
      const duration = seg.end - seg.start;
      if (!seg.hasPower) totalOffMinutes += duration;
      const widthPct = (duration / totalSpan) * 100;
      const cls = seg.hasPower ? "on" : "off";
      return `<div class="timeline-segment ${cls}" style="width: ${widthPct}%"></div>`;
    })
    .join("");

  const offHours = Math.round((totalOffMinutes / 60) * 10) / 10;
  const formattedHours = Number.isInteger(offHours) ? `${offHours} h` : `${offHours} h`;
  summary.textContent = `Today: ${formattedHours} without power`;

  if (addrInput && document.activeElement !== addrInput) {
    addrInput.value = state.address;
  }

  syncGroupLabels();
}

function scrollToCurrentBlock(behavior = "auto") {
  const container = document.getElementById("planContainer");
  if (!container) return;

  const target =
    container.querySelector(".immediate-section") ||
    container.querySelector(".interval-card.is-current") ||
    container.querySelector(".interval-card:not(.is-past)");

  if (!target) return;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offset = targetRect.top - containerRect.top + container.scrollTop;

  container.scrollTo({
    top: Math.max(0, offset),
    behavior
  });
}

// Utilities for time management and finding free slots around fixed tasks
function timeStrToMinutes(str) {
  if (!str || !str.includes(":")) return null;
  const [h, m] = str.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function hasManualOverlap(start, end, taskList = state.tasks) {
  return taskList.some(
    (t) => t.isManual && start < t.fixedEnd && end > t.fixedStart
  );
}

// builds available time gaps within the interval [winStart, winEnd], accounting for fixed tasks.
function getFreeWindowsInRange(winStart, winEnd, manualTasks) {
  const blockers = manualTasks
    .filter((t) => t.fixedEnd > winStart && t.fixedStart < winEnd)
    .map((t) => ({
      start: Math.max(winStart, t.fixedStart),
      end: Math.min(winEnd, t.fixedEnd)
    }))
    .sort((a, b) => a.start - b.start);

  const windows = [];
  let cursor = winStart;

  for (const b of blockers) {
    if (b.start > cursor) {
      windows.push({ start: cursor, end: b.start, cursor });
    }
    cursor = Math.max(cursor, b.end);
  }

  if (cursor < winEnd) {
    windows.push({ start: cursor, end: winEnd, cursor });
  }

  return windows;
}

switchTab(state.activeTab);
bindEvents();