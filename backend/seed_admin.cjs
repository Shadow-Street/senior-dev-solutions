const bcrypt = require("bcryptjs");
require("dotenv").config();
const { assertSafeToRun, requireEnv } = require("./scripts/lib/guard");
const { User, sequelize } = require("./src/models");

async function seedAdmin() {
    try {
        assertSafeToRun({ script: "seed_admin.cjs" });
        const hashedPassword = await bcrypt.hash(requireEnv("SEED_ADMIN_PASSWORD"), 12);
        const [user, created] = await User.findOrCreate({
            where: { email: requireEnv("SEED_ADMIN_EMAIL") },
            defaults: {
                name: "Admin User",
                password: hashedPassword,
                role: "admin",
                app_role: "super_admin",
                verify_step: 1
            },
        });

        if (created) {
            console.log("Admin user created: admin@gmail.com / admin123");
        } else {
            user.password = hashedPassword;
            user.app_role = "super_admin";
            await user.save();
            console.log("Admin user updated: admin@gmail.com / admin123");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error seeding admin:", err);
        process.exit(1);
    }
}

seedAdmin();
