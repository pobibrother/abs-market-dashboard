import http from 'node:http';
import { createHash, randomBytes, scrypt as deriveKey, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { rows, rates } from './data.mjs';
import { workbook } from './xlsx.mjs';

const localFile = name => fileURLToPath(new URL(name, import.meta.url));
const db = new DatabaseSync(process.env.ABS_TEST_DB || localFile('dashboard.sqlite'));
db.exec('CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, salt TEXT, hash TEXT); CREATE TABLE IF NOT EXISTS visits(day TEXT PRIMARY KEY, count INTEGER NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS downloads(day TEXT PRIMARY KEY, count INTEGER NOT NULL)');
const sessions = new Map();
const key = () => randomBytes(32).toString('hex');
const scrypt = promisify(deriveKey);
db.exec('CREATE TABLE IF NOT EXISTS owner_tickets(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)');
const digest = value => createHash('sha256').update(value).digest('hex');
function ownerTicket() {
  const token = key();
  db.prepare('DELETE FROM owner_tickets WHERE expires <= ?').run(Date.now());
  db.prepare('INSERT INTO owner_tickets VALUES(?,?)').run(digest(token),Date.now()+300000);
  return token;
}
let failures = [];
const day = () => new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const port = Number(process.env.ABS_PORT || 48731);
const home = 'http://127.0.0.1:'+port;
const server = http.createServer(async (req,res) => {
  const send = (status, type, body) => {res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});res.end(body)};
  const json = (status, value) => send(status,'application/json; charset=utf-8',JSON.stringify(value));
  try {
    if(req.headers.host !== new URL(home).host) return json(403,{error:'접근할 수 없습니다.'});
    const url = new URL(req.url,home);
    const path = url.pathname;
    const cookie = (req.headers.cookie || '').match(/(?:^|; )abs_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    const session = sessions.get(cookie);
    const role = session && session.exp > Date.now() ? session.role : null;
    const signIn = role => {
      const token = key(); sessions.set(token,{role,exp:Date.now()+8*3600000});
      res.setHeader('Set-Cookie','abs_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800');
    };
    if(req.method==='POST') {
      if(req.headers.origin!==home || req.headers['content-type']!=='application/json') return json(403,{error:'요청 출처를 확인하세요.'});
      let buf=''; for await(const chunk of req) {buf+=chunk;if(Buffer.byteLength(buf)>2048)return json(413,{error:'입력이 너무 깁니다.'})}
      const body=JSON.parse(buf || '{}');
      if(path==='/owner' && typeof body.token==='string' && db.prepare('DELETE FROM owner_tickets WHERE hash=? AND expires>?').run(digest(body.token),Date.now()).changes){signIn('admin');return json(200,{ok:true})}
      if(path==='/password' && role==='admin'){
        if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)return json(400,{error:'8~128자로 입력하세요.'});
        const salt=key(), hash=await scrypt(body.password,salt,64);
        db.prepare('INSERT OR REPLACE INTO settings VALUES(1,?,?)').run(salt,hash.toString('hex'));
        for(const [id,s] of sessions)if(s.role==='visitor')sessions.delete(id);
        failures=[];return json(200,{ok:true});
      }
      if(path==='/login'){
        failures=failures.filter(t=>Date.now()-t<60000);
        if(failures.length>=12)return json(429,{error:'1분 후 다시 시도하세요.'});
        failures.push(Date.now());
        const setting=db.prepare('SELECT * FROM settings WHERE id=1').get();
        if(!setting)return json(409,{error:'운영자가 먼저 공용 비밀번호를 설정해야 합니다.'});
        if(typeof body.password!=='string'||body.password.length>128)return json(400,{error:'입력을 확인하세요.'});
        const hash=await scrypt(body.password,setting.salt,64);
        if(!timingSafeEqual(hash,Buffer.from(setting.hash,'hex'))||setting.hash!==db.prepare('SELECT hash FROM settings WHERE id=1').get().hash)return json(401,{error:'비밀번호를 확인하세요.'});
        signIn('visitor');db.prepare('INSERT INTO visits VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1').run(day());return json(200,{ok:true});
      }
      if(path==='/logout'){sessions.delete(cookie);res.setHeader('Set-Cookie','abs_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');return json(200,{ok:true})}
      return json(403,{error:'권한이 없습니다.'});
    }
    if(req.method!=='GET')return json(405,{});
    if(path==='/')return send(200,'text/html; charset=utf-8',readFileSync(localFile('index.html')));
    if(path==='/status'){res.setHeader('X-ABS-Server','dashboard-v1');return json(200,{role})}
    if(!role)return json(401,{error:'비밀번호를 입력하세요.'});
    if(path==='/data')return json(200,{rows,rates});
    if(path==='/stats' && role==='admin')return json(200,db.prepare('SELECT day, (SELECT count FROM visits WHERE visits.day=days.day) AS count, (SELECT count FROM downloads WHERE downloads.day=days.day) AS exports FROM (SELECT day FROM visits UNION SELECT day FROM downloads) AS days ORDER BY day DESC LIMIT 30').all());
    if(path==='/excel'){
      const ids=(url.searchParams.get('ids')||'').split(',').filter(x=>/^\d+$/.test(x));
      if(role==='visitor')db.prepare('INSERT INTO downloads VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1').run(day());
      res.setHeader('Content-Disposition','attachment; filename="abs-sample.xlsx"');
      return send(200,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',workbook(ids.map(id=>rows[Number(id)]).filter(Boolean)));
    }
    return json(404,{});
  }catch(e){return json(400,{error:'요청을 처리할 수 없습니다.'})}
});
function openOwner() {
  const url = home+'/#owner='+ownerTicket();
  const candidates = [
    process.env['ProgramFiles(x86)']+'/Microsoft/Edge/Application/msedge.exe',
    process.env.ProgramFiles+'/Microsoft/Edge/Application/msedge.exe',
    process.env.ProgramFiles+'/Google/Chrome/Application/chrome.exe'
  ];
  const browser = candidates.find(existsSync);
  if(process.argv.includes('--open')){
    const child = browser ? spawn(browser,[url],{detached:true,windowsHide:true,stdio:'ignore'}) :
      spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true,stdio:'ignore'});
    child.on('error',()=>console.log('Open in your browser: '+url));
    child.unref();
  } else console.log(url);
}
server.on('error',async error=>{
  if(error.code==='EADDRINUSE' && process.argv.includes('--open')){
    try {
      const response=await fetch(home+'/status',{signal:AbortSignal.timeout(2000)});
      if(response.headers.get('x-abs-server')==='dashboard-v1'){
        openOwner(); return;
      }
    } catch {}
  }
  console.error(error.message);process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{
  openOwner();
  console.log('방문자 주소 '+home+'   종료: Ctrl+C');
});
