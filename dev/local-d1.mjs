/* Local-only D1 stand-in backed by sql.js. Not used by the deployed Worker. */

import initSqlJs from "sql.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WASM = path.join(path.dirname(require.resolve("sql.js")), "sql-wasm.wasm");

function isWrite(sql) {
  return /^\s*(insert|update|delete|replace|create|alter|drop)\b/i.test(sql);
}

class LocalStatement {
  constructor(d1, sql, params = []) {
    this.d1 = d1;
    this.sql = sql;
    this.params = params.map((value) => (value === undefined ? null : value));
  }

  bind(...params) {
    return new LocalStatement(this.d1, this.sql, params);
  }

  _rows() {
    const statement = this.d1.db.prepare(this.sql);
    if (this.params.length) statement.bind(this.params);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    statement.free();
    if (isWrite(this.sql)) this.d1.persist();
    return rows;
  }

  async first(column) {
    const rows = this._rows();
    if (!rows.length) return null;
    return column ? rows[0][column] : rows[0];
  }

  async all() {
    return { results: this._rows() };
  }

  async run() {
    const statement = this.d1.db.prepare(this.sql);
    if (this.params.length) statement.bind(this.params);
    statement.step();
    statement.free();
    const changes = this.d1.db.getRowsModified();
    if (isWrite(this.sql)) this.d1.persist();
    return { success: true, meta: { changes } };
  }
}

export class LocalD1 {
  static async create({ file, migration }) {
    mkdirSync(path.dirname(file), { recursive: true });
    const SQL = await initSqlJs({ locateFile: () => WASM });
    const db = existsSync(file) ? new SQL.Database(readFileSync(file)) : new SQL.Database();
    db.exec(migration);
    const instance = new LocalD1(db, file);
    instance.persist();
    return instance;
  }

  constructor(db, file) {
    this.db = db;
    this.file = file;
  }

  prepare(sql) {
    return new LocalStatement(this, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  persist() {
    writeFileSync(this.file, Buffer.from(this.db.export()));
  }

  close() {
    this.persist();
    this.db.close();
  }
}
