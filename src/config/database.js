'use strict';
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
let _db = null;
class DB {
  constructor(d) { this._db = d; this._dirty = false; setInterval(() => { if (this._dirty) this._flush(); }, 2000); }
  _flush() { try { fs.writeFileSync(DB_PATH, Buffer.from(this._db.export())); this._dirty = false; } catch(e) { console.error('[DB]',e.message); } }
  exec(sql) { this._db.run(sql); this._dirty = true; }
  prepare(sql) {
    const s = this;
    return {
      run(...p) { s._db.run(sql,p); s._dirty=true; const [{values}]=s._db.exec('SELECT last_insert_rowid()'); return {lastInsertRowid:values[0][0]}; },
      get(...p) { const st=s._db.prepare(sql); st.bind(p); if(st.step()){const r=st.getAsObject();st.free();return r;} st.free();return undefined; },
      all(...p) { const r=s._db.exec(sql,p); if(!r.length)return[]; const{columns,values}=r[0]; return values.map(row=>Object.fromEntries(columns.map((c,i)=>[c,row[i]]))); },
    };
  }
}
async function initDB() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  const db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  _db = new DB(db);
  _db.exec(`CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, message TEXT NOT NULL, cron_expression TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', last_run DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
  console.log('[DB] OK');
  return _db;
}
function getDB() { if (!_db) throw new Error('DB nao inicializado'); return _db; }
module.exports = { initDB, getDB };
