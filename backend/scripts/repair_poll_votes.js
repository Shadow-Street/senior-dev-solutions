
const { sequelize, Poll, PollVote } = require("../src/models");

async function repairPollVotes() {
    try {
        await sequelize.authenticate();
        console.log("Database connected.");

        const polls = await Poll.findAll();
        console.log(`Found ${polls.length} polls to check.`);

        for (const poll of polls) {
            console.log(`Checking poll ${poll.id}: ${poll.title}`);

            // Get actual votes from PollVote table
            const realVotes = await PollVote.findAll({ where: { poll_id: poll.id } });
            const totalRealVotes = realVotes.length;

            // Calculate distribution
            const voteDistribution = {};
            // Initialize with 0s for all options if options exist
            if (poll.options && Array.isArray(poll.options)) {
                poll.options.forEach((_, idx) => voteDistribution[idx] = 0);
            }

            realVotes.forEach(vote => {
                const idx = vote.option_index;
                voteDistribution[idx] = (voteDistribution[idx] || 0) + 1;
            });

            console.log(`  Real Total: ${totalRealVotes}, Distribution:`, voteDistribution);
            console.log(`  Current Total: ${poll.total_votes}, Votes:`, poll.votes);

            // Update if mismatch
            // We update if totals don't match OR if distribution stringified doesn't match
            const needsUpdate = totalRealVotes !== poll.total_votes ||
                JSON.stringify(voteDistribution) !== JSON.stringify(poll.votes);

            if (needsUpdate) {
                console.log("  MISMATCH DETECTED -> Updating...");
                await poll.update({
                    total_votes: totalRealVotes,
                    votes: voteDistribution
                });
                console.log("  Updated successfully.");
            } else {
                console.log("  Data is consistent.");
            }
        }

        console.log("Repair complete.");
        process.exit(0);
    } catch (error) {
        console.error("Repair failed:", error);
        process.exit(1);
    }
}

repairPollVotes();
