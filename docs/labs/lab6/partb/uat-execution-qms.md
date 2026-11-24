# Lab 6 Part B — UAT Execution Record (partner release TD_QMS)

Empty execution record. Every case, step and expected result below is copied from the partner team's files in `peer-cpe334-qms`:

- Cases: `docs/labs/lab-06/uat-cases.md`
- Handoff: `docs/labs/lab-06/handoff.md`

Nothing is executed yet. Actual result, Evidence ID, Result and Defect link cells are deliberately blank.

## Header

| Field | Value |
|---|---|
| Partner team (system under test) | TD_QMS |
| Partner repository URL | https://github.com/TeekhathatTT/CPE334-QMS |
| Tested tag / commit | <FILL LATER> |
| Deployed Cloud Run revision | <FILL LATER> |
| Environment URL | https://qms-1036193964355.asia-southeast1.run.app |
| Our testers (UAT team) | Worapol Saeku, aranedlek |
| Tester (executor) / Observer per case | Assigned at run time (see per-case tables) |
| Case source | `peer-cpe334-qms/docs/labs/lab-06/uat-cases.md` |
| Handoff source | `peer-cpe334-qms/docs/labs/lab-06/handoff.md` |
| `<BASE_URL>` used in cases | The environment URL above (their file also allows `http://localhost:5173` or a temporary tunnel URL, handoff §2) |

> Note: their handoff §2 describes local/tunnel serving only and states that no cloud deployment exists; this run uses the Cloud Run environment URL recorded above.

## Run order and dependencies (copied from their file)

From handoff.md §3 "Avoiding interference" and the case preconditions:

1. Run **UAT-01, UAT-02, UAT-04 and UAT-07 one tester at a time** (one open queue, one assigned operator and two customer accounts are shared by every tester; Call Next always takes the oldest waiting customer).
2. Agree a time slot inside the UAT team (handoff §3: how the UAT team books slots is `TO FILL` in their file).
3. Before each of those four cases, check the precondition on the `operator1` queue page: "No customers are currently waiting in this queue." and "No entries are currently called or in service."
4. After a case, finish every entry you created (Call Next, Start Service, Complete Service as `operator1`). The cases give the clean-up step.
5. Do not expect a particular queue number. Numbers never reset in Sprint 1 (BR-04), so they keep rising across testers and runs.
6. Several cases need a customer and an operator signed in at the same time: use two separate browser profiles, or one normal window and one private window (uat-cases.md, "Two browsers at once").
7. Status refresh: the customer pages re-check the status automatically every 10 seconds while visible; wait up to 15 seconds, or press **Refresh**, before recording a status as wrong (uat-cases.md, "Status refresh").
8. **UAT-07 depends on UAT-01**: precondition 1 of UAT-07 is "UAT-01 has just been run (or repeat it)". UAT-07 Parts 2 and 3 also need the owner at the terminals (handoff §2).
9. UAT-02 ends with a clean-up that depends on `operator1` (as in UAT-01, steps 5–10); UAT-07 ends with a clean-up on the last ticket created (M, P or Q).
10. Accounts (handoff §4): `customer1`, `customer2`, `operator1` (assigned to "General Inquiry Desk"), `operator2` (no assigned queue). Sign-in details are sent privately and are not written in this document.

## Rules for filling this record

> **Rules box**
>
> - Write what you **observed** on screen; do **not** copy the expected result into the Actual result column.
> - Leave Actual result, Evidence ID, Result (PASS/FAIL/BLOCKED), Defect link and Date/time blank until the step is actually executed.
> - **BLOCKED** means the step could not be executed (environment, permission, missing data). It needs a written reason and it is **not** a pass.
> - A Result of PASS requires every step of the case to have been executed and to match the expected result; otherwise record FAIL and raise a finding in `findings-reported.md`.
> - Never write a password, cookie or token in this record or in any evidence file (handoff §5: "Never the password"; mask before sharing).
> - Category below is taken from the **Interface** field of their case file (they do not define a separate category).
> - Evidence files are named per `evidence-index.md`.

