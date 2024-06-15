BACKEND

- Rate limit forgotPwd, EmailVerify, and all other requests
- make sure redunant requests are accounted for. i.e updateuser endpoint called with no changes...
- Implement winston or something simpler for logging(current ki production aukat nahi)
- error handling library?
- Welcome, Account Deleted,Account activated, payment confirmation and password reset emails (with EJS or Handlebars)
- implement https
- Bank Alfalah Payment API
- double cookie method or other for CSRF attacks
- ask our friend for other security implementations i need

FRONTEND

- if user is signed in change signin button on navbar to a dash button
- Admin Dashboard:
  - Add pulsing loading state to tables
  - Account deletion popup confirmation
  - move edit my details to admin dash. so no need to go to /dash
  - logout button
  - payment status and other metrics in a react-table table. Charts?
  - edit default therapy price and individually
- Client Dashboard:
  - Add pulsing loading state to tables
  - Logout behavior with no connection
  - request rescheduleing/cancellations of booking: add calendly links as buttons to booking cells
  - remove calendly popup and instead have default button with unique link from backend
  - Therapy Notes?
  - Tips to improve website
- Mobile View
- Book Now button redirect to Calendly page or /booknow page describing process

NOTES:

- Calendly user details:
  {
  "resource": {
  "avatar_url": null,
  "created_at": "2024-04-14T21:54:07.486563Z",
  "current_organization": "https://api.calendly.com/organizations/514a0ff8-ae4d-4570-a8ef-1624f71e7b6a",
  "email": "abdullahmohsin21007@gmail.com",
  "name": "abdullah mohsin",
  "resource_type": "User",
  "scheduling_url": "https://calendly.com/fatimamohsintherapy",
  "slug": "fatimamohsintherapy",
  "timezone": "Asia/Karachi",
  "updated_at": "2024-06-10T07:04:25.199196Z",
  "uri": "https://api.calendly.com/users/81d01010-1831-4918-b8fc-4c2f8d238d6b"
  }
  }
