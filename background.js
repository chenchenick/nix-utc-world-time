chrome.alarms.create("updateTime", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateTime") {
    updateTimes();
  }
});

function updateTimes() {
  const now = new Date();
  const utcTime = now.toISOString();
  chrome.storage.local.set({ utcTime: utcTime });

  chrome.storage.local.get(["selectedTimezones"], (result) => {
    if (result.selectedTimezones && result.selectedTimezones.length > 0) {
      const timezones = {};
      result.selectedTimezones.forEach((timezone) => {
        try {
          const date = new Date();
          const utcDate = new Date(
            date.toLocaleString("en-US", { timeZone: "UTC" }),
          );
          const tzDate = new Date(
            date.toLocaleString("en-US", { timeZone: timezone }),
          );
          const offset =
            (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
          const offsetString =
            (offset >= 0 ? "+" : "-") +
            ("0" + Math.abs(offset)).slice(-2) +
            ":00";

          const options = {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          };
          const formatter = new Intl.DateTimeFormat("en-CA", options);
          const formatted = formatter.format(now).replace(", ", "T");
          timezones[timezone] = formatted + offsetString;
        } catch (e) {
          console.error(`Could not format time for timezone: ${timezone}`, e);
          timezones[timezone] = "Invalid Timezone";
        }
      });
      chrome.storage.local.set({ timezones: timezones });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  updateTimes();
});
