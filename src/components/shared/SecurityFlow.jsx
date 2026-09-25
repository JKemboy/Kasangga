import {useState} from 'react';
import {Field,input,button,primary} from '../tutor/workspace/ui.jsx';
import {portalApi} from '../../services/portalApi.js';

export default function SecurityFlow({mode,onClose}){
 const [step,setStep]=useState('form'),[pending,setPending]=useState(false),[error,setError]=useState(''),[challenge,setChallenge]=useState(null),[sessions,setSessions]=useState(null),[codes,setCodes]=useState(null);
 async function submit(e){e.preventDefault();setError('');const f=Object.fromEntries(new FormData(e.currentTarget));
  if(step==='form'&&(f.newPassword.length<8||!/[0-9]/.test(f.newPassword)||f.newPassword===f.currentPassword||f.newPassword!==f.confirmPassword)){setError('Use a different password with at least 8 characters and one number; both new password fields must match.');return;}
  setPending(true);try{if(step==='form'){const result=await portalApi('beginPasswordChange',f);setChallenge(result.challengeId);setStep('verify');}else{await portalApi('verifyPasswordChange',{challengeId:challenge,code:f.code});setStep('done');}}catch(e){setError(e.message);}finally{setPending(false);}}
 async function security(action,payload){setPending(true);setError('');try{const result=await portalApi(action,payload);if(action==='listSessions')setSessions(result);if(action==='generateRecoveryCodes')setCodes(result);if(action==='revokeSession')setSessions(v=>v.filter(s=>s.id!==payload.id));}catch(e){setError(e.message);}finally{setPending(false);}}
 return <div className="space-y-3 text-xs">
 {mode==='Change Password'?step==='done'?<><p>Password changed successfully.</p><button className={primary} onClick={onClose}>Done</button></>:<form onSubmit={submit} className="space-y-3" aria-busy={pending}>
 {step==='form'?<><Field label="Current Password" name="currentPassword" type="password" autoComplete="current-password" required/><Field label="New Password" name="newPassword" type="password" autoComplete="new-password" required minLength={8}/><Field label="Confirm New Password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8}/></>:<><p>Enter the verification code sent by your identity service.</p><Field label="Verification Code" name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required/></>}
 <div className="flex justify-end gap-2"><button type="button" className={button} onClick={onClose} disabled={pending}>Cancel</button><button className={primary} disabled={pending}>{pending?'Processing…':step==='form'?'Continue':'Verify & Update'}</button></div>
 </form>:<><p>Manage your authentication sessions and recovery codes.</p><div className="flex gap-2"><button className={button} disabled={pending} onClick={()=>security('listSessions')}>Load Active Sessions</button><button className={button} disabled={pending} onClick={()=>security('generateRecoveryCodes')}>Generate Recovery Codes</button></div>{sessions?.map(s=><div key={s.id} className="flex justify-between rounded border p-2"><span>{s.device} · {s.location}</span><button className={button} disabled={s.current||pending} onClick={()=>security('revokeSession',{id:s.id})}>{s.current?'This Device':'Sign Out'}</button></div>)}{codes&&<div className="grid grid-cols-2 gap-2 font-mono">{codes.map(c=><span key={c}>{c}</span>)}</div>}</>}
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 </div>;
}
