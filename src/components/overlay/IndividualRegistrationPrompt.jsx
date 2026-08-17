// Compatibility shim: the individual registration overlay now has ONE implementation only.
// Keep this export so any legacy import continues to work without rendering a duplicate prompt.
export { IndividualJoinPrompt as IndividualRegistrationPrompt } from "./IndividualJoinPrompt";
