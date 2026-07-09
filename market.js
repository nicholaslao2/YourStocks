/* ==========================================================================
   YourStocks — Market Schedule Module
   Determines ASX / US market open-closed status using real IANA timezone
   rules (DST-safe) via Intl, no manual offset math.
   ========================================================================== */

const MARKET_HOURS = {
  ASX: { tz: "Australia/Sydney", open: [10, 0], close: [16, 0], label: "ASX" },
  US: { tz: "America/New_York", open: [9, 30], close: [16, 0], label: "US (NYSE/NASDAQ)" },
};

function getZonedParts(tz) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const map = {};
  parts.forEach((p) => (map[p.type] = p.value));
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  return { weekday: map.weekday, hour, minute: parseInt(map.minute, 10) };
}

function marketStatus(marketKey) {
  const cfg = MARKET_HOURS[marketKey];
  const { weekday, hour, minute } = getZonedParts(cfg.tz);
  const minutesNow = hour * 60 + minute;
  const openMin = cfg.open[0] * 60 + cfg.open[1];
  const closeMin = cfg.close[0] * 60 + cfg.close[1];
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const isOpen = isWeekday && minutesNow >= openMin && minutesNow < closeMin;

  let minsToBoundary;
  let boundaryLabel;
  if (isOpen) {
    minsToBoundary = closeMin - minutesNow;
    boundaryLabel = "Closes in";
  } else {
    // minutes until next open (handles overnight + weekend rollover)
    let daysAhead = 0;
    let mins = openMin - minutesNow;
    let checkWeekday = weekday;
    const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (mins <= 0 || !isWeekday) {
      // step forward day by day until we land on a weekday open
      mins = openMin - minutesNow;
      while (true) {
        daysAhead += 1;
        mins += 24 * 60;
        const idx = (order.indexOf(checkWeekday) + daysAhead) % 7;
        const dow = order[idx];
        if (dow !== "Sat" && dow !== "Sun") break;
      }
    }
    minsToBoundary = mins;
    boundaryLabel = "Opens in";
  }

  const h = Math.floor(minsToBoundary / 60);
  const m = minsToBoundary % 60;
  return {
    market: cfg.label,
    isOpen,
    countdown: `${boundaryLabel} ${h}h ${m}m`,
  };
}

function allMarketStatuses() {
  return {
    ASX: marketStatus("ASX"),
    US: marketStatus("US"),
  };
}