---

## UAT-01: Customer joins a queue and follows it to completion

| Field | Value |
|---|---|
| Case ID | UAT-01 |
| Title | Customer joins a queue and follows it to completion |
| Category (Interface, from their file) | UI only |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | Seeded accounts `customer1` and `operator1`; seeded queue "General Inquiry Desk". No other data is typed in. |

**Preconditions (theirs):**

1. The seeded queue "General Inquiry Desk" is open, and `operator1` is assigned to it.
2. `customer1` has no Waiting, Called or In service ticket for "General Inquiry Desk" (check **My Active Tickets**; Completed tickets are fine).
3. No other customer is waiting in "General Inquiry Desk": signed in as `operator1`, the queue page shows "No customers are currently waiting in this queue." and "No entries are currently called or in service." If not, coordinate with the other testers (handoff.md §3) before you start, because Call Next always takes the oldest waiting customer.

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Window A: open `<BASE_URL>/login` and sign in as `customer1`. | Step 1: the browser goes to `/customer` and shows the tabs **Available Queues** and **My Active Tickets**. | | |
| 2 | On the **Available Queues** tab, find "General Inquiry Desk" and select **Join Queue**. | Step 2: "General Inquiry Desk" is listed with availability "Open"; "Specialized Consultation" is not listed. While the request runs, the button shows "Joining queue..." and is disabled. Then a panel shows "You joined General Inquiry Desk.", the queue name, a positive whole number under "Queue number", and the status "Waiting". Record the number as **N**. | | |
| 3 | Select **View details** in the success panel. Keep this detail page open in Window A. | Step 3: the page heading is "Queue entry". It shows queue number **N**, "General Inquiry Desk", "Status:" Waiting, the message "You are next", a "Joined:" time, and the line "Status updates automatically every 10 seconds." | | |
| 4 | Window B: open `<BASE_URL>/login` and sign in as `operator1`. | *(no expected result given for step 4)* | | |
| 5 | On "Assigned queues", select **Manage queue** for "General Inquiry Desk". | Step 5: the "Waiting Queue — FIFO (1)" section lists queue number **N** at position #1 with status Waiting and a "Customer ID:" value. No customer email or name is shown. | | |
| 6 | Select **Call Next**. | Step 6: the button shows "Calling next..." while pending. Then the banner shows "Called queue number N." Entry **N** moves to "Active Service (1)" with status Called; **Start Service** is enabled and **Complete Service** is disabled. | | |
| 7 | Window A: wait up to 15 seconds without reloading, then record the status. | Step 7: without a page reload, the customer page shows status Called, the message "Please go to the service desk.", and a "Called:" time. | | |
| 8 | Window B: select **Start Service** on the entry in "Active Service". | Step 8: the banner shows "Started service for queue number N." The entry shows status In service; **Start Service** is disabled and **Complete Service** is enabled. | | |
| 9 | Window A: wait up to 15 seconds, then record the status. | Step 9: the customer page shows status In service, the message "Your service is in progress.", and a "Service started:" time. | | |
| 10 | Window B: select **Complete Service** on the same entry. | Step 10: the banner shows "Completed service for queue number N." Entry **N** appears under "Completed (…)" with status Completed, and "Active Service (0)" shows "No entries are currently called or in service." | | |
| 11 | Window A: wait up to 15 seconds, then record the status. | Step 11: the customer page shows status Completed, the message "Service completed.", a "Completed:" time, and the line "This entry is complete and no longer updates." | | |
| — (all steps) | — | At no step does any page show a stack trace, SQL text or another customer's data. | | |

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |

---

## UAT-02: Duplicate active join in the same queue is refused

| Field | Value |
|---|---|
| Case ID | UAT-02 |
| Title | Duplicate active join in the same queue is refused |
| Category (Interface, from their file) | UI only |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | Seeded account `customer1`; seeded queue "General Inquiry Desk". |

**Preconditions (theirs):**

