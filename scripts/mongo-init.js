// MongoDB initialization script for Docker
// This runs when the container is first created

db = db.getSiblingDB("timesheet");

// Create application user with limited permissions
db.createUser({
  user: "timesheet_app",
  pwd: "timesheet_password", // Change in production!
  roles: [
    {
      role: "readWrite",
      db: "timesheet",
    },
  ],
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ teamId: 1 });

db.timesheets.createIndex({ userId: 1, month: 1, year: 1 }, { unique: true });
db.timesheets.createIndex({ status: 1 });
db.timesheets.createIndex({ teamId: 1, status: 1 });

db.leaverequests.createIndex({ userId: 1, status: 1 });
db.leaverequests.createIndex({ startDate: 1, endDate: 1 });

db.teams.createIndex({ name: 1 }, { unique: true });
db.teams.createIndex({ leaderId: 1 });

db.holidays.createIndex({ date: 1 });
db.holidays.createIndex({ year: 1 });

db.auditlogs.createIndex({ userId: 1 });
db.auditlogs.createIndex({ createdAt: -1 });
db.auditlogs.createIndex({ action: 1 });

print("Database initialized with indexes");
