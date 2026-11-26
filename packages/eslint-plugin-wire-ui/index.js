import noHardcodedColors from "./rules/no-hardcoded-colors.js";
import noRawQueryKeys from "./rules/no-raw-query-keys.js";

export default {
  rules: {
    "no-hardcoded-colors": noHardcodedColors,
    "no-raw-query-keys": noRawQueryKeys,
  },
};
