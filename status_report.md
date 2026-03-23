# Issue Resolved: CORS Error

The "Cross-Origin Request Blocked" error occurred because your frontend started on port **5174** (likely because 5173 was in use), but the backend was strictly configured to only accept connections from **5173**.

## Fix Applied
I have updated `server/server.js` to allow connections from both ports:
```javascript
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
```

## Action Required
- The backend (`nodemon`) should restart automatically.
- You can now retry the **Login**.
