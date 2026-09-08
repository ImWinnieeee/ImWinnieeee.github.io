# Website analytics

Measurement ID: `G-5K0P5MP0RY`. Only `imwinnieeee.github.io` sends events. This ID is public and provides no permission to read reports. GA account/property access must be restricted to the owner in Admin → Account/Property access management; that configuration cannot be verified from this repository.

Keep enhanced measurement enabled for automatic page views (including browser history changes). The application does not manually send page_view, preventing duplicate manual/automatic events. Use section_view and section_name for reliable hash-route breakdowns.

## Events

- `section_view`: entering Food Map, Community & Activities, or Work & Education; `section_name` and `content_name` identify the section.
- `project_open`: opening a work, school, or activity story; includes `project_name` and `section_name`.
- `content_engagement`: incremental focused, visible time, with `content_type` (section/project), `content_name`, `section_name`, and `duration_seconds`. Sent every 15 seconds, on section/project changes, blur, hide, and page exit. Project time is exclusive of underlying section time. This estimates foreground viewing, not active reading. Individual cards merely scrolled past are not timed.
- `external_link_click`: outbound HTTP(S) links; includes link text, URL without query/hash, and project name when open. Distinct from GA's built-in click event; do not sum both events together.

## Owner setup in GA

1. Admin → Data display → Custom definitions: create event-scoped dimensions for `section_name`, `project_name`, `content_type`, `content_name`.
2. Create an event-scoped custom metric: name `Viewing seconds`, event parameter `duration_seconds`, unit Seconds.
3. In Explore, build a free-form report with content_name rows, filter event name = content_engagement, and Viewing seconds plus Total users as values. Sum of Viewing seconds gives total time, not average time per heartbeat. For time per visitor divide that total by Total users; do not interpret average event value as average visit duration.
4. Use section_view/project_open event counts for visits/opens, and the standard demographic and acquisition reports for country and traffic source. Country is approximate; blocking or denied collection can reduce coverage.
5. Realtime can confirm initial events after deployment; custom definitions and regular reports may take 24–48 hours. Historical pre-installation visits cannot be recovered.

Keep report access private: do not grant other users account/property access or publish/export reports publicly. Google processes collected analytics data; this is not self-hosted storage. No names, emails, logins, or session recordings are added by this integration.

To exclude your own visits in a browser, run `localStorage.setItem('analytics-opt-out', 'true')` in the site's browser console, then reload. To resume, remove that key and reload. Each browser has its own setting.

Validation: `node --test tests/analytics.test.mjs` and `npm run build`. Tests use a stubbed gtag queue and send no real analytics traffic. Verify actual receipt in the owner's GA Realtime view after deployment.
