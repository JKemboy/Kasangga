export const adminAlerts = [
 ['app-0133','New Tutor Application','Faye Ann Villanueva submitted APP-2026-0133 (New Tutor · English).','Sep 17, 2026 · 9:05 AM','application','Tutor Verification'],
 ['app-0131','Resubmission Received','Maria Angelica Reyes resubmitted documents for APP-2026-0131.','Sep 15, 2026 · 9:40 AM','application','Tutor Verification'],
 ['txn-1831','Payment / Transaction Issue','Refund request on TXN-2026-0916-1831 awaits review.','Sep 16, 2026 · 9:41 AM','payment','Payments & Transactions'],
 ['ir-0142','New Incident','IR-2026-0142: meeting link inaccessible on BK-2026-1842.','Sep 17, 2026 · 9:12 AM','incident','Incident Reports'],
 ['srv-1029','Service Moderation Alert','SRV-2026-1029 is suspended with an open change request to the tutor.','Sep 16, 2026 · 2:20 PM','service','Service Management'],
 ['log-2318','System Alert','Failed admin login attempt from 203.177.45.82.','Sep 14, 2026 · 11:18 PM','system','Audit Logs'],
 ['ir-0138','New Incident','IR-2026-0138: harassment allegation awaiting screening.','Sep 15, 2026 · 1:02 PM','incident','Incident Reports'],
 ['app-0130','New Tutor Application','Ella Mae Santos submitted APP-2026-0130 (Data Structures).','Sep 15, 2026 · 2:12 PM','application','Tutor Verification'],
].map(([id,title,text,time,kind,view],i)=>({id,title,text,time,kind,view,read:i>5,demo:true}));
export const adminThreads = [
 ['Karl Jhon Dimaano','I removed the credential claim from my Web Development service. Can you review it?','Sep 17, 2026 · 11:05 AM'],
 ['Mark Joseph Paloma','Following up on my refund request for BK-2026-1831.','Sep 17, 2026 · 10:20 AM'],
 ['OSAS · Maria Santos','Received the referral for IR-2026-0141. Thank you.','Sep 16, 2026 · 4:02 PM'],
].map(([name,text,time])=>({name,demo:true,messages:[{text,time}]}));
