const Household = require("../model/household.model");
const Availability = require("../model/availability.model");

const getEligibleParticipants = async ({
  householdId,
  category,
  expenseDate,
}) => {
  const household = await Household.findById(householdId).populate(
    "members.user",
    "name email",
  );

  if (!household) {
    throw new Error("Household not found");
  }

  const activeMembers = household.members.filter((member) => member.isActive);

  let participants = [...activeMembers];

  const excludedMembers = [];

  // Grocery-specific rule
  if (category === "grocery") {
    const groceryExcluded = participants.filter(
      (member) => !member.groceryParticipant,
    );

    groceryExcluded.forEach((member) => {
      excludedMembers.push({
        user: member.user,
        reason: "Not a grocery participant",
      });
    });

    participants = participants.filter((member) => member.groceryParticipant);
  }

  // Vacation rule applies only to groceries
  if (category === "grocery" && participants.length > 0) {
    const userIds = participants.map((member) => member.user._id);

    const awayMembers = await Availability.find({
      household: householdId,
      user: { $in: userIds },
      status: "away",
    });

    const awayUserIds = new Set(
      awayMembers.map((item) => item.user.toString()),
    );

    const vacationExcluded = participants.filter((member) =>
      awayUserIds.has(member.user._id.toString()),
    );

    vacationExcluded.forEach((member) => {
      excludedMembers.push({
        user: member.user,
        reason: "On vacation",
      });
    });

    participants = participants.filter(
      (member) => !awayUserIds.has(member.user._id.toString()),
    );
  }

  return {
    participants,
    excludedMembers,
  };
};

module.exports = {
  getEligibleParticipants,
};