1. "General Inquiry Desk" is open.
2. `customer1` has no active (Waiting, Called or In service) ticket for "General Inquiry Desk".

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Sign in as `customer1`. | *(no expected result given for step 1)* | | |
| 2 | On **Available Queues**, select **Join Queue** on "General Inquiry Desk". Record the queue number as **N**. | Step 2: the panel shows "You joined General Inquiry Desk.", queue number **N** and status Waiting. | | |
| 3 | Select **Join Queue** on "General Inquiry Desk" a second time. | Step 3: an error message shows "You already have an active entry in this queue." The **Join Queue** button is enabled again after the request finishes. No new queue number is shown. | | |
| 4 | Open the **My Active Tickets** tab. | Step 4: exactly one ticket for "General Inquiry Desk" has status Waiting, and it has queue number **N**. (Completed tickets from earlier runs may also be listed; they do not count.) | | |

**Clean-up (theirs):** ask `operator1` to call, start and complete ticket **N** (as in UAT-01, steps 5–10), so the next tester starts from an empty queue.

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |

---

## UAT-03: A closed queue cannot be joined

| Field | Value |
|---|---|
| Case ID | UAT-03 |
| Title | A closed queue cannot be joined |
| Category (Interface, from their file) | UI (steps 1–3); API from the browser developer console (steps 4–6, optional) |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | Seeded account `customer1`; the seeded queue id `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`. |

**Preconditions (theirs):**

1. The seeded queue "Specialized Consultation" is CLOSED (its seeded state). Its id is `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` (from `server/prisma/seed.ts`).
2. Steps 4–6 only: the tester can open the browser developer tools console.

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Sign in as `customer1`. | *(no expected result given for step 1)* | | |
| 2 | Look at every queue card on **Available Queues**. | Step 2: "General Inquiry Desk" is listed; "Specialized Consultation" is not listed anywhere on the page. | | |
| 3 | Open **My Active Tickets** and note how many tickets are listed. | *(no expected result given for step 3)* | | |
| 4 | (Optional, API) In the same tab, open the developer tools console and run: `const csrf = decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('qms_csrf=')).split('=')[1]);`<br>`const r = await fetch('/api/queues/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/entries', { method: 'POST', headers: { 'X-CSRF-Token': csrf } });`<br>`console.log(r.status, await r.json());` | *(no expected result given for step 4; the result is checked in step 5)* | | |
| 5 | (Optional, API) Note the status and body printed. | Step 5: the console prints `409` and a body whose `error.code` is `QUEUE_NOT_AVAILABLE`, with a `message` and a `requestId`. No `data` field and no internal details (stack trace, SQL) are returned. | | |
| 6 | (Optional) Reload the page and open **My Active Tickets** again. | Step 6: the number of tickets is the same as in step 3; there is no ticket for "Specialized Consultation". | | |

**Note (theirs):** The UI cannot reach the closed-queue message ("This queue is not available right now.") from the browser alone, because a closed queue is never listed. That message appears only if a queue closes while the customer has the list open, and Sprint 1 has no screen for closing a queue.

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |

---

## UAT-04: First in, first out, and Call Next on an empty queue

| Field | Value |
|---|---|
| Case ID | UAT-04 |
| Title | First in, first out, and Call Next on an empty queue |
| Category (Interface, from their file) | UI only |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | Seeded accounts `customer1`, `customer2`, `operator1`; seeded queue "General Inquiry Desk". |

**Preconditions (theirs):**

