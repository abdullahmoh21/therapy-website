# Note:
Since the website is actively used and contains client images, I cannot upload screenshots to showcase it. However, you are welcome to view the source code instead. Here are some key features that were implemented:
- Custom JWT-based authentication and authorization for secure user access.
- Integration with credit card and bank account payment processing.
- Session scheduling seamlessly integrated with the Calendly API.
- Webhooks for real-time updates on payments and bookings from external services.
- Rate-limited API endpoints with exponential backoff and permanent blocking for abusive requests.
- Key endpoint caching implemented using KeyDB (an open-source Redis alternative) for improved performance.
- Expensive tasks like email sending and database-intensive operations offloaded to a job queue for efficiency.
- Automated email notifications to admins upon job failures for prompt issue resolution.
- Email templating using Handlebars for dynamic and personalized communication.

If you’re a recruiter who has made it this far (seriously, hire me), feel free to reach out with any questions — I’d be more than happy to answer them via [email.](mailto:anaqvi02@student.ubc.ca)
