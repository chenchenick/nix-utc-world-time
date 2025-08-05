const addTimezoneBtn = document.getElementById("addTimezone");
const timezoneSelector = document.getElementById("timezoneSelector");
const timezoneFilter = document.getElementById("timezoneFilter");
const timezoneSelect = document.getElementById("timezoneSelect");
const confirmAddBtn = document.getElementById("confirmAdd");
const cancelAddBtn = document.getElementById("cancelAdd");
const timezoneList = document.getElementById("timezoneList");

// Convert Time Elements
const toggleConvertBtn = document.getElementById("toggleConvert");
const convertSection = document.getElementById("convertSection");
const datetimeInput = document.getElementById("datetimeInput");
const sourceTimezoneSelect = document.getElementById("sourceTimezone");
const convertBtn = document.getElementById("convertBtn");
const convertResults = document.getElementById("convertResults");
const resultsList = document.getElementById("resultsList");
const copyAllResultsBtn = document.getElementById("copyAllResults");

let selectedTimezones = [];
let intervalId;
let allTimezones = [];
let convertSectionVisible = false;
let lastConvertedResults = [];

// Initialize timezone list from dynamic database
function initializeTimezones() {
  if (typeof window.getAvailableTimezones === "function") {
    try {
      allTimezones = window.getAvailableTimezones().map((tz) => {
        // Get both summer and winter abbreviations for comprehensive search
        const currentTime = Date.now();
        const summerTime = new Date("2024-07-15T12:00:00Z").getTime(); // July (summer)
        const winterTime = new Date("2024-01-15T12:00:00Z").getTime(); // January (winter)

        const currentInfo = window.getCurrentTimezoneInfo(tz.zone, currentTime);
        const summerInfo = window.getCurrentTimezoneInfo(tz.zone, summerTime);
        const winterInfo = window.getCurrentTimezoneInfo(tz.zone, winterTime);

        const currentAbbr = currentInfo ? currentInfo.abbreviation : "";
        const summerAbbr = summerInfo ? summerInfo.abbreviation : "";
        const winterAbbr = winterInfo ? winterInfo.abbreviation : "";

        // Combine all unique abbreviations for search
        const allAbbrs = [
          ...new Set([currentAbbr, summerAbbr, winterAbbr].filter((a) => a)),
        ].join(" ");

        return {
          id: tz.zone,
          name: tz.name,
          country: tz.country,
          abbreviation: currentAbbr,
          displayText: `${tz.name} (${tz.zone})`,
          searchText:
            `${tz.name} ${tz.zone} ${tz.country} ${allAbbrs}`.toLowerCase(),
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
  initializeConvertTime();

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
      (tz.searchText.includes(filter) ||
        tz.displayText.toLowerCase().includes(filter)),
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
        <span class="timezone-offset" style="margin-left: 4px;">${
          utcFormat.offset
        }</span>
      </div>
    </div>
    <div style="display: flex; align-items: center;">
      <button class="copy-btn" data-date="${utcFormat.date}" data-time="${
        utcFormat.time
      }" title="Copy to clipboard">
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
      navigator.clipboard
        .writeText(dateTime)
        .then(() => {
          // Visual feedback - briefly change opacity
          button.style.opacity = "0.3";
          setTimeout(() => {
            button.style.opacity = "0.7";
          }, 150);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
    });
  }

  // Update local timezone display
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localFormat = formatTimeForNixie(now, localTimezone);
  document.getElementById("localTime").innerHTML = `
    <div class="timezone-info">
      <div class="timezone-time">
        <span class="timezone-label" style="margin-right: 8px;">${
          localFormat.abbreviation
        }</span>
        ${createNixieTime(localFormat.date + " " + localFormat.time)}
        <span class="timezone-offset" style="margin-left: 4px;">${
          localFormat.offset
        }</span>
      </div>
    </div>
    <div style="display: flex; align-items: center;">
      <button class="copy-btn" data-date="${localFormat.date}" data-time="${
        localFormat.time
      }" title="Copy to clipboard">
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
      navigator.clipboard
        .writeText(dateTime)
        .then(() => {
          // Visual feedback - briefly change opacity
          button.style.opacity = "0.3";
          setTimeout(() => {
            button.style.opacity = "0.7";
          }, 150);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
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
          <span class="timezone-label" style="margin-right: 8px;">${
            timeFormat.abbreviation
          }</span>
          ${createNixieTime(timeFormat.date + " " + timeFormat.time)}
          <span class="timezone-offset" style="margin-left: 4px;">${
            timeFormat.offset
          }</span>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <button class="copy-btn" data-timezone="${timezone}" data-date="${
          timeFormat.date
        }" data-time="${timeFormat.time}" title="Copy to clipboard">
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
      navigator.clipboard
        .writeText(dateTime)
        .then(() => {
          // Visual feedback - briefly change opacity
          button.style.opacity = "0.3";
          setTimeout(() => {
            button.style.opacity = "0.7";
          }, 150);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
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

// Convert Time Functionality
function initializeConvertTime() {
  // Load convert section visibility state
  chrome.storage.local.get(["convertSectionVisible"], (result) => {
    if (result.convertSectionVisible) {
      convertSectionVisible = true;
      convertSection.style.display = "block";
      toggleConvertBtn.innerHTML =
        "COLLAPSE &#11205;";
    } else {
      toggleConvertBtn.innerHTML =
        "CONVERT TIME &#11206;";
    }
  });

  // Populate source timezone dropdown
  populateSourceTimezones();

  // Add event listeners
  toggleConvertBtn.addEventListener("click", toggleConvertSection);
  convertBtn.addEventListener("click", performConversion);
  copyAllResultsBtn.addEventListener("click", copyAllResults);
  datetimeInput.addEventListener("input", onDatetimeInputChange);
  sourceTimezoneSelect.addEventListener("change", onSourceTimezoneChange);

  // Add preset button listeners
  const presetBtns = document.querySelectorAll(".preset-btn");
  presetBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      handlePresetClick(e.target.dataset.preset);
    });
  });
}

function toggleConvertSection() {
  convertSectionVisible = !convertSectionVisible;
  convertSection.style.display = convertSectionVisible ? "block" : "none";

  // Update button text with arrow icons
  toggleConvertBtn.innerHTML = convertSectionVisible
    ? "COLLAPSE &#11205;"
    : "CONVERT TIME &#11206;";

  // Save state
  chrome.storage.local.set({ convertSectionVisible: convertSectionVisible });

  if (convertSectionVisible) {
    populateSourceTimezones();
    datetimeInput.focus();
  }
}

function populateSourceTimezones() {
  sourceTimezoneSelect.innerHTML =
    '<option value="">Select source timezone</option>';

  // Add UTC option
  const utcOption = document.createElement("option");
  utcOption.value = "UTC";
  utcOption.textContent = "UTC";
  sourceTimezoneSelect.appendChild(utcOption);

  // Add local timezone
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localOption = document.createElement("option");
  localOption.value = localTimezone;
  localOption.textContent = `Local (${localTimezone})`;
  sourceTimezoneSelect.appendChild(localOption);

  // Add separator
  const separator = document.createElement("option");
  separator.disabled = true;
  separator.textContent = "-------------";
  sourceTimezoneSelect.appendChild(separator);

  // Add all available timezones
  if (allTimezones.length > 0) {
    allTimezones.forEach((tz) => {
      const option = document.createElement("option");
      option.value = tz.id;
      option.textContent = tz.displayText;
      sourceTimezoneSelect.appendChild(option);
    });
  }
}

function parseDateTimeInput(input, sourceTimezone = null) {
  if (!input.trim()) return null;

  const inputLower = input.toLowerCase().trim();

  // Handle relative time expressions
  if (inputLower === "now") {
    return new Date();
  }

  if (inputLower === "1h ago" || inputLower === "1 hour ago") {
    return new Date(Date.now() - 60 * 60 * 1000);
  }

  if (inputLower === "tomorrow noon" || inputLower === "tomorrow 12pm") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow;
  }

  // Try various date/time formats
  const formats = [
    // ISO formats
    /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
    /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
    /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/,

    // US formats
    /(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}) (AM|PM)/i,
    /(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})/,

    // Other common formats
    /(\w{3}) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM)/i,
    /(\d{1,2}) (\w{3}) (\d{4}) (\d{1,2}):(\d{2})/,
  ];

  // Try parsing with Date constructor first (handles many formats)
  let parsedDate = new Date(input);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  // If that fails, try specific formats
  for (let format of formats) {
    const match = input.match(format);
    if (match) {
      // Handle different format matches
      if (format.source.includes("T") || format.source.includes(" ")) {
        // ISO-like formats
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JS months are 0-based
        const day = parseInt(match[3]);
        const hour = parseInt(match[4]);
        const minute = parseInt(match[5]);
        const second = match[6] ? parseInt(match[6]) : 0;

        parsedDate = new Date(year, month, day, hour, minute, second);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }
  }

  return null;
}

function performConversion() {
  const input = datetimeInput.value.trim();
  const sourceTimezone = sourceTimezoneSelect.value;

  if (!input) {
    showError("Please enter a date/time to convert");
    return;
  }

  if (!sourceTimezone) {
    showError("Please select a source timezone");
    return;
  }

  // Parse the input datetime
  const parsedDate = parseDateTimeInput(input, sourceTimezone);
  if (!parsedDate) {
    showError(
      "Invalid date/time format. Try: 2024-08-04 15:30 or Aug 4, 2024 3:30 PM",
    );
    return;
  }

  clearError();

  // Convert to all displayed timezones
  const results = [];
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Add UTC result
  results.push({
    timezone: "UTC",
    label: "UTC",
    ...formatTimeForNixie(parsedDate, "UTC"),
  });

  // Add local timezone result
  if (localTimezone !== "UTC") {
    const localFormat = formatTimeForNixie(parsedDate, localTimezone);
    results.push({
      timezone: localTimezone,
      label: localFormat.abbreviation,
      ...localFormat,
    });
  }

  // Add selected timezones results
  selectedTimezones.forEach((timezone) => {
    if (timezone !== localTimezone && timezone !== "UTC") {
      const timeFormat = formatTimeForNixie(parsedDate, timezone);
      results.push({
        timezone: timezone,
        label: timeFormat.abbreviation,
        ...timeFormat,
      });
    }
  });

  lastConvertedResults = results;
  displayConvertResults(results, input, sourceTimezone);
}

function displayConvertResults(results, originalInput, sourceTimezone) {
  const sourceLabel =
    sourceTimezone === "UTC"
      ? "UTC"
      : sourceTimezone === Intl.DateTimeFormat().resolvedOptions().timeZone
        ? "Local"
        : sourceTimezone;

  resultsList.innerHTML = `
    <div class="convert-result-row" style="background: rgba(255, 165, 0, 0.1); border-color: rgba(255, 165, 0, 0.2);">
      <div class="timezone-info">
        <span style="color: #ffa500; font-size: 11px; font-weight: bold;">Source: ${originalInput} (${sourceLabel})</span>
      </div>
    </div>
  `;

  results.forEach((result) => {
    const resultRow = document.createElement("div");
    resultRow.className = "convert-result-row";

    resultRow.innerHTML = `
      <div class="timezone-info">
        <div class="timezone-time">
          <span class="timezone-label" style="margin-right: 8px; font-size: 11px;">${
            result.label
          }</span>
          ${createNixieTime(result.date + " " + result.time)}
          <span class="timezone-offset" style="margin-left: 4px; font-size: 10px;">${
            result.offset
          }</span>
        </div>
      </div>
      <button class="copy-btn" data-datetime="${result.date} ${
        result.time
      }" title="Copy this time">
        <img src="icons/icons8-copy-24.png" class="button-icon" alt="Copy" style="width: 12px; height: 12px;">
      </button>
    `;

    // Add copy functionality
    const copyBtn = resultRow.querySelector(".copy-btn");
    copyBtn.addEventListener("click", (e) => {
      const dateTime = e.target.closest(".copy-btn").dataset.datetime;
      navigator.clipboard
        .writeText(dateTime)
        .then(() => {
          // Visual feedback
          copyBtn.style.opacity = "0.3";
          setTimeout(() => {
            copyBtn.style.opacity = "0.7";
          }, 150);
        })
        .catch((err) => console.error("Failed to copy: ", err));
    });

    resultsList.appendChild(resultRow);
  });

  convertResults.style.display = "block";
}

function handlePresetClick(preset) {
  let presetValue = "";

  switch (preset) {
    case "now":
      presetValue = "now";
      break;
    case "1hour-ago":
      presetValue = "1h ago";
      break;
    case "tomorrow-noon":
      presetValue = "tomorrow noon";
      break;
  }

  datetimeInput.value = presetValue;

  // Auto-set local timezone as source for presets
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  sourceTimezoneSelect.value = localTimezone;

  // Auto-convert if we have both input and source
  if (presetValue && sourceTimezoneSelect.value) {
    performConversion();
  }
}

function copyAllResults() {
  if (lastConvertedResults.length === 0) return;

  const resultText = lastConvertedResults
    .map(
      (result) =>
        `${result.label}: ${result.date} ${result.time} (${result.offset})`,
    )
    .join("\n");

  navigator.clipboard
    .writeText(resultText)
    .then(() => {
      // Visual feedback
      copyAllResultsBtn.style.opacity = "0.3";
      setTimeout(() => {
        copyAllResultsBtn.style.opacity = "0.7";
      }, 150);
    })
    .catch((err) => console.error("Failed to copy: ", err));
}

function onDatetimeInputChange() {
  clearError();
  // Auto-convert if we have both input and source timezone
  const input = datetimeInput.value.trim();
  const sourceTimezone = sourceTimezoneSelect.value;

  if (input && sourceTimezone && input.length > 8) {
    // Reasonable minimum length
    // Add small delay to avoid excessive calls while typing
    setTimeout(() => {
      if (
        datetimeInput.value.trim() === input &&
        sourceTimezoneSelect.value === sourceTimezone
      ) {
        performConversion();
      }
    }, 500);
  }
}

function onSourceTimezoneChange() {
  // If we have existing results and input, update the conversion
  const input = datetimeInput.value.trim();
  const sourceTimezone = sourceTimezoneSelect.value;

  if (input && sourceTimezone && lastConvertedResults.length > 0) {
    performConversion();
  }
}

function showError(message) {
  datetimeInput.classList.add("input-error");

  // Remove existing error message
  const existingError = document.querySelector(".error-message");
  if (existingError) existingError.remove();

  // Add error message
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  datetimeInput.parentNode.appendChild(errorDiv);
}

function clearError() {
  datetimeInput.classList.remove("input-error");
  const errorMessage = document.querySelector(".error-message");
  if (errorMessage) errorMessage.remove();
}

window.addEventListener("unload", () => {
  if (intervalId) clearInterval(intervalId);
});