1. Same as UAT-01 preconditions 1 and 3 (no one waiting, nothing called or in service in "General Inquiry Desk").
2. Neither `customer1` nor `customer2` has an active ticket for "General Inquiry Desk".

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Window A: sign in as `customer1` and join "General Inquiry Desk". Record the number as **N1**. | Steps 1–2: **N1** and **N2** are positive whole numbers and **N2** is greater than **N1**. (If no one else joined in between, **N2** is **N1** + 1.) | | |
| 2 | Window B: sign in as `customer2` and join "General Inquiry Desk". Record the number as **N2**. | *(covered by the "Steps 1–2" expected result above)* | | |
| 3 | Window C: sign in as `operator1`, select **Manage queue** for "General Inquiry Desk", and read the "Waiting Queue — FIFO" section. | Step 3: "Waiting Queue — FIFO (2)" lists **N1** at position #1 and **N2** at position #2. The "Customer ID:" values differ between the two rows. | | |
| 4 | Window C: select **Call Next**. | Step 4: the banner shows "Called queue number N1." (not N2). **N2** is still listed as Waiting at position #1. | | |
| 5 | Window C: select **Start Service**, then **Complete Service**, on the entry in "Active Service". | *(no expected result given for step 5)* | | |
| 6 | Window C: select **Call Next**, then **Start Service** and **Complete Service** on the new entry. | Step 6: the banner shows "Called queue number N2." | | |
| 7 | Window C: note the counts on the page, then select **Call Next** once more. | Step 7: the banner shows "No waiting entries to call right now." The "Waiting", "Active" and "Completed" counts at the top of the page are the same as before the click, and **N1** and **N2** are still listed under "Completed (…)" with status Completed. | | |
| — (after step 7) | Window B (`customer2`) checks the status of ticket **N2**. | Window B (`customer2`) shows status Completed for ticket **N2** after a refresh. | | |

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |

---

## UAT-05: A customer cannot use operator screens or another customer's ticket

| Field | Value |
|---|---|
| Case ID | UAT-05 |
| Title | A customer cannot use operator screens or another customer's ticket |
| Category (Interface, from their file) | UI only |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | Seeded accounts; the address of one of `customer1`'s ticket detail pages; the seeded queue id `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` ("General Inquiry Desk"). |

**Preconditions (theirs):**

