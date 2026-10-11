import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use(express.static(__dirname));

const OTP_STEP_MS = 30 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_COOLDOWN_MS = 30 * 1000;
const STORE_FILE = path.join(__dirname, '.mfa-secrets.json');
const MASTER_KEY = process.env.MFA_SECRET_KEY || 'trustkernel-demo-master-key-change-me';

function deriveKey(){ return crypto.createHash('sha256').update(MASTER_KEY).digest(); }
function encrypt(text){
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',deriveKey(),iv);
  const enc=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`;
}
function decrypt(value){
  const [ivB64,tagB64,dataB64]=String(value).split('.');
  const decipher=crypto.createDecipheriv('aes-256-gcm',deriveKey(),Buffer.from(ivB64,'base64'));
  decipher.setAuthTag(Buffer.from(tagB64,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64,'base64')),decipher.final()]).toString('utf8');
}
function loadStore(){ try { return JSON.parse(fs.readFileSync(STORE_FILE,'utf8')); } catch { return {}; } }
function saveStore(store){ fs.writeFileSync(STORE_FILE,JSON.stringify(store,null,2),'utf8'); }
const secrets=loadStore();
const attempts=new Map();

function randomBase32(bytes=20){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const raw=crypto.randomBytes(bytes); let bits='';
  for(const b of raw) bits+=b.toString(2).padStart(8,'0');
  let out='';
  for(let i=0;i<bits.length;i+=5) out+=alphabet[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];
  return out;
}
function base32Decode(input){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits='';
  for(const c of input.replace(/=+$/,'').toUpperCase()){
    const n=alphabet.indexOf(c); if(n<0) throw new Error('Invalid Base32');
    bits+=n.toString(2).padStart(5,'0');
  }
  const bytes=[]; for(let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.slice(i,i+8),2));
  return Buffer.from(bytes);
}
function hotp(secret,counter){
  const msg=Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h=crypto.createHmac('sha1',base32Decode(secret)).update(msg).digest();
  const offset=h[h.length-1]&0xf;
  const bin=((h[offset]&0x7f)<<24)|((h[offset+1]&0xff)<<16)|((h[offset+2]&0xff)<<8)|(h[offset+3]&0xff);
  return String(bin%1000000).padStart(6,'0');
}
function totp(secret, time=Date.now()){ return hotp(secret,Math.floor(time/OTP_STEP_MS)); }
function verifyTotp(secret,code){
  if(!code || code.length !== 6) return false;
  const now=Math.floor(Date.now()/OTP_STEP_MS);
  const codeBuf = Buffer.from(code);
  return [now-1,now,now+1].some(c=>{
    try {
      const tBuf = Buffer.from(totp(secret,c*OTP_STEP_MS));
      return tBuf.length === codeBuf.length && crypto.timingSafeEqual(tBuf, codeBuf);
    } catch {
      return false;
    }
  });
}
function normalize(v){ return String(v||'').trim().toLowerCase(); }
function validDid(v){ return /^did:[a-z0-9:._-]{3,200}$/i.test(String(v||'')); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function getSecret(did, email){
  if(secrets[did]) return decrypt(secrets[did].secret);
  if(email){
    const norm = normalize(email);
    for(const k in secrets){
      if(secrets[k] && normalize(secrets[k].email) === norm){
        return decrypt(secrets[k].secret);
      }
    }
  }
  return null;
}

app.post('/api/mfa/enroll', async (req,res)=>{
  try {
    const did=String(req.body.did||'').trim(), email=normalize(req.body.email), purpose=req.body.purpose==='admin2'?'admin2':'login';
    const forceReset = Boolean(req.body.reset);
    if(!validDid(did)||!validEmail(email)) return res.status(400).json({ok:false,message:'Valid identity details are required.'});
    let secret=getSecret(did, email), enrollmentRequired=false;
    if(!secret || forceReset){
      secret=randomBase32(); secrets[did]={secret:encrypt(secret),email}; saveStore(secrets); enrollmentRequired=true;
    }
    const issuer='AyurDAO';
    const label=encodeURIComponent(`${issuer}:${email}`);
    const uri=`otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    const qrDataUrl = await QRCode.toDataURL(uri, { width: 220, margin: 1 });
    res.json({ok:true,enrollmentRequired,secret,otpauthUri:uri,qrDataUrl,purpose});
  } catch (err) {
    console.error('Error in /api/mfa/enroll:', err);
    res.status(500).json({ok:false,message:'Server error generating authenticator QR code.'});
  }
});

app.post('/api/mfa/verify',(req,res)=>{
  const did=String(req.body.did||'').trim(), code=String(req.body.code||'').trim(), email=normalize(req.body.email), purpose=req.body.purpose==='admin2'?'admin2':'login';
  const secret=getSecret(did, email); if(!secret) return res.status(400).json({ok:false,message:'Authenticator is not enrolled for this identity.'});
  if(!/^\d{6}$/.test(code)) return res.status(400).json({ok:false,message:'Enter the 6-digit authenticator code.'});
  const key=`${purpose}:${did}`; const a=attempts.get(key)||{count:0,last:0};
  if(Date.now()-a.last<VERIFY_COOLDOWN_MS) return res.status(429).json({ok:false,message:'Please wait a moment before trying another code.'});
  a.last=Date.now(); a.count++;
  if(a.count>MAX_VERIFY_ATTEMPTS){ attempts.delete(key); return res.status(429).json({ok:false,message:'Too many incorrect attempts. Start authentication again.'}); }
  if(!verifyTotp(secret,code)){ attempts.set(key,a); return res.status(400).json({ok:false,message:'Incorrect or expired authenticator code.'}); }
  attempts.delete(key); res.json({ok:true});
});

app.get('/api/mfa/current-code', (req, res) => {
  const did = String(req.query.did || '').trim();
  const email = normalize(req.query.email);
  const secret = getSecret(did, email);
  if (!secret) return res.status(404).json({ ok: false, message: 'Identity not enrolled' });
  const code = totp(secret);
  const remaining = Math.ceil((OTP_STEP_MS - (Date.now() % OTP_STEP_MS)) / 1000);
  res.json({ ok: true, code, remaining });
});

app.get('/api/health',(_req,res)=>res.json({ok:true,service:'AyurDAO FreeOTP/TOTP MFA',status:'active',port:Number(process.env.PORT||3000)}));

app.get('/', (_req, res) => {
  if (fs.existsSync(path.join(__dirname, 'AyurDAO_Gov_MFA.html'))) {
    return res.redirect('/AyurDAO_Gov_MFA.html');
  }
  if (fs.existsSync(path.join(__dirname, 'Ledgerstamp_Gov_MFA.html'))) {
    return res.redirect('/Ledgerstamp_Gov_MFA.html');
  }
  if (fs.existsSync(path.join(__dirname, 'TrustKernel_Gov_MFA.html'))) {
    return res.redirect('/TrustKernel_Gov_MFA.html');
  }
  res.send('AyurDAO MFA Server is running');
});

const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`AyurDAO MFA running at http://localhost:${port}`));
