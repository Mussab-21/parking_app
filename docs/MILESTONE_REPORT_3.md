# Milestone Report 3: Facilities, Zones, Slots, Derived Availability & Audit Logging

## Summary of Accomplishments
1. **Owner Application & Admin Workflow**: Implemented `POST /api/v1/owner/apply` and admin approval/rejection endpoints (`/admin/owners/:id/approve|reject`), updating applicant's role to `OWNER` upon approval.
2. **Facility Approval Management**: Implemented `POST /api/v1/admin/facilities/:id/approve|reject|suspend`.
3. **Facility, Zone & Slot Inventory**:
   - Implemented facility creation, list, update, and zone creation.
   - Implemented bulk slot creation (`POST /owner/facilities/:id/slots/bulk`) creating formatted slots (e.g. `VZ-1..VZ-10`).
4. **Facility-Scoped IDOR Defense (AUTHZ-02)**: Owner A cannot read, update, or create resources in Owner B's facility. Requests return `404 Not Found` to prevent leaking existence.
5. **Optimistic Locking (DATA-05)**: Configured `version` check on facility updates. Requests with stale version return `409 Conflict`.
6. **Derived Availability Calculation**: Implemented `GET /api/v1/facilities/:id/availability?start=&hours=&zoneId=` computing slot states (`Available`, `Reserved`, `Occupied`, `Unavailable`) dynamically for requested intervals.
7. **Audit Logging**: Implemented append-only logging to `audit_logs` table for all owner approvals, facility approvals, and pricing updates.

## Test Results (Actual Terminal Output)

```text
 PASS  test/facilities.e2e-spec.ts (36.008 s)
  Facilities & Availability Test Suite (M3)
    √ M3-01: Owner application -> Admin approval -> Role updated to OWNER (2514 ms)
    √ M3-02: Facility creation -> Admin approval -> Zones & Bulk Slots creation (4852 ms)
    √ M3-03 (AUTHZ-02 IDOR Defense): Owner B CANNOT access or update Owner A facility (404 Not Found) (1168 ms)
    √ M3-04 (DATA-05 Optimistic Locking): Update with outdated version returns 409 Conflict (2319 ms)
    √ M3-05: Derived Availability Endpoint calculates free slots and slot states correctly (596 ms)
    √ M3-06: Audit Logs record facility state changes (598 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        36.586 s
Ran all test suites matching test/facilities.e2e-spec.ts.
```

| Test ID | Description | Result |
|---------|-------------|--------|
| M3-01 | Owner application & admin approval workflow | **PASS** |
| M3-02 | Facility creation, admin approval, zone & bulk slot creation | **PASS** |
| M3-03 / AUTHZ-02 | IDOR defense: Owner B cannot access/update Owner A facility (404) | **PASS** |
| M3-04 / DATA-05 | Optimistic locking conflict check (409 Conflict) | **PASS** |
| M3-05 | Derived availability calculation for interval | **PASS** |
| M3-06 | Append-only audit log verification | **PASS** |

## Next Steps
- **Milestone 4**: Booking Engine (Pricing calculation, 10-minute holds, state machine transitions, concurrency load test BOOK-04, and hold-expiry/no-show cron job).
