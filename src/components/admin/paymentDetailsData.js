export const paymentBookings = {
 'BK-2026-1842': {id:'BK-2026-1842',booking:'BK-2026-1842',learner:'Juan Dela Cruz',tutor:'Maria Angelica Reyes',service:'Calculus Tutorial',topic:'Limits and Derivatives',date:'2026-09-17',start:'09:00',end:'10:00',type:'Online',provider:'Google Meet',amount:350,status:'Confirmed',payment:'Paid',transaction:'TXN-2026-0917-1842',paymentMethod:'GCash via PayMongo'},
 'BK-2026-1831': {id:'BK-2026-1831',booking:'BK-2026-1831',learner:'Mark Joseph Paloma',tutor:'Kristine Joy Lagmay',service:'Statistics Coaching',topic:'Hypothesis Testing',date:'2026-09-16',start:'10:00',end:'11:00',type:'Online',provider:'Google Meet',amount:350,status:'Cancelled',payment:'Refund Review',transaction:'TXN-2026-0916-1831',paymentMethod:'GCash via PayMongo',cancellation:{by:'Mark Joseph Paloma (Learner)',at:'Sep 16, 2026 · 9:40 AM',reason:'Class schedule conflict.'}}
};
export function refundDecision(record,decision,note){
 if(record.payment!=='Refund Review'||record.refundDecision)throw new Error('This refund is not awaiting a decision.');
 if(!['Approved','Declined'].includes(decision))throw new Error('Invalid refund decision.');
 if(note.trim().length<15)throw new Error('Enter at least 15 characters.');
 return {...record,refundDecision:{decision,note:note.trim(),at:new Date().toISOString(),by:'Admin User'},history:[...(record.history||[]),{to:`Refund ${decision} (local)`,reason:note.trim(),at:new Date().toISOString(),by:'Admin User'}]};
}
