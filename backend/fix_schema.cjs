const { sequelize } = require("./src/models");

async function fixSchema() {
    const addColumn = async (col, type) => {
        try {
            await sequelize.query(`ALTER TABLE moderation_logs ADD COLUMN ${col} ${type}`);
            console.log(`Added column ${col}`);
        } catch (err) {
            if (err.parent && err.parent.errno === 1060) {
                console.log(`Column ${col} already exists`);
            } else {
                throw err;
            }
        }
    };

    try {
        await addColumn("user_id", "CHAR(36) BINARY");
        await addColumn("violation_type", "VARCHAR(255)");
        await addColumn("message_content", "TEXT");
        console.log("Schema fix completed");
        process.exit(0);
    } catch (err) {
        console.error("Error fixing schema:", err);
        process.exit(1);
    }
}

fixSchema();
