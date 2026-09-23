export const MESSAGES = {
  // For Register / Login
  required: (field) => `${field} is required.`,
  invalidEmail: "Enter a valid email address.",
  emailExists: "An account with this email already exists.",
  weakPassword: "Password does not meet requirements.",
  badCredentials: "Incorrect email or password.",
  accountCreated: "Account created.",
  sessionExpired: "Session expired.",
  accountSuspended: "This account is suspended.",

  // for  Projects
  projectNameRequired: "Project name is required.",
  projectAdded: "Project added.",
  projectDeleted: "Project deleted.",
  accessDenied: "Access denied.",

  //for Finance Model
  modelInvalid: "Please fix the highlighted values before saving.",
  allocationMinMax: "Minimum allocation cannot exceed maximum allocation.",
  modelSaved: "Model saved.",

  // general
  notFound: "Not found.",
  serverError: "Something went wrong. Please try again.",
};
