const AuditLog = require("../model/auditLog.model");

const createAuditLog = async ({
  household,
  entityType,
  entityId,
  action,
  performedBy,
  before = null,
  after = null,
}) => {
  await AuditLog.create({
    household,
    entityType,
    entityId,
    action,
    performedBy,
    before,
    after,
  });
};

module.exports = createAuditLog;