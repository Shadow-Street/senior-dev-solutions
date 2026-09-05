const bcrypt = require("bcryptjs");
const { User, sequelize } = require("./src/models");

async function seedAdmin() {
    try {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const [user, created] = await User.findOrCreate({
            where: { email: "admin@gmail.com" },
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
