# Service topics and availability

Create Service has one Service title / Subject and description. Each topic has
its own hourly rate, Online/In-Person choices, meeting details, and dates/times.
Online requires an HTTPS meeting link; In-Person requires a meeting place; Both
requires both inputs. Category and level are no longer form inputs.

Each topic supports up to 20 one-hour dates/times. Repeat last date weekly adds
four dated occurrences of every time on the last selected date, not an indefinite schedule.
Dates group multiple times with Add time on this date and Remove this date controls.
Time choices use existing general tutor availability and exclude classes, protected
hours, pending/confirmed bookings, other service availability and draft topic times.
Without general availability, only conflict-free working-hour choices are offered.
The form refreshes its schedule on focus and every 15 seconds. Reapply topic_services.sql
to install the authenticated get_my_tutor_booking_blocks RPC used by this check.
Tutoring Availability still
supports single dates or weekly availability for all services, one service, or
one topic. Topic schedules are checked against classes, booked sessions, and
other topic/service schedules. Service/topic/schedule saves are atomic.

Apply these files in Supabase SQL Editor in this order:

1. `supabase/manual/service_availability.sql`
2. `supabase/manual/topic_services.sql`
3. `supabase/manual/multi_session_booking.sql`
4. `supabase/manual/learner_sessions.sql`

Deploy the updated `create-payment` function. The existing updated
`paymongo-webhook` function is still required for multi-session payments.
No live migration or deployment is performed by editing these local files.

The scripts extend existing tables with topic rates, session types, meeting
links/places, and topic IDs on availability and bookings. Existing topics inherit
the service rate/type. Existing availability remains weekly when it has no date.
Learner checkout uses the selected topic's database rate and allowed session
types, validates its availability, and copies the applicable link/place to each
booking. Booking records retain their paid rate when topic prices change later.

Run local tests:

```sh
node --test src/components/tutor/workspace/topicServiceRules.test.mjs src/services/availabilityTimes.test.mjs supabase/functions/create-payment/batch.test.mjs
npm run build
```
