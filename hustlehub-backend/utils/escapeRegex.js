// Escapes regex special characters so user search text is matched literally (prevents regex injection / ReDoS).

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
