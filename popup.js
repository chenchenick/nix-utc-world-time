const addTimezoneBtn = document.getElementById("addTimezone");
const timezoneSelector = document.getElementById("timezoneSelector");
const timezoneFilter = document.getElementById("timezoneFilter");
const timezoneSelect = document.getElementById("timezoneSelect");
const confirmAddBtn = document.getElementById("confirmAdd");
const cancelAddBtn = document.getElementById("cancelAdd");
const timezoneList = document.getElementById("timezoneList");

let selectedTimezones = [];
let intervalId;
let allTimezones = [];

// Initialize timezone list from dynamic database
function initializeTimezones() {
  if (typeof window.getAvailableTimezones === "function") {
    try {
      allTimezones = window.getAvailableTimezones().map((tz) => {
        // Get both summer and winter abbreviations for comprehensive search
        const currentTime = Date.now();
        const summerTime = new Date('2024-07-15T12:00:00Z').getTime(); // July (summer)
        const winterTime = new Date('2024-01-15T12:00:00Z').getTime(); // January (winter)
        
        const currentInfo = window.getCurrentTimezoneInfo(tz.zone, currentTime);
        const summerInfo = window.getCurrentTimezoneInfo(tz.zone, summerTime);
        const winterInfo = window.getCurrentTimezoneInfo(tz.zone, winterTime);
        
        const currentAbbr = currentInfo ? currentInfo.abbreviation : '';
        const summerAbbr = summerInfo ? summerInfo.abbreviation : '';
        const winterAbbr = winterInfo ? winterInfo.abbreviation : '';
        
        // Combine all unique abbreviations for search
        const allAbbrs = [...new Set([currentAbbr, summerAbbr, winterAbbr].filter(a => a))].join(' ');
        
        return {
          id: tz.zone,
          name: tz.name,
          country: tz.country,
          abbreviation: currentAbbr,
          displayText: `${tz.name} (${tz.zone})`,
          searchText: `${tz.name} ${tz.zone} ${tz.country} ${allAbbrs}`.toLowerCase(),
        };
      });
    } catch (error) {
      console.error("Error initializing timezones:", error);
    }
  } else {
    console.error("getAvailableTimezones function not found");
  }
}

// Initialize and load saved timezones
function initialize() {
  initializeTimezones();

  // Load saved timezones from storage
  chrome.storage.local.get(["selectedTimezones"], (result) => {
    if (result.selectedTimezones) {
      selectedTimezones = result.selectedTimezones;
    }
    updateDisplay();
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(updateDisplay, 1000);
  });
}

// Try immediate initialization, fallback to window load
if (typeof window.getAvailableTimezones === "function") {
  initialize();
} else {
  window.addEventListener("load", initialize);
}

// Show timezone selector when Add button is clicked
addTimezoneBtn.addEventListener("click", () => {
  // Re-initialize if needed
  if (allTimezones.length === 0) {
    initializeTimezones();
  }

  populateTimezoneSelect();
  timezoneSelector.style.display = "block";
  timezoneFilter.focus();
});

// Filter timezones as user types
timezoneFilter.addEventListener("input", () => {
  populateTimezoneSelect(timezoneFilter.value.toLowerCase());
});

// Add selected timezone
confirmAddBtn.addEventListener("click", () => {
  const selected = timezoneSelect.value;
  if (
    selected &&
    selectedTimezones.length < 5 &&
    !selectedTimezones.includes(selected)
  ) {
    selectedTimezones.push(selected);
    saveTimezones();
    updateDisplay();
  }
  hideTimezoneSelector();
});

// Cancel timezone selection
cancelAddBtn.addEventListener("click", () => {
  hideTimezoneSelector();
});

// Add timezone on double-click
timezoneSelect.addEventListener("dblclick", () => {
  confirmAddBtn.click();
});

function saveTimezones() {
  chrome.storage.local.set({ selectedTimezones: selectedTimezones });
}

