const Household = require("../model/household.model");
const Availability = require("../model/availability.model");

const safeObjectIdString = (value) => {
  if (!value) return null;

  try {
    if (typeof value === "object") {
      if (value._id) {
        return value._id.toString();
      }

      if (value.id) {
        return value.id.toString();
      }
    }

    return value.toString();
  } catch {
    return null;
  }
};

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

  // Only active members with a valid User document
  const activeMembers = household.members.filter(
    (member) => member?.isActive === true && member?.user,
  );

  let participants = [...activeMembers];
  const excludedMembers = [];

  if (category === "grocery") {
    const groceryExcluded = participants.filter(
      (member) => member.groceryParticipant === false,
    );

    groceryExcluded.forEach((member) => {
      if (!member?.user) return;

      excludedMembers.push({
        user: member.user,
        reason: "Not a grocery participant",
        status: "excluded",
      });
    });

    participants = participants.filter(
      (member) => member.groceryParticipant !== false,
    );
  }

  if (category === "grocery" && participants.length > 0) {
    const userIds = participants
      .map((member) => safeObjectIdString(member?.user))
      .filter(Boolean);

    if (userIds.length > 0) {
      const awayMembers = await Availability.find({
        household: householdId,
        user: { $in: userIds },
        status: "away",
      });

      // Ignore stale Availability documents with missing user refs
      const awayUserIds = new Set(
        awayMembers
          .map((item) => safeObjectIdString(item?.user))
          .filter(Boolean),
      );

      const vacationExcluded = participants.filter((member) => {
        const memberUserId = safeObjectIdString(member?.user);

        return memberUserId && awayUserIds.has(memberUserId);
      });

      vacationExcluded.forEach((member) => {
        if (!member?.user) return;

        excludedMembers.push({
          user: member.user,
          reason: "On vacation",
          status: "away",
        });
      });

      participants = participants.filter((member) => {
        const memberUserId = safeObjectIdString(member?.user);

        return memberUserId && !awayUserIds.has(memberUserId);
      });
    }
  }

  return {
    participants,
    excludedMembers,
  };
};

module.exports = {
  getEligibleParticipants,
};
