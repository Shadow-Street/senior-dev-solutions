const { User } = require('./src/models');
const bcrypt = require('bcryptjs');

async function seedSuperAdmin() {
    try {
        const email = 'myshadow.ims@gmail.com';
        const password = 'Yasmu@009';
        const hashedPassword = await bcrypt.hash(password, 10);

        const [user, created] = await User.findOrCreate({
            where: { email },
            defaults: {
                name: 'Super Admin',
                password: hashedPassword,
                role: 'admin',
                app_role: 'super_admin',
                is_premium: true,
                status: 'active'
            }
        });

        if (!created) {
            console.log('User exists. Updating role to super_admin...');
            user.app_role = 'super_admin';
            user.role = 'admin'; // Ensure basic role is also admin just in case
            user.password = hashedPassword; // Reset password to ensure it matches
            await user.save();
        }

        console.log('Super Admin user seeded successfully.');
        console.log('Email:', email);
        console.log('App Role:', user.app_role);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding user:', error);
        process.exit(1);
    }
}

seedSuperAdmin();
