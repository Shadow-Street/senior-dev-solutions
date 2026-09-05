const { ModerationLog, User, sequelize } = require("./src/models");

async function seedModLogs() {
    try {
        const user = await User.findOne();
        if (!user) {
            console.log("No users found to anchor logs to.");
            process.exit(1);
        }

        await ModerationLog.bulkCreate([
            {
                user_id: user.id,
                violation_type: "spam",
                message_content: "Buy this crypto now!!! http://scam.me",
                severity: "high",
                status: "pending",
                admin_reviewed: false
            },
            {
                user_id: user.id,
                violation_type: "harassment",
                message_content: "You are the worst trader ever.",
                severity: "medium",
                status: "pending",
                admin_reviewed: false
            },
            {
                user_id: user.id,
                violation_type: "off_topic",
                message_content: "What did you eat for breakfast?",
                severity: "low",
                status: "pending",
                admin_reviewed: false
            }
        ]);

        console.log("Sample moderation logs seeded.");
        process.exit(0);
    } catch (err) {
        console.error("Error seeding logs:", err);
        process.exit(1);
    }
}

seedModLogs();
