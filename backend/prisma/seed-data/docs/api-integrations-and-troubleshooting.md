# API, integrations and troubleshooting

## API authentication
Every API request needs an API key in the Authorization header as "Bearer <key>". Create keys under Settings > Developers > API keys. A 401 Unauthorized error usually means the key was revoked, copied with extra spaces, or belongs to a different workspace. Keys are shown only once; create a new key if you have lost it.

## Rate limits
The API allows 600 requests per minute per workspace on the Business plan and 120 requests per minute on the Pro plan. When you exceed the limit the API returns HTTP 429 with a Retry-After header telling you how many seconds to wait. Use exponential backoff and batch endpoints to stay under the limit.

## Webhooks
Webhooks are delivered with an HTTP POST and must receive a 2xx response within 10 seconds. Failed deliveries are retried 8 times over 24 hours with exponential backoff. After 24 hours of continuous failures the webhook endpoint is disabled automatically and the workspace admin is emailed; re-enable it under Settings > Developers > Webhooks once your endpoint is healthy. Verify each delivery with the X-Signature header (HMAC-SHA256 of the body using your signing secret).

## Slow dashboard or timeouts
Dashboards with more than 50 widgets or date ranges longer than one year can take longer to load. Narrow the date range, remove unused widgets, and check status.example.com for ongoing incidents. If a single page consistently takes longer than 30 seconds, raise a ticket with the page URL and the time it happened.

## File uploads and exports
The maximum upload size is 25 MB per file. CSV exports of more than 100,000 rows are generated in the background and emailed as a download link that is valid for 7 days. If an export is empty, check that the selected filters return data in the table view.

## Mobile app issues
If the mobile app crashes or shows a blank screen, update to the latest version from the app store, then sign out and sign in again. Clearing the app cache (Android) or reinstalling (iOS) fixes most issues after major updates.
