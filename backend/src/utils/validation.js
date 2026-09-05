function validateRequiredFields(requiredFields, data) {
  const missing = requiredFields.filter((field) => !data[field]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
}

module.exports = {
  validateRequiredFields,
};
