-- Restore the user-supplied policy catalog; retain any later user edits.
BEGIN;
WITH restored(title,category,version,effective_date,document_owner,status,content,policy_scope,updated_at) AS (VALUES
('Legacy Incident Handling Guide','Case Intake','2026','2026-08-01','System','archived','## Archived
Superseded by the Incident Reporting and Referral Guidelines (v1.6). Kept for reference only.','system','2026-10-21 16:00:00+00'),
('Student Clearance Review Guidelines','Clearance','2026','2026-08-01','System','active','## Principle
An incident report alone does not block clearance. A recorded OSWE decision determines clearance follow-up.

## Clearance hold
Record Decision & Block Clearance resolves the case and records a hold with completion instructions.

## Manual submission
The student downloads the completion form from My Reports, completes and signs it, then submits it in person to OSWE. Downloading does not release the hold.

## Clearance review
After verifying the signed form and outstanding requirements, OSWE selects Cleared and records verification. OSWE can select Place Clearance On Hold with a reason if follow-up is required.

## No Violation
Record No Violation & Archive does not change clearance.','system','2026-10-21 16:00:00+00'),
('Evidence Handling and Validation Procedure','Case Review','2026','2026-08-01','System','active','## Purpose
OSWE reviews every evidence file individually before recording a case decision.

## Evidence review
- Preview each submitted file separately.
- Assess readability, context, relevance and source.
- Mark every item Valid or Insufficient. No item may be skipped.

## Results
All-insufficient evidence uses Record Decision (No Violation), then Record No Violation & Archive. Mixed results continue to Case Action & Decision.

## Automated processing
OCR and automated tools may organize evidence but do not prove authenticity or misconduct.','system','2026-10-21 16:00:00+00'),
('Student Code of Conduct','Case Review','2021','2021-01-01','Student Handbook','active','## Purpose
Sets expectations for respectful, honest, and safe conduct by CSU students, including when they use Kasangga as tutors or learners.

## Scope
Applies to interactions arranged through Kasangga, whether online (external Google Meet or Zoom) or in person on campus.

## Expected conduct
- Treat others with respect in messages and sessions.
- Uphold academic integrity; tutors guide, they do not complete graded work.
- Keep personal information private and use approved campus locations for in-person sessions.

## Due process
An incident report is an allegation. No sanction is applied unless OSWE completes a review under the Institutional Case Review Procedure and records a decision.','institutional','2020-12-31 16:00:00+00'),
('Institutional Case Review Procedure','Case Decision','2026','2026-08-01','System','active','## Workflow
LCO Referral ? Case Details & Evidence ? Case Action & Decision ? Student Clearance follow-up where required.

## Decision
Record the outcome, written basis, policy reference and completion instructions. Record Decision & Block Clearance resolves the case, removes it from Case Review and opens Student Clearance.

## No Violation
When every evidence item is Insufficient, record No Violation and archive without changing clearance.

## Resolved records
Resolved cases appear automatically as read-only records in Case Archive. Clearance follow-up is handled separately.','system','2026-10-21 16:00:00+00'),
('Incident Reporting and Referral Guidelines','Case Intake','2026','2026-08-01','System','active','## Purpose
LCO refers conduct, safety and academic-integrity reports to OSWE. Technical and platform-only issues remain under LCO handling.

## Review
OSWE reviews each evidence item individually as Valid or Insufficient. A report is an allegation, not a finding of responsibility.

## Decision
If all evidence is Insufficient, record No Violation with a written basis and archive the case without changing clearance. Otherwise proceed to Case Action & Decision.','system','2026-10-21 16:00:00+00'),
('Tutoring Conduct and Safety Standards','Case Review','2021','2021-01-01','Student Handbook','active','## Standards
- Be punctual and give notice when unable to attend a booked session.
- Use approved public campus locations for in-person sessions.
- Keep communication within Kasangga messaging.

## Repeated no-shows
Three or more unexcused absences may be referred to OSWE.','institutional','2020-12-31 16:00:00+00'),
('Case Documentation Retention Guide','Records & Confidentiality','2026',NULL,'System','draft','## Draft status
This guide is under development and is not in effect.

## Proposed retention
Archived case records retained for five academic years, then reviewed under records-management procedures.','system','2026-10-21 16:00:00+00'))
INSERT INTO public.policies(title,category,version,effective_date,document_owner,status,content,policy_scope,updated_at,created_by)
SELECT p.title,p.category,p.version,p.effective_date::date,p.document_owner,p.status,p.content,p.policy_scope,p.updated_at::timestamptz,(SELECT u.user_id FROM public.users u JOIN public.user_roles r USING(user_id) WHERE r.role='lco' AND r.is_active AND u.account_status='active' ORDER BY u.user_id LIMIT 1)
FROM restored p WHERE NOT EXISTS(SELECT 1 FROM public.policies existing WHERE existing.title=p.title);
COMMIT;
