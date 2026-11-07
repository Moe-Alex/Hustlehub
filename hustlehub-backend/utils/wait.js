// "90" -> "2 minutes", "30" -> "30 seconds": a friendly wait time for messages shown to people.

function formatWaitMinutes(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

module.exports = { formatWaitMinutes };