function populateTimezoneSelect(filter = "") {
  timezoneSelect.innerHTML = "";
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const filteredTimezones = allTimezones.filter(
    (tz) =>
      !selectedTimezones.includes(tz.id) &&
      tz.id !== localTimezone &&
      (tz.searchText.includes(filter) || tz.displayText.toLowerCase().includes(filter)),
  );

  filteredTimezones.forEach((tz) => {
    const option = document.createElement("option");
    option.value = tz.id;
    option.textContent = tz.displayText;
    timezoneSelect.appendChild(option);
  });
}

function hideTimezoneSelector() {
  timezoneSelector.style.display = "none";
  timezoneFilter.value = "";
}

// Convert time string to nixie digit format
function createNixieTime(timeString) {
  let html = "";

  for (let i = 0; i < timeString.length; i++) {
    const char = timeString[i];
    if (char === ":" || char === "-") {
      html += `<span class="nixie-separator">${char}</span>`;
    } else if (char === " ") {
      html += "&nbsp;";
    } else {
      html += `<span class="nixie-digit">${char}</span>`;
    }
  }

  return html;
}

// Format time for nixie display with date
function formatTimeForNixie(date, timeZone) {
  if (timeZone === "UTC") {
    // For UTC, show date and time
    const dateStr = date.toISOString().substring(0, 10); // YYYY-MM-DD
    const timeStr = date.toISOString().substring(11, 19); // HH:MM:SS
    return {
      date: dateStr,
      time: timeStr,
      abbreviation: "UTC",
      offset: "+00:00",
    };
  }

  // Use dynamic timezone lookup
  const tzInfo = window.getCurrentTimezoneInfo(timeZone, date.getTime());
  if (!tzInfo) {
    return {
      date: "0000-00-00",
      time: "00:00:00",
      abbreviation: "ERR",
      offset: "+00:00",
    };
  }

  const dateOptions = {
    timeZone: timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const timeOptions = {
    timeZone: timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const dateFormatter = new Intl.DateTimeFormat("en-CA", dateOptions); // YYYY-MM-DD format
  const timeFormatter = new Intl.DateTimeFormat("en-GB", timeOptions);
  const dateStr = dateFormatter.format(date);
  const timeStr = timeFormatter.format(date);

  // Calculate precise offset
  const offsetSeconds = tzInfo.gmtOffset;
  const offsetHours = Math.floor(Math.abs(offsetSeconds) / 3600);
  const offsetMinutes = Math.floor((Math.abs(offsetSeconds) % 3600) / 60);
  const offsetString =
    (offsetSeconds >= 0 ? "+" : "-") +
    ("0" + offsetHours).slice(-2) +
    ":" +
    ("0" + offsetMinutes).slice(-2);

  return {
    date: dateStr,
    time: timeStr,
    abbreviation: tzInfo.abbreviation,
    offset: offsetString,
  };
}

function updateDisplay() {
  const now = new Date();

  // Update UTC display
  const utcFormat = formatTimeForNixie(now, "UTC");
  document.getElementById("utcTime").innerHTML = `
    <div class="timezone-info">
      <div class="timezone-time">
        <span class="timezone-label" style="margin-right: 8px;">UTC</span>
        ${createNixieTime(utcFormat.date + " " + utcFormat.time)}
        <span class="timezone-offset" style="margin-left: 4px;">${utcFormat.offset}</span>
      </div>
    </div>
    <div style="display: flex; align-items: center;">
      <button class="copy-btn" data-date="${utcFormat.date}" data-time="${utcFormat.time}" title="Copy to clipboard">
        <img src="icons/icons8-copy-24.png" class="button-icon" alt="Copy">
      </button>
      <div style="width: 20px;"></div>
    </div>
  `;

  // Add copy button event listener for UTC
  const utcCopyBtn = document.querySelector("#utcTime .copy-btn");
  if (utcCopyBtn) {
    utcCopyBtn.addEventListener("click", (e) => {
      const button = e.target.closest(".copy-btn");
      const dateTime = `${button.dataset.date} ${button.dataset.time}`;
      navigator.clipboard.writeText(dateTime).then(() => {
        // Visual feedback - briefly change opacity
        button.style.opacity = "0.3";
        setTimeout(() => {
          button.style.opacity = "0.7";
        }, 150);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    });
  }

  // Update local timezone display
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localFormat = formatTimeForNixie(now, localTimezone);
  document.getElementById("localTime").innerHTML = `
    <div class="timezone-info">
      <div class="timezone-time">
        <span class="timezone-label" style="margin-right: 8px;">${localFormat.abbreviation}</span>
        ${createNixieTime(localFormat.date + " " + localFormat.time)}
        <span class="timezone-offset" style="margin-left: 4px;">${localFormat.offset}</span>
      </div>
    </div>
    <div style="display: flex; align-items: center;">
      <button class="copy-btn" data-date="${localFormat.date}" data-time="${localFormat.time}" title="Copy to clipboard">
        <img src="icons/icons8-copy-24.png" class="button-icon" alt="Copy">
      </button>
      <div style="width: 20px;"></div>
    </div>
  `;

  // Add copy button event listener for local time
  const localCopyBtn = document.querySelector("#localTime .copy-btn");
  if (localCopyBtn) {
    localCopyBtn.addEventListener("click", (e) => {
      const button = e.target.closest(".copy-btn");
      const dateTime = `${button.dataset.date} ${button.dataset.time}`;
      navigator.clipboard.writeText(dateTime).then(() => {
        // Visual feedback - briefly change opacity
        button.style.opacity = "0.3";
        setTimeout(() => {
          button.style.opacity = "0.7";
        }, 150);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    });
  }

  // Update timezone list (skip local timezone if it's already in the list)
  timezoneList.innerHTML = "";
  selectedTimezones.forEach((timezone) => {
    // Skip if this timezone is the same as local timezone
    if (timezone === localTimezone) return;
    const timeFormat = formatTimeForNixie(now, timezone);

    const listItem = document.createElement("li");
    listItem.className = "clock-row";

    // Get timezone data for tooltip
    const tzData = window.timezoneDatabase[timezone];
    const tooltipText = tzData ? `${tzData.name} (${timezone})` : timezone;

    listItem.innerHTML = `
      <div class="timezone-info" title="${tooltipText}">
        <div class="timezone-time">
          <span class="timezone-label" style="margin-right: 8px;">${timeFormat.abbreviation}</span>
          ${createNixieTime(timeFormat.date + " " + timeFormat.time)}
          <span class="timezone-offset" style="margin-left: 4px;">${timeFormat.offset}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <button class="copy-btn" data-timezone="${timezone}" data-date="${timeFormat.date}" data-time="${timeFormat.time}" title="Copy to clipboard">
          <img src="icons/icons8-copy-24.png" class="button-icon" alt="Copy">
        </button>
        <button class="remove-btn" data-timezone="${timezone}" title="Delete timezone">
          <img src="icons/icons8-trash-24.png" class="button-icon" alt="Delete">
        </button>
      </div>
    `;

    // Add copy button event listener
    const copyBtn = listItem.querySelector(".copy-btn");
    copyBtn.addEventListener("click", (e) => {
      const button = e.target.closest(".copy-btn");
      const dateTime = `${button.dataset.date} ${button.dataset.time}`;
      navigator.clipboard.writeText(dateTime).then(() => {
        // Visual feedback - briefly change opacity
        button.style.opacity = "0.3";
        setTimeout(() => {
          button.style.opacity = "0.7";
        }, 150);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    });

    // Add remove button event listener
    const removeBtn = listItem.querySelector(".remove-btn");
    removeBtn.addEventListener("click", (e) => {
      const button = e.target.closest(".remove-btn");
      const timezoneToDelete = button.dataset.timezone;
      selectedTimezones = selectedTimezones.filter(
        (tz) => tz !== timezoneToDelete,
      );
      saveTimezones();
      updateDisplay();
    });

    timezoneList.appendChild(listItem);
  });
}

window.addEventListener("unload", () => {
  if (intervalId) clearInterval(intervalId);
});
