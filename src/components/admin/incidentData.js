import { requireBackendPersistence } from "../../services/backendPersistence.js";
import { loadCollection } from "./adminData.js";
export const incidentKey = "campustutor:admin-incidents:v1";
export const initialIncidents = [];

export function loadIncidents() { return loadCollection(incidentKey, initialIncidents); }
export function saveIncidents(rows) { try { requireBackendPersistence();
} catch { return false; } }
export function reviewIncident(record, action, notes) {
 if (['Admin Screening Complete', 'Resolved by Admin'].includes(record.status)) throw new Error('This review is complete.');
 if (!['Resolved by Admin', 'Referred to OSAS'].includes(action) || (action === 'Resolved by Admin' && record.type !== 'Platform / Technical')) throw new Error('Choose an action appropriate for this report.');
 if (notes.trim().length < 15) throw new Error('Enter at least 15 characters.');
 return {...record, status: action === 'Referred to OSAS' ? 'Admin Screening Complete' : action, referral: action === 'Referred to OSAS' ? action : record.referral, history:[...(record.history || []),{action, notes:notes.trim(), at:new Date().toISOString(), by:'Admin User'}]};
}
