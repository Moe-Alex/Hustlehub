// Sends log lines to Grafana Loki (the log database behind Grafana Cloud) over HTTPS using Loki's push API.
// Design goals: logging must never slow down or crash the app, so lines are queued, sent in batches, retried
// a few times when the network fails, and dropped (oldest first) if the queue grows too large.
// Push API: https://grafana.com/docs/loki/latest/reference/loki-http-api/#ingest-logs

const PUSH_PATH = '/loki/api/v1/push';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

// Accepts "https://logs-prod-012.grafana.net" or the full push URL. Credentials are only ever sent over
// HTTPS (plain HTTP is allowed to this computer only, for local testing).
function normaliseUrl(rawUrl) {
  const url = new URL(rawUrl);
  const isLoopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error('LOKI_URL must use https (http is only allowed for localhost).');
  }
  if (!url.pathname.endsWith(PUSH_PATH)) url.pathname = `${url.pathname.replace(/\/$/, '')}${PUSH_PATH}`;
  return url.toString();
}

class LokiTransport {
  constructor({
    url, user, token, labels = {}, batchSize = 100, flushIntervalMs = 2000, maxQueue = 2000,
    maxAttempts = 3, timeoutMs = 5000, fetchImpl = globalThis.fetch, onError = () => {},
  }) {
    this.endpoint = normaliseUrl(url);
    this.headers = { 'Content-Type': 'application/json' };
    if (user && token) this.headers.Authorization = `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`;
    this.labels = labels;
    this.batchSize = batchSize;
    this.maxQueue = maxQueue;
    this.maxAttempts = maxAttempts;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
    this.onError = onError;
    this.queue = [];
    this.sending = null;
    this.dropped = 0;

    this.timer = setInterval(() => this.flush(), flushIntervalMs);
    this.timer.unref(); // a pending timer must never keep the process alive
  }

  // entry: { time: Date, level, category, line }
  push(entry) {
    this.queue.push({ ...entry, attempts: 0 });
    if (this.queue.length > this.maxQueue) {
      this.queue.shift();
      this.dropped += 1;
    }
    if (this.queue.length >= this.batchSize) this.flush();
  }

  buildPayload(entries) {
    const streams = new Map();
    for (const entry of entries) {
      const stream = { ...this.labels, level: entry.level, category: entry.category };
      const key = JSON.stringify(stream);
      if (!streams.has(key)) streams.set(key, { stream, values: [] });
      // Loki wants the timestamp as a string of nanoseconds since the epoch.
      streams.get(key).values.push([String(BigInt(entry.time.getTime()) * 1000000n), entry.line]);
    }
    return { streams: [...streams.values()] };
  }

  // Sends everything queued so far. Safe to call at any time; only one send runs at once.
  flush() {
    if (this.sending) return this.sending;
    if (this.queue.length === 0) return Promise.resolve();
    this.sending = this.drain().finally(() => { this.sending = null; });
    return this.sending;
  }

  async drain() {
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      const outcome = await this.send(batch);
      if (outcome === 'retry') {
        const retryable = batch.filter((entry) => ++entry.attempts < this.maxAttempts);
        this.queue.unshift(...retryable);
        return; // wait for the next timer tick instead of hammering a failing service
      }
    }
  }

  // Returns 'ok', 'retry' (try again later) or 'drop' (the service rejected these lines for good).
  async send(batch) {
    try {
      const response = await this.fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(this.buildPayload(batch)),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (response.ok) return 'ok';
      if (response.status === 429 || response.status >= 500) {
        this.onError(`Loki answered ${response.status}; will retry`);
        return 'retry';
      }
      this.onError(`Loki rejected the logs with status ${response.status}; check LOKI_URL, LOKI_USER and LOKI_TOKEN`);
      return 'drop';
    } catch (err) {
      this.onError(`Could not reach Loki (${err.name}); will retry`);
      return 'retry';
    }
  }

  // Stops the timer and tries once more to send what is left (used when the server shuts down).
  async close() {
    clearInterval(this.timer);
    await Promise.race([this.flush(), new Promise((resolve) => setTimeout(resolve, this.timeoutMs + 500).unref())]);
  }
}

module.exports = { LokiTransport, normaliseUrl };