1. `customer1` has at least one ticket in **My Active Tickets** (any status). If not, join "General Inquiry Desk" first.
2. Two separate browser sessions (handoff.md, "Two browsers at once").

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Window A: sign in as `customer1`, open **My Active Tickets**, select **View details** on a ticket, and copy the full address from the address bar (it has the form `<BASE_URL>/customer/entries/<id>`). Record the queue number shown. | *(no expected result given for step 1)* | | |
| 2 | Window A: type `<BASE_URL>/operator` in the address bar and press Enter. | Steps 2 and 3: the browser ends on `/customer` (the customer's own screen). No "Call Next", "Start Service" or "Complete Service" button and no operator queue data appear at any point. (The spec does not say what message a wrong-role user should see; see handoff.md, Known limitations.) | | |
| 3 | Window A: type `<BASE_URL>/operator/queues/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` and press Enter. | *(covered by the "Steps 2 and 3" expected result above)* | | |
| 4 | Window B: sign in as `customer2`, then paste the address copied in step 1 and press Enter. | Step 4: the page heading is "Queue entry" and the only content is "We couldn't find that queue entry." No queue number, status, timestamps, customer ID or email of `customer1` is shown. | | |
| 5 | Window B: sign out (**Logout**). Sign in as `operator1`, then type `<BASE_URL>/customer` and press Enter. | Step 5: the browser ends on `/operator` (the "Assigned queues" screen). No **Join Queue** button and no customer ticket list appear. | | |

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |

---

## UAT-06: An operator not assigned to the queue cannot work it

| Field | Value |
|---|---|
| Case ID | UAT-06 |
| Title | An operator not assigned to the queue cannot work it |
| Category (Interface, from their file) | UI only |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | Seeded account `operator2`; seeded queue id `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`. |

**Preconditions (theirs):**

1. `operator2` has no queue assignment (seeded state).
2. Preferably at least one customer is waiting in "General Inquiry Desk", so the test shows that no customer data leaks.

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Sign in as `operator2`. | *(no expected result given for step 1)* | | |
| 2 | Read the "Assigned queues" screen. | Step 2: the screen shows "You have no assigned service queues." and no **Manage queue** link. | | |
| 3 | Type `<BASE_URL>/operator/queues/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` in the address bar and press Enter. | Step 3: the page shows "You do not have permission to manage this queue." There is no **Call Next** button, no "Waiting Queue — FIFO" section, and no queue number or "Customer ID:" value. | | |
| — (after step 3) | As `operator1`, check the queue page. | Afterwards, `operator1` still sees the same waiting entries as before (nothing was changed by `operator2`). | | |

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |

---

## UAT-07: Data and history survive a refresh and a new sign-in; a completed ticket can be followed by a new one

| Field | Value |
|---|---|
| Case ID | UAT-07 |
| Title | Data and history survive a refresh and a new sign-in; a completed ticket can be followed by a new one |
| Category (Interface, from their file) | UI (tester); terminal on the owner's machine (owner, Parts 2 and 3) |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | Seeded accounts `customer1`, `operator1`. |

**Preconditions (theirs):**

1. UAT-01 has just been run (or repeat it): `customer1` has a Completed ticket **N** in "General Inquiry Desk" and no active ticket there.
2. Parts 2 and 3: the owner started the app as in handoff.md §2 ("Owner: starting the app") and can reach both terminals and the repository folder. No other tester is using the queue.

### Part 1: refresh, new sign-in, rejoin (tester)

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | As `customer1`, open **My Active Tickets** and press the browser's reload button. | Step 1: after the reload, ticket **N** is still listed for "General Inquiry Desk" with status Completed and its "Joined:", "Called:", "Service started:" and "Completed:" times. | | |
| 2 | Select **Logout**, close the browser window, open a new one, go to `<BASE_URL>/login` and sign in as `customer1` again. | Step 2: after **Logout**, the browser shows the "Sign in" screen. After signing in again, it shows `/customer`. | | |
| 3 | Open **My Active Tickets**, then **View details** on ticket **N**. | Step 3: ticket **N** is still in the list with status Completed. The detail page shows "Service completed." and "This entry is complete and no longer updates.", with the same times as in step 1. | | |
| 4 | As `operator1`, reload the "General Inquiry Desk" queue page. | Step 4: ticket **N** is listed under "Completed (…)" with the same queue number. | | |
| 5 | As `customer1`, go back to **Available Queues** and select **Join Queue** on "General Inquiry Desk". Record the number as **M**. Leave ticket **M** Waiting for Part 2. | Step 5: the join succeeds with "You joined General Inquiry Desk." and status Waiting. **M** is greater than **N** (numbers are not reused). **My Active Tickets** now shows both the new Waiting ticket **M** and the Completed ticket **N**. | | |

### Part 2: API server restart (owner does, tester checks)

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Tester: on **My Active Tickets**, write down each ticket's queue number, status and times (at least **M** Waiting and **N** Completed). | *(no expected result given for step 1)* | | |
| 2 | Owner: in the terminal running `npm run dev:server`, press `Ctrl+C` and wait until the command has stopped. | Step 2: the owner's terminal returns to the prompt. While the API is stopped, the tester's open page may show "Could not refresh. Retrying..."; that is expected. | | |
| 3 | Owner: start it again with the same command, `npm run dev:server`, and wait for the line `[QMS Server] Running on http://localhost:3000`. | Step 3: the owner's terminal shows `[QMS Server] Running on http://localhost:3000`. | | |
| 4 | Tester: as `customer1`, press the browser's reload button on **My Active Tickets**. | Step 4: the tester is still signed in (sessions are stored in the database), no "Sign in" screen appears, and the list matches step 1 exactly: **M** Waiting, **N** Completed, same numbers and times. | | |
| 5 | Tester: as `operator1`, reload the "General Inquiry Desk" queue page. | Step 5: "Waiting Queue — FIFO (1)" lists **M** at position #1; ticket **N** is under "Completed (…)". | | |
| 6 | Tester: as `operator1`, select **Call Next**, then **Start Service** and **Complete Service** on ticket **M**. | Step 6: the banners show "Called queue number M.", "Started service for queue number M." and "Completed service for queue number M." | | |
| 7 | Tester: as `customer1`, join "General Inquiry Desk" again. Record the number as **P**. | Step 7: the join succeeds with status Waiting and **P** is greater than **M**; if no one else joined in between, **P** is **M** + 1. Numbering continued after the restart instead of starting again. | | |

### Part 3 (optional): database container restart (owner does, tester checks)

> **Warning for the owner (theirs):** never run `docker compose down -v`, or any other command that removes the `qms_postgres_data` volume, during UAT. It deletes every queue entry, account and session (handoff.md §3, Reset).

The data survives this restart because `docker-compose.yml` stores PostgreSQL's data directory (`/var/lib/postgresql/data`) in the named volume `qms_postgres_data`, and restarting the container keeps the volume.

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Tester: on **My Active Tickets**, write down ticket **P**'s number and status (Waiting) and the numbers of the Completed tickets. | *(no expected result given for step 1)* | | |
| 2 | Owner: press `Ctrl+C` in the `npm run dev:server` terminal. | *(no expected result given for step 2)* | | |
| 3 | Owner: run `docker compose restart postgres` from the repository root, then run `docker compose ps` until the `qms-postgres` container shows as healthy. | Step 3: `docker compose ps` shows `qms-postgres` running and healthy. | | |
| 4 | Owner: start the API again with `npm run dev:server` and wait for `[QMS Server] Running on http://localhost:3000`. | *(no expected result given for step 4)* | | |
| 5 | Tester: as `customer1`, reload **My Active Tickets**. | Step 5: the tester is still signed in and the list matches step 1: **P** Waiting, the earlier tickets Completed, same numbers and times. | | |
| 6 | Tester: as `operator1`, reload the queue page, then complete ticket **P** (**Call Next**, **Start Service**, **Complete Service**). | Step 6: "Called queue number P." is shown first (FIFO is unchanged), then the Start and Complete banners for **P**. | | |
| 7 | Tester: as `customer1`, join "General Inquiry Desk" again. Record the number as **Q**. | Step 7: **Q** is greater than **P**; if no one else joined in between, **Q** is **P** + 1. | | |

**Clean-up (theirs):** ask `operator1` to call, start and complete the last ticket you created (**M** if you stopped after Part 1, **P** after Part 2, **Q** after Part 3).

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |

---

## UAT-08: Sign-in is refused for a wrong password, and sign-out ends the session

| Field | Value |
|---|---|
| Case ID | UAT-08 |
| Title | Sign-in is refused for a wrong password, and sign-out ends the session |
| Category (Interface, from their file) | UI only |
| Tester (executor) | |
| Observer | |
| Date/time | |
| Tested version | |
| Inputs used | The sign-in name of `customer1` with an obviously wrong password (value not recorded in this document); an obviously fake sign-in name, for example `nobody-uat` at a fake domain such as `example.invalid` (written as name@domain). |

**Preconditions (theirs):** the tester is signed out.

| Step | Action (from their case) | Their expected result (from their case) | Actual result | Evidence ID |
|---|---|---|---|---|
| 1 | Open `<BASE_URL>/customer` while signed out. | Step 1: the browser shows the "Sign in" screen at `/login`, without the "Session expired. Please sign in again." banner. | | |
| 2 | On the "Sign in" screen, select **Sign in** with both fields empty. | Step 2: the field messages "Email is required." and "Password is required." are shown and no sign-in happens. | | |
| 3 | Enter the `customer1` sign-in name with the wrong password and select **Sign in**. | Steps 3 and 4: both attempts show exactly the same message, "Invalid email or password.", and stay on `/login`. Nothing on the page says whether the account exists. | | |
| 4 | Enter the fake sign-in name with the same wrong password and select **Sign in**. | *(covered by the "Steps 3 and 4" expected result above)* | | |
| 5 | Sign in as `customer1` with the correct password, then select **Logout**. | Step 5: sign-in goes to `/customer`; **Logout** returns to the "Sign in" screen. | | |
| 6 | Open `<BASE_URL>/customer` again. | Step 6: the browser shows the "Sign in" screen again; no customer data is shown. | | |

| Field | Value |
|---|---|
| Result (PASS/FAIL/BLOCKED) | |
| Defect link | |
