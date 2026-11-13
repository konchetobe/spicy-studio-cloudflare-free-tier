/* Local-only Durable Object stand-in with in-process alarms. */

class LocalStorage {
  constructor() {
    this.map = new Map();
    this.timer = null;
    this.alarmAt = 0;
    this.onAlarm = null;
  }

  async get(key) {
    return this.map.get(key);
  }

  async put(key, value) {
    this.map.set(key, value);
  }

  async delete(key) {
    return this.map.delete(key);
  }

  async list({ prefix = "" } = {}) {
    return new Map([...this.map].filter(([key]) => key.startsWith(prefix)));
  }

  async setAlarm(timestamp) {
    if (this.timer) clearTimeout(this.timer);
    this.alarmAt = Number(timestamp);
    this.timer = setTimeout(() => {
      this.timer = null;
      Promise.resolve(this.onAlarm?.()).catch((error) => console.error("[local-do alarm]", error));
    }, Math.max(0, this.alarmAt - Date.now()));
  }
}

export class LocalNamespace {
  constructor(Class, env) {
    this.Class = Class;
    this.env = env;
    this.instances = new Map();
  }

  idFromName(name) {
    return name;
  }

  get(id) {
    const key = String(id);
    let entry = this.instances.get(key);
    if (!entry) {
      const storage = new LocalStorage();
      const instance = new this.Class({ storage }, this.env);
      storage.onAlarm = () => instance.alarm?.();
      entry = { instance, storage };
      this.instances.set(key, entry);
    }
    return {
      fetch: async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        return entry.instance.fetch(request);
      },
    };
  }
}
